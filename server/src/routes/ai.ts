import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticate, AuthRequest } from '../middleware/auth';
import WeeklyAnalysisCache from '../models/WeeklyAnalysisCache';

const router = Router();
router.use(authenticate);

// Returns "YYYY-WW" — year + ISO week number
function getWeekKey(date: Date = new Date()): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const SYSTEM_PROMPT = `You are a wellness coach AI assistant for a student health tracking app called HealthTwin.
Your ONLY role is to give friendly, general lifestyle and habit suggestions based on tracked data (steps, sleep, water intake, heart rate, mood, energy, stress levels).

STRICT RULES — follow these without exception:
1. DO NOT diagnose any medical condition
2. DO NOT prescribe any medication or treatment
3. DO NOT make specific clinical health claims (e.g. "this increases your risk of X disease")
4. DO NOT replace professional medical advice
5. ONLY reference widely accepted general wellness principles (sleep 7-9hrs, 8000+ steps/day, hydration, stress management)
6. Frame everything as personal observations from their tracked data
7. Be encouraging, positive and motivational in tone
8. Keep the total response concise and practical`;

router.post('/weekly-analysis', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'Gemini API key not configured' });
            return;
        }

        const { healthData, moodData } = req.body;

        if (!healthData || healthData.length === 0) {
            res.status(400).json({ success: false, error: 'No health data provided. Please log some data first.' });
            return;
        }

        const userId = req.userId!;
        const weekKey = getWeekKey();

        // ── 1. Check cache — return instantly if already generated this week ──────
        const cached = await WeeklyAnalysisCache.findOne({ userId, weekKey });
        if (cached) {
            console.log(`[AI] Cache HIT for user ${userId} week ${weekKey}`);
            res.json({
                success: true,
                data: {
                    narrative: cached.narrative,
                    tips: cached.tips,
                    predictedOutcome: cached.predictedOutcome,
                    disclaimer: cached.disclaimer,
                    fromCache: true,
                    cacheWeek: weekKey,
                },
            });
            return;
        }

        // ── 2. Cache MISS — call Gemini ───────────────────────────────────────────
        console.log(`[AI] Cache MISS for user ${userId} week ${weekKey} — calling Gemini`);

        const avgSteps = Math.round(healthData.reduce((s: number, e: any) => s + (e.steps || 0), 0) / healthData.length);
        const avgSleep = (healthData.reduce((s: number, e: any) => s + (e.sleepHours || 0), 0) / healthData.length).toFixed(1);
        const avgWater = (healthData.reduce((s: number, e: any) => s + (e.waterLitres || 0), 0) / healthData.length).toFixed(1);
        const avgHR = Math.round(healthData.reduce((s: number, e: any) => s + (e.heartRate || 0), 0) / healthData.length);

        const moodSummary = moodData && moodData.length > 0
            ? `Mood entries: ${moodData.map((m: any) => `${m.mood} (energy: ${m.energyLevel}/10, stress: ${m.stressLevel}/10)`).join(', ')}`
            : 'No mood data logged this week.';

        const userPrompt = `Here is the user's health tracking data for the past ${healthData.length} day(s):

HEALTH METRICS:
- Average daily steps: ${avgSteps.toLocaleString()}
- Average sleep: ${avgSleep} hours/night
- Average water intake: ${avgWater} litres/day
- Average heart rate: ${avgHR} BPM
- Days logged: ${healthData.length} out of 7

MOOD & ENERGY:
${moodSummary}

Please provide:
1. NARRATIVE: A warm, personal 2-3 sentence summary of their week based on this data
2. TIPS: Exactly 3 specific, actionable wellness tips tailored to their data
3. OUTCOME: One motivational sentence describing what they could feel like in 2 weeks if they follow the tips

Format your response as JSON with this exact structure:
{
  "narrative": "...",
  "tips": ["tip1", "tip2", "tip3"],
  "predictedOutcome": "...",
  "disclaimer": "⚠️ This is general wellness guidance only and is not medical advice. Please consult a healthcare professional for medical concerns."
}`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: SYSTEM_PROMPT,
        });

        const result = await model.generateContent(userPrompt);
        const text = result.response.text();

        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        let parsed: any;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            parsed = {
                narrative: text,
                tips: ['Log your health data daily for more personalised tips.'],
                predictedOutcome: 'With consistent tracking, you will start seeing meaningful patterns in your health.',
                disclaimer: '⚠️ This is general wellness guidance only and is not medical advice. Please consult a healthcare professional for medical concerns.',
            };
        }

        // ── 3. Save to MongoDB cache ──────────────────────────────────────────────
        await WeeklyAnalysisCache.findOneAndUpdate(
            { userId, weekKey },
            {
                userId, weekKey,
                narrative: parsed.narrative,
                tips: parsed.tips,
                predictedOutcome: parsed.predictedOutcome,
                disclaimer: parsed.disclaimer,
                createdAt: new Date(),
            },
            { upsert: true, new: true }
        );

        console.log(`[AI] Cached result for user ${userId} week ${weekKey}`);
        res.json({ success: true, data: { ...parsed, fromCache: false, cacheWeek: weekKey } });

    } catch (err: any) {
        console.error('Gemini AI error:', err?.message || err);
        const isRateLimit = err?.message?.includes('quota') || err?.message?.includes('rate') || err?.status === 429;
        res.status(isRateLimit ? 429 : 500).json({
            success: false,
            error: isRateLimit
                ? 'Gemini AI rate limit reached. Please wait a minute and try again.'
                : 'Could not generate AI analysis. Please check your connection and try again.',
        });
    }
});

// DELETE /api/ai/weekly-analysis/cache — force refresh (regenerate this week)
router.delete('/weekly-analysis/cache', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const weekKey = getWeekKey();
        await WeeklyAnalysisCache.deleteOne({ userId: req.userId, weekKey });
        res.json({ success: true, data: { message: 'Cache cleared — next request will regenerate from Gemini' } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to clear cache' });
    }
});

export default router;

import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import HealthEntry from '../models/HealthEntry';
import MoodEntry from '../models/MoodEntry';
import { Avatar } from '../models/Avatar';
import { AvatarAnimation } from '../models/AvatarAnimation';

type FutureState = 'happy' | 'sad' | 'sleepy';

interface StateSignalContext {
    health?: any | null;
    mood?: any | null;
}

interface InferredState {
    state: FutureState;
    reason: string;
}

const FUTURE_STATES: FutureState[] = ['happy', 'sad', 'sleepy'];
const router = Router();
router.use(authenticate);

function dayKeyLocal(input: Date): string {
    const date = new Date(input);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function startOfTodayLocal(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function computeAvatarFingerprint(avatarImageUrl: string): string {
    return crypto.createHash('sha256').update(avatarImageUrl).digest('hex');
}

function toNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function inferState({ health, mood }: StateSignalContext): InferredState {
    const sleepHours = toNumber(health?.sleepHours, 0);
    const stressLevel = toNumber(mood?.stressLevel, 0);
    const heartRate = toNumber(health?.heartRate, 0);
    const steps = toNumber(health?.steps, 0);
    const waterLitres = toNumber(health?.waterLitres, 0);
    const energyScore = toNumber(health?.energyScore, 0);
    const moodEnergy = toNumber(mood?.energyLevel, 0);
    const moodName = typeof mood?.mood === 'string' ? mood.mood.toLowerCase() : '';

    if (sleepHours > 0 && sleepHours <= 4) {
        return { state: 'sleepy', reason: `Sleep is very low (${sleepHours}h)` };
    }

    if (moodName === 'tired') {
        return { state: 'sleepy', reason: 'Mood indicates tiredness' };
    }

    if (
        moodName === 'sad'
        || moodName === 'stressed'
        || moodName === 'anxious'
        || stressLevel >= 7
        || heartRate >= 95
        || (energyScore > 0 && energyScore <= 45)
        || (moodEnergy > 0 && moodEnergy <= 4)
    ) {
        const source = moodName === 'sad' || moodName === 'stressed' || moodName === 'anxious'
            ? `mood: ${moodName}`
            : stressLevel >= 7
                ? `stress ${stressLevel}/10`
                : heartRate >= 95
                    ? `heart rate ${heartRate} bpm`
                    : energyScore > 0 && energyScore <= 45
                        ? `energy score ${Math.round(energyScore)}`
                        : `mood energy ${moodEnergy}/10`;
        return { state: 'sad', reason: `Stress/low-energy signal from ${source}` };
    }

    let positiveSignals = 0;
    if (steps >= 8000) positiveSignals += 1;
    if (sleepHours >= 7) positiveSignals += 1;
    if (waterLitres >= 2) positiveSignals += 1;
    if (energyScore >= 70) positiveSignals += 1;
    if (moodEnergy >= 7) positiveSignals += 1;

    if (positiveSignals >= 2) {
        return { state: 'happy', reason: `Positive activity pattern (${positiveSignals} strong signals)` };
    }

    return { state: 'sad', reason: 'Default low/neutral behavior pattern' };
}

function selectTopState(
    counts: Record<FutureState, number>,
    tieBreakerOrder: FutureState[]
): FutureState {
    const max = Math.max(...FUTURE_STATES.map((state) => counts[state]));
    const winners = FUTURE_STATES.filter((state) => counts[state] === max);
    for (const preferred of tieBreakerOrder) {
        if (winners.includes(preferred)) return preferred;
    }
    return winners[0] || 'sad';
}

function isUsableAnimation(animation: any, avatarFingerprint?: string | null): boolean {
    const videoUrl = typeof animation?.videoUrl === 'string' ? animation.videoUrl : null;
    if (!videoUrl) return false;

    const metadata = animation?.generationMetadata && typeof animation.generationMetadata === 'object'
        ? animation.generationMetadata
        : {};

    const provider = typeof metadata.provider === 'string' ? metadata.provider : '';
    const animationFingerprint = typeof metadata.avatarFingerprint === 'string' ? metadata.avatarFingerprint : null;

    if (avatarFingerprint && animationFingerprint) {
        return animationFingerprint === avatarFingerprint;
    }
    if (videoUrl.startsWith('data:video/')) return true;
    return provider === 'prebuilt_seed' || provider.startsWith('prebuilt_') || provider.startsWith('nanobana_');
}

router.get('/insight', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        const requestedDays = Math.max(1, Math.min(30, parseInt(req.query.days as string, 10) || 7));
        const today = startOfTodayLocal();
        const since = new Date(today);
        since.setDate(today.getDate() - (requestedDays - 1));

        const [healthEntries, moodEntries, latestHealth, latestMood, avatar, animations] = await Promise.all([
            HealthEntry.find({ userId, date: { $gte: since } }).sort({ date: 1, updatedAt: 1, createdAt: 1 }),
            MoodEntry.find({ userId, date: { $gte: since } }).sort({ date: 1, updatedAt: 1, createdAt: 1 }),
            HealthEntry.findOne({ userId }).sort({ date: -1, updatedAt: -1, createdAt: -1 }),
            MoodEntry.findOne({ userId }).sort({ date: -1, updatedAt: -1, createdAt: -1 }),
            Avatar.findOne({ userId }),
            AvatarAnimation.find({ userId, stateType: { $in: FUTURE_STATES } }),
        ]);

        const healthByDay = new Map<string, any>();
        for (const entry of healthEntries) {
            healthByDay.set(dayKeyLocal(entry.date), entry);
        }

        const moodByDay = new Map<string, any>();
        for (const entry of moodEntries) {
            moodByDay.set(dayKeyLocal(entry.date), entry);
        }

        const dailyStates: Array<{ date: string; state: FutureState | null; reason: string | null }> = [];
        const stateBreakdown: Record<FutureState, number> = { happy: 0, sad: 0, sleepy: 0 };

        for (let i = 0; i < requestedDays; i += 1) {
            const day = new Date(since);
            day.setDate(since.getDate() + i);
            const key = dayKeyLocal(day);
            const health = healthByDay.get(key) || null;
            const mood = moodByDay.get(key) || null;

            if (!health && !mood) {
                dailyStates.push({ date: key, state: null, reason: null });
                continue;
            }

            const inferred = inferState({ health, mood });
            stateBreakdown[inferred.state] += 1;
            dailyStates.push({ date: key, state: inferred.state, reason: inferred.reason });
        }

        const dominantState = selectTopState(stateBreakdown, ['sad', 'sleepy', 'happy']);
        const currentInferred = inferState({ health: latestHealth, mood: latestMood });
        const currentState = currentInferred.state;

        const weightedVotes: Record<FutureState, number> = { ...stateBreakdown };
        weightedVotes[currentState] += 2;

        const lastKnownState = [...dailyStates].reverse().find((day) => day.state)?.state || null;
        if (lastKnownState) {
            weightedVotes[lastKnownState] += 1;
        }

        const projectedState = selectTopState(weightedVotes, [currentState, dominantState, 'sad', 'sleepy', 'happy']);
        const analyzedDays = dailyStates.filter((entry) => entry.state !== null).length;
        const dominantDays = stateBreakdown[dominantState];
        const dominantPercent = analyzedDays > 0 ? Math.round((dominantDays / analyzedDays) * 100) : 0;

        const insight = analyzedDays === 0
            ? 'No 7-day activity data found yet. Seed demo data first, then Future You can project a trend.'
            : `In the last ${requestedDays} days, "${dominantState}" was dominant (${dominantPercent}% of tracked days). If your current pattern continues, you are likely to feel "${projectedState}" most of the time from next week onward.`;

        const avatarFingerprint = avatar?.avatarImageUrl ? computeAvatarFingerprint(avatar.avatarImageUrl) : null;
        const usableAnimations = animations.filter((anim) => isUsableAnimation(anim, avatarFingerprint));
        const animationMap = usableAnimations.reduce((acc, anim) => {
            acc[anim.stateType as FutureState] = anim.videoUrl;
            return acc;
        }, {} as Record<FutureState, string>);

        const projectedVideoUrl =
            animationMap[projectedState]
            || animationMap[dominantState]
            || animationMap.happy
            || animationMap.sad
            || animationMap.sleepy
            || null;

        res.json({
            success: true,
            data: {
                period: {
                    days: requestedDays,
                    from: since,
                    to: today,
                },
                hasSevenDayData: analyzedDays > 0,
                analyzedDays,
                dominantState,
                currentState,
                projectedState,
                stateBreakdown,
                dailyStates,
                reasoning: {
                    dominant: dominantDays > 0
                        ? `${dominantState} appeared on ${dominantDays}/${analyzedDays} tracked days`
                        : 'No dominant state yet (insufficient data)',
                    current: currentInferred.reason,
                    projection: `Projection weights combine 7-day dominance + current-day behavior continuity`,
                },
                insight,
                media: {
                    imageUrl: avatar?.avatarImageUrl ?? null,
                    projectedVideoUrl,
                    availableStates: Object.keys(animationMap),
                },
            },
        });
    } catch (error) {
        console.error('Future insight error:', error);
        res.status(500).json({ success: false, error: 'Failed to analyze future insight' });
    }
});

export default router;

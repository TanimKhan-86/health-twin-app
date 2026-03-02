import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import HealthEntry from '../models/HealthEntry';
import MoodEntry from '../models/MoodEntry';
import { Avatar } from '../models/Avatar';
import { AvatarAnimation } from '../models/AvatarAnimation';
import { getUtcDayKey, shiftUtcDays, toUtcDayStart } from '../lib/dateUtils';
import { getErrorMessage, sendError, sendSuccess } from '../lib/apiResponse';
import { parseQuery, QUERY_LIMITS } from '../lib/validation';

type FutureState = 'happy' | 'sad' | 'sleepy';

interface HealthSignal {
    date: Date;
    sleepHours?: number;
    heartRate?: number;
    steps?: number;
    waterLitres?: number;
    energyScore?: number;
}

interface MoodSignal {
    date: Date;
    mood?: string;
    energyLevel?: number;
    stressLevel?: number;
}

interface AvatarAnimationSignal {
    stateType: FutureState;
    videoUrl?: string;
    generationMetadata?: unknown;
}

interface StateSignalContext {
    health?: HealthSignal | null;
    mood?: MoodSignal | null;
}

interface InferredState {
    state: FutureState;
    reason: string;
}

const FUTURE_STATES: FutureState[] = ['happy', 'sad', 'sleepy'];
const router = Router();
router.use(authenticate);

const insightQuerySchema = z.object({
    days: z.coerce
        .number()
        .int()
        .min(QUERY_LIMITS.futureDays.min)
        .max(QUERY_LIMITS.futureDays.max)
        .default(QUERY_LIMITS.futureDays.default),
});

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

function safeMetadata(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function isUsableAnimation(animation: AvatarAnimationSignal, avatarFingerprint?: string | null): boolean {
    const videoUrl = typeof animation.videoUrl === 'string' ? animation.videoUrl : null;
    if (!videoUrl) return false;

    const metadata = safeMetadata(animation.generationMetadata);
    const provider = typeof metadata.provider === 'string' ? metadata.provider : '';
    const animationFingerprint = typeof metadata.avatarFingerprint === 'string' ? metadata.avatarFingerprint : null;

    if (avatarFingerprint && animationFingerprint) {
        return animationFingerprint === avatarFingerprint;
    }
    if (videoUrl.startsWith('data:video/')) return true;
    return provider === 'prebuilt_seed' || provider.startsWith('prebuilt_') || provider.startsWith('nanobana_');
}

router.get('/insight', async (req: AuthRequest, res: Response): Promise<void> => {
    const query = parseQuery(res, insightQuerySchema, req.query);
    if (!query) return;

    try {
        const userId = req.userId;
        if (!userId) {
            sendError(res, 401, 'Unauthorized');
            return;
        }

        const today = toUtcDayStart();
        const since = shiftUtcDays(today, -(query.days - 1));
        const tomorrow = shiftUtcDays(today, 1);

        const [healthEntries, moodEntries, latestHealth, latestMood, avatar, animations] = await Promise.all([
            HealthEntry.find({ userId, date: { $gte: since, $lt: tomorrow } })
                .sort({ date: 1, updatedAt: 1, createdAt: 1 })
                .lean<HealthSignal[]>(),
            MoodEntry.find({ userId, date: { $gte: since, $lt: tomorrow } })
                .sort({ date: 1, updatedAt: 1, createdAt: 1 })
                .lean<MoodSignal[]>(),
            HealthEntry.findOne({ userId })
                .sort({ date: -1, updatedAt: -1, createdAt: -1 })
                .lean<HealthSignal | null>(),
            MoodEntry.findOne({ userId })
                .sort({ date: -1, updatedAt: -1, createdAt: -1 })
                .lean<MoodSignal | null>(),
            Avatar.findOne({ userId }).lean<{ avatarImageUrl?: string } | null>(),
            AvatarAnimation.find({ userId, stateType: { $in: FUTURE_STATES } })
                .lean<AvatarAnimationSignal[]>(),
        ]);

        const healthByDay = new Map<string, HealthSignal>();
        for (const entry of healthEntries) {
            healthByDay.set(getUtcDayKey(entry.date), entry);
        }

        const moodByDay = new Map<string, MoodSignal>();
        for (const entry of moodEntries) {
            moodByDay.set(getUtcDayKey(entry.date), entry);
        }

        const dailyStates: Array<{ date: string; state: FutureState | null; reason: string | null }> = [];
        const stateBreakdown: Record<FutureState, number> = { happy: 0, sad: 0, sleepy: 0 };

        for (let i = 0; i < query.days; i += 1) {
            const day = shiftUtcDays(since, i);
            const key = getUtcDayKey(day);
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
            : `In the last ${query.days} days, "${dominantState}" was dominant (${dominantPercent}% of tracked days). If your current pattern continues, you are likely to feel "${projectedState}" most of the time from next week onward.`;

        const avatarFingerprint = avatar?.avatarImageUrl ? computeAvatarFingerprint(avatar.avatarImageUrl) : null;
        const usableAnimations = animations.filter((animation) => isUsableAnimation(animation, avatarFingerprint));
        const animationMap = usableAnimations.reduce<Partial<Record<FutureState, string>>>((acc, animation) => {
            if (animation.videoUrl) {
                acc[animation.stateType] = animation.videoUrl;
            }
            return acc;
        }, {});

        const projectedVideoUrl =
            animationMap[projectedState]
            || animationMap[dominantState]
            || animationMap.happy
            || animationMap.sad
            || animationMap.sleepy
            || null;

        sendSuccess(res, {
            period: {
                days: query.days,
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
                projection: 'Projection weights combine 7-day dominance + current-day behavior continuity',
            },
            insight,
            media: {
                imageUrl: avatar?.avatarImageUrl ?? null,
                projectedVideoUrl,
                availableStates: Object.keys(animationMap),
            },
        });
    } catch (error: unknown) {
        console.error('Future insight error:', error);
        sendError(res, 500, `Failed to analyze future insight: ${getErrorMessage(error)}`);
    }
});

export default router;

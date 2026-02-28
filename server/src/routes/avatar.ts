import express from 'express';
import multer from 'multer';
import axios from 'axios';
import crypto from 'crypto';
import { authenticate as requireAuth } from '../middleware/auth';
import { Avatar } from '../models/Avatar';
import { AvatarAnimation, StateType } from '../models/AvatarAnimation';
import { generateBaseAvatar, generateStateAnimation } from '../lib/nanobanaService';
import HealthEntry from '../models/HealthEntry';
import MoodEntry from '../models/MoodEntry';
import User from '../models/User';

interface AuthRequest extends express.Request {
    userId?: string;
    file?: Express.Multer.File;
}

const router = express.Router();
type AvatarMode = 'prebuilt' | 'nanobana';
const NANO_BANA_STATES: StateType[] = ['happy', 'sad', 'sleepy', 'tired'];
const PREBUILT_STATES: StateType[] = ['happy', 'sad', 'sleepy'];
const STOCK_SAMPLE_VIDEO_PATTERN = /^https:\/\/storage\.googleapis\.com\/gtv-videos-bucket\/sample\//i;
const AVATAR_MODE: AvatarMode = (() => {
    const raw = (process.env.AVATAR_MODE || 'prebuilt').trim().toLowerCase();
    if (raw === 'nanobana' || raw === 'live') return 'nanobana';
    return 'prebuilt';
})();
const ACTIVE_AVATAR_STATES: StateType[] = AVATAR_MODE === 'nanobana' ? NANO_BANA_STATES : PREBUILT_STATES;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

interface SourceImage {
    buffer: Buffer;
    mimetype: string;
    source: 'upload' | 'profile';
    profileDataUri?: string;
}

interface AvatarVideoCandidate {
    state: StateType;
    videoUrl: string;
    duration: number;
    quality: 'high' | 'standard';
    loopOptimized: boolean;
    circularOptimized: boolean;
    metadata: Record<string, any>;
}

function safeMetadata(value: unknown): Record<string, any> {
    return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function computeAvatarFingerprint(avatarImageUrl: string): string {
    return crypto.createHash('sha256').update(avatarImageUrl).digest('hex');
}

function isStockFallbackVideo(videoUrl?: string | null): boolean {
    if (!videoUrl) return true;
    return STOCK_SAMPLE_VIDEO_PATTERN.test(videoUrl);
}

function isAvatarBasedAnimation(animation: {
    videoUrl?: string | null;
    generationMetadata?: Record<string, any>;
}, avatarFingerprint?: string | null): boolean {
    if (!animation.videoUrl) return false;
    if (isStockFallbackVideo(animation.videoUrl)) return false;

    const metadata = safeMetadata(animation.generationMetadata);
    const provider = typeof metadata.provider === 'string' ? metadata.provider : '';
    const animationFingerprint = typeof metadata.avatarFingerprint === 'string' ? metadata.avatarFingerprint : null;

    if (avatarFingerprint) {
        return animationFingerprint === avatarFingerprint;
    }

    if (animation.videoUrl.startsWith('data:video/')) return true;
    return provider === 'nanobana_google'
        || provider === 'nanobana_reused'
        || provider === 'nanobana_surrogate'
        || provider.startsWith('prebuilt_');
}

function toDataUri(buffer: Buffer, mimetype: string): string {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
}

function parseDataUri(dataUri: string): { buffer: Buffer; mimetype: string } | null {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return {
        mimetype: match[1],
        buffer: Buffer.from(match[2], 'base64'),
    };
}

async function resolveSourceImage(req: AuthRequest, userProfileImage?: string | null): Promise<SourceImage> {
    if (req.file) {
        return {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype || 'image/jpeg',
            source: 'upload',
            profileDataUri: toDataUri(req.file.buffer, req.file.mimetype || 'image/jpeg'),
        };
    }

    if (!userProfileImage) {
        throw new Error('No source image available');
    }

    const parsed = parseDataUri(userProfileImage);
    if (parsed) {
        return {
            buffer: parsed.buffer,
            mimetype: parsed.mimetype,
            source: 'profile',
            profileDataUri: userProfileImage,
        };
    }

    const download = await axios.get<ArrayBuffer>(userProfileImage, {
        responseType: 'arraybuffer',
        timeout: 30_000,
    });
    const mimetype = (download.headers['content-type'] || 'image/jpeg').split(';')[0];
    const buffer = Buffer.from(download.data);
    return {
        buffer,
        mimetype,
        source: 'profile',
        profileDataUri: toDataUri(buffer, mimetype),
    };
}

function chooseAvatarState(health: any, mood: any, availableStates: StateType[]): { state: StateType; reasoning: string } {
    const hasState = (state: StateType): boolean => availableStates.includes(state);
    const fallbackSadLike = (): StateType => {
        if (hasState('sad')) return 'sad';
        return availableStates[0] || 'sad';
    };

    const sleepHours = Number(health?.sleepHours ?? 0);
    const stressLevel = Number(mood?.stressLevel ?? 0);
    const heartRate = Number(health?.heartRate ?? 0);
    const steps = Number(health?.steps ?? 0);
    const waterLitres = Number(health?.waterLitres ?? 0);
    const energyScore = Number(health?.energyScore ?? 0);
    const moodEnergy = Number(mood?.energyLevel ?? 0);
    const moodName = typeof mood?.mood === 'string' ? mood.mood.toLowerCase() : '';

    if (sleepHours > 0 && sleepHours <= 4 && hasState('sleepy')) {
        return { state: 'sleepy', reasoning: `Sleep is low (${sleepHours}h)` };
    }

    let fatigueSignalSource: string | null = null;
    if (
        moodName === 'tired' ||
        (energyScore > 0 && energyScore <= 45) ||
        (moodEnergy > 0 && moodEnergy <= 4) ||
        stressLevel >= 7 ||
        heartRate >= 95
    ) {
        fatigueSignalSource = moodName === 'tired'
            ? 'mood: tired'
            : energyScore > 0 && energyScore <= 45
                ? `energy score ${Math.round(energyScore)}`
                : moodEnergy > 0 && moodEnergy <= 4
                    ? `mood energy ${moodEnergy}/10`
                    : stressLevel >= 7
                        ? `stress level ${stressLevel}/10`
                        : `heart rate ${heartRate} bpm`;
    }

    if (fatigueSignalSource) {
        if (hasState('tired')) {
            return { state: 'tired', reasoning: `Low-energy/fatigue signal from ${fatigueSignalSource}` };
        }
        return { state: fallbackSadLike(), reasoning: `Low-energy/stress signal from ${fatigueSignalSource}` };
    }

    let positiveSignals = 0;
    if (steps >= 8000) positiveSignals += 1;
    if (sleepHours >= 7) positiveSignals += 1;
    if (waterLitres >= 2) positiveSignals += 1;
    if (energyScore >= 70) positiveSignals += 1;
    if (moodEnergy >= 7) positiveSignals += 1;

    if (positiveSignals >= 2 && hasState('happy')) {
        return { state: 'happy', reasoning: `Positive daily metrics (${positiveSignals} strong signals)` };
    }

    return { state: fallbackSadLike(), reasoning: 'Default low/neutral activity state' };
}

/**
 * POST /api/avatar/setup
 * 1) user uploads real photo
 * 2) NanoBana stylizes avatar image (when AVATAR_MODE=nanobana)
 * 3) avatar image is saved in DB
 * 4) saved avatar is retrieved from DB
 * 5) NanoBana generates emotional animations
 * 6) each animation is saved in DB
 */
router.post('/setup', requireAuth, upload.single('photo'), async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const user = await User.findById(userId).select('profileImage');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (AVATAR_MODE === 'prebuilt') {
            if (req.file) {
                user.profileImage = toDataUri(req.file.buffer, req.file.mimetype || 'image/jpeg');
                await user.save();
            }

            const [avatar, animations] = await Promise.all([
                Avatar.findOne({ userId }),
                AvatarAnimation.find({ userId, stateType: { $in: ACTIVE_AVATAR_STATES } }),
            ]);

            const avatarFingerprint = avatar?.avatarImageUrl ? computeAvatarFingerprint(avatar.avatarImageUrl) : null;
            const generatedStates = Array.from(
                new Set(
                    animations
                        .filter(anim => isAvatarBasedAnimation(
                            { videoUrl: anim.videoUrl, generationMetadata: safeMetadata(anim.generationMetadata) },
                            avatarFingerprint
                        ))
                        .map((anim) => anim.stateType)
                )
            );
            const hasAllStates = ACTIVE_AVATAR_STATES.every((state) => generatedStates.includes(state));

            return res.json({
                success: true,
                data: {
                    mode: AVATAR_MODE,
                    avatarId: avatar?._id ?? null,
                    imageUrl: avatar?.avatarImageUrl ?? null,
                    profileImage: user.profileImage ?? null,
                    generatedStates,
                    pendingStates: ACTIVE_AVATAR_STATES.filter((state) => !generatedStates.includes(state)),
                    ready: !!avatar && hasAllStates,
                    message: hasAllStates
                        ? 'Prebuilt avatar media is ready. Generation API is disabled in prebuilt mode.'
                        : 'Prebuilt mode is active. Avatar generation API is disabled; seed pre-generated assets for this user.',
                },
            });
        }

        let sourceImage: SourceImage;
        try {
            sourceImage = await resolveSourceImage(req, user.profileImage);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'No photo provided. Upload a photo or set a profile image first.',
            });
        }

        const { url: avatarUrl, metadata } = await generateBaseAvatar(sourceImage.buffer, sourceImage.mimetype);
        const avatarFingerprint = computeAvatarFingerprint(avatarUrl);

        await Avatar.findOneAndUpdate(
            { userId },
            {
                userId,
                avatarImageUrl: avatarUrl,
                generationMetadata: {
                    ...metadata,
                    avatarFingerprint,
                    source: sourceImage.source === 'upload' ? 'photo_upload' : 'user_profile_image',
                    statesRequested: ACTIVE_AVATAR_STATES,
                },
            },
            { upsert: true, new: true }
        );

        // Keep visible profile image aligned with generated avatar identity.
        if (user.profileImage !== avatarUrl) {
            user.profileImage = avatarUrl;
            await user.save();
        }

        // Explicitly read avatar back from DB before animation generation (required flow).
        const savedAvatar = await Avatar.findOne({ userId });
        if (!savedAvatar?.avatarImageUrl) {
            return res.status(500).json({ success: false, error: 'Avatar saved but could not be reloaded from DB' });
        }

        // Generate state videos sequentially to reduce provider rate-limit failures.
        const generatedAnimations: Array<{
            state: StateType;
            videoUrl: string;
            duration: number;
            loopOptimized: boolean;
            circularOptimized: boolean;
        }> = [];

        // Seed fallback pool from prior avatar-based animations (never stock sample videos).
        const existingAnimations = await AvatarAnimation.find({ userId, stateType: { $in: ACTIVE_AVATAR_STATES } });
        const avatarVideoPool: AvatarVideoCandidate[] = existingAnimations
            .filter(anim => isAvatarBasedAnimation(
                { videoUrl: anim.videoUrl, generationMetadata: safeMetadata(anim.generationMetadata) },
                avatarFingerprint
            ))
            .map(anim => ({
                state: anim.stateType,
                videoUrl: anim.videoUrl,
                duration: anim.duration ?? 8,
                quality: anim.quality === 'standard' ? 'standard' : 'high',
                loopOptimized: anim.loopOptimized ?? true,
                circularOptimized: anim.circularOptimized ?? true,
                metadata: safeMetadata(anim.generationMetadata),
            }));

        for (const state of ACTIVE_AVATAR_STATES) {
            let candidate: AvatarVideoCandidate;
            try {
                const animation = await generateStateAnimation(savedAvatar.avatarImageUrl, state);
                candidate = {
                    state,
                    videoUrl: animation.url,
                    duration: animation.duration,
                    quality: animation.quality,
                    loopOptimized: animation.loopOptimized,
                    circularOptimized: animation.circularOptimized,
                    metadata: {
                        ...animation.metadata,
                        avatarFingerprint,
                    },
                };
            } catch (error: any) {
                const reason = error?.message || `Failed generating ${state}`;
                console.warn(`[Avatar setup] ${state} generation failed, reusing avatar-based animation: ${reason}`);

                const sameState = avatarVideoPool.find(item => item.state === state);
                const surrogate = sameState || avatarVideoPool[0];

                if (!surrogate) {
                    throw new Error(`Could not generate avatar animation for "${state}" and no avatar-based video is available`);
                }

                candidate = {
                    state,
                    videoUrl: surrogate.videoUrl,
                    duration: surrogate.duration,
                    quality: surrogate.quality,
                    loopOptimized: surrogate.loopOptimized,
                    circularOptimized: surrogate.circularOptimized,
                    metadata: {
                        ...surrogate.metadata,
                        provider: sameState ? 'nanobana_reused' : 'nanobana_surrogate',
                        sourceState: surrogate.state,
                        failedState: state,
                        avatarFingerprint,
                        reason,
                        generatedAt: new Date().toISOString(),
                    },
                };
            }

            await AvatarAnimation.findOneAndUpdate(
                { userId, stateType: state },
                {
                    userId,
                    stateType: state,
                    videoUrl: candidate.videoUrl,
                    duration: candidate.duration,
                    quality: candidate.quality,
                    loopOptimized: candidate.loopOptimized,
                    circularOptimized: candidate.circularOptimized,
                    generationMetadata: candidate.metadata,
                },
                { upsert: true, new: true, runValidators: true }
            );

            generatedAnimations.push({
                state,
                videoUrl: candidate.videoUrl,
                duration: candidate.duration,
                loopOptimized: candidate.loopOptimized,
                circularOptimized: candidate.circularOptimized,
            });

            if (isAvatarBasedAnimation({ videoUrl: candidate.videoUrl, generationMetadata: candidate.metadata }, avatarFingerprint)) {
                avatarVideoPool.push(candidate);
            }
        }

        // Clean up old non-supported states from previous versions (e.g. neutral).
        await AvatarAnimation.deleteMany({
            userId,
            stateType: { $nin: ACTIVE_AVATAR_STATES },
        } as any);

        return res.json({
            success: true,
            data: {
                avatarId: savedAvatar._id,
                imageUrl: savedAvatar.avatarImageUrl,
                profileImage: user.profileImage ?? null,
                stylePreset: savedAvatar.generationMetadata?.stylePreset || 'health_twin_demo_style_v1',
                mode: AVATAR_MODE,
                requiredStates: ACTIVE_AVATAR_STATES,
                animations: generatedAnimations,
                message: 'Avatar and all emotional loop animations were generated and stored.',
            },
        });
    } catch (error) {
        console.error('Avatar setup error:', error);
        return res.status(500).json({ success: false, error: 'Failed to process avatar generation' });
    }
});

/**
 * GET /api/avatar/state
 * Returns exactly one loopable animation URL selected dynamically from daily metrics.
 */
router.get('/state', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [avatar, animations, health, mood] = await Promise.all([
            Avatar.findOne({ userId }),
            AvatarAnimation.find({ userId, stateType: { $in: ACTIVE_AVATAR_STATES } }),
            HealthEntry.findOne({ userId, date: { $gte: today } }).sort({ updatedAt: -1, createdAt: -1 }),
            MoodEntry.findOne({ userId, date: { $gte: today } }).sort({ updatedAt: -1, createdAt: -1 }),
        ]);

        if (!avatar && animations.length === 0) {
            return res.status(404).json({ success: false, error: 'No avatar setup found. Please complete setup.' });
        }

        const avatarFingerprint = avatar?.avatarImageUrl ? computeAvatarFingerprint(avatar.avatarImageUrl) : null;
        const usableAnimations = animations.filter(anim =>
            isAvatarBasedAnimation(
                { videoUrl: anim.videoUrl, generationMetadata: safeMetadata(anim.generationMetadata) },
                avatarFingerprint
            )
        );

        const animMap = usableAnimations.reduce((acc, anim) => {
            acc[anim.stateType] = anim.videoUrl;
            return acc;
        }, {} as Record<StateType, string>);

        const { state: selectedState, reasoning } = chooseAvatarState(health, mood, ACTIVE_AVATAR_STATES);
        const fallbackVideo =
            animMap[selectedState] ||
            animMap.happy ||
            animMap.sad ||
            animMap.sleepy ||
            usableAnimations[0]?.videoUrl ||
            null;

        if (!fallbackVideo && !avatar?.avatarImageUrl) {
            return res.status(404).json({ success: false, error: 'No avatar media available yet' });
        }

        return res.json({
            success: true,
            data: {
                state: selectedState,
                videoUrl: fallbackVideo,
                imageUrl: avatar?.avatarImageUrl ?? null,
                avatarFingerprint,
                reasoning,
                mode: AVATAR_MODE,
                requiredStates: ACTIVE_AVATAR_STATES,
                availableStates: Object.keys(animMap),
            },
        });
    } catch (error) {
        console.error('Avatar state fetch error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch avatar state' });
    }
});

/**
 * GET /api/avatar/status
 * Returns setup status + generation progress for the required emotional states.
 */
router.get('/status', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const [avatar, animations] = await Promise.all([
            Avatar.findOne({ userId }),
            AvatarAnimation.find({ userId, stateType: { $in: ACTIVE_AVATAR_STATES } }),
        ]);

        const avatarFingerprint = avatar?.avatarImageUrl ? computeAvatarFingerprint(avatar.avatarImageUrl) : null;
        const generatedStates = Array.from(
            new Set(
                animations
                    .filter(anim => isAvatarBasedAnimation(
                        { videoUrl: anim.videoUrl, generationMetadata: safeMetadata(anim.generationMetadata) },
                        avatarFingerprint
                    ))
                    .map((a) => a.stateType)
            )
        );
        const hasAllStates = ACTIVE_AVATAR_STATES.every((state) => generatedStates.includes(state));

        return res.json({
            success: true,
            data: {
                hasAvatar: !!avatar,
                avatarUrl: avatar?.avatarImageUrl,
                avatarFingerprint,
                stylePreset: avatar?.generationMetadata?.stylePreset || 'health_twin_demo_style_v1',
                mode: AVATAR_MODE,
                requiredStates: ACTIVE_AVATAR_STATES,
                generatedStates,
                pendingStates: ACTIVE_AVATAR_STATES.filter((state) => !generatedStates.includes(state)),
                ready: !!avatar && hasAllStates,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch status' });
    }
});

export default router;

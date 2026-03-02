import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate as requireAuth } from '../middleware/auth';
import { Avatar } from '../models/Avatar';
import { AvatarAnimation, StateType } from '../models/AvatarAnimation';
import { generateBaseAvatar, generateStateAnimation } from '../lib/nanobanaService';
import HealthEntry from '../models/HealthEntry';
import MoodEntry from '../models/MoodEntry';
import User from '../models/User';
import { getUtcDayRange } from '../lib/dateUtils';
import { getErrorMessage, sendError, sendSuccess } from '../lib/apiResponse';
import { parseQuery } from '../lib/validation';
import {
    AvatarVideoCandidate,
    chooseAvatarState,
    computeAvatarFingerprint,
    isAvatarBasedAnimation,
    resolveSourceImage,
    safeMetadata,
    SourceImage,
    toDataUri,
} from '../services/avatarMediaService';

interface AuthRequest extends express.Request {
    userId?: string;
    file?: Express.Multer.File;
}

const router = express.Router();
type AvatarMode = 'prebuilt' | 'nanobana';
const NANO_BANA_STATES: StateType[] = ['happy', 'sad', 'sleepy', 'tired'];
const PREBUILT_STATES: StateType[] = ['happy', 'sad', 'sleepy'];
const AVATAR_MODE: AvatarMode = (() => {
    const raw = (process.env.AVATAR_MODE || 'prebuilt').trim().toLowerCase();
    if (raw === 'nanobana' || raw === 'live') return 'nanobana';
    return 'prebuilt';
})();
const ACTIVE_AVATAR_STATES: StateType[] = AVATAR_MODE === 'nanobana' ? NANO_BANA_STATES : PREBUILT_STATES;
const avatarStateQuerySchema = z.object({
    state: z.enum(['happy', 'sad', 'sleepy', 'tired']).optional(),
    date: z.string().trim().optional(),
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

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
            sendError(res, 401, 'Unauthorized');
            return;
        }
        const user = await User.findById(userId).select('profileImage');
        if (!user) {
            sendError(res, 404, 'User not found');
            return;
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

            sendSuccess(res, {
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
            });
            return;
        }

        let sourceImage: SourceImage;
        try {
            sourceImage = await resolveSourceImage(req, user.profileImage);
        } catch {
            sendError(res, 400, 'No photo provided. Upload a photo or set a profile image first.');
            return;
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
            sendError(res, 500, 'Avatar saved but could not be reloaded from DB');
            return;
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
            } catch (error: unknown) {
                const reason = getErrorMessage(error, `Failed generating ${state}`);
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
        });

        sendSuccess(res, {
            avatarId: savedAvatar._id,
            imageUrl: savedAvatar.avatarImageUrl,
            profileImage: user.profileImage ?? null,
            stylePreset: savedAvatar.generationMetadata?.stylePreset || 'health_twin_demo_style_v1',
            mode: AVATAR_MODE,
            requiredStates: ACTIVE_AVATAR_STATES,
            animations: generatedAnimations,
            message: 'Avatar and all emotional loop animations were generated and stored.',
        });
        return;
    } catch (error) {
        console.error('Avatar setup error:', error);
        sendError(res, 500, `Failed to process avatar generation: ${getErrorMessage(error)}`);
        return;
    }
});

/**
 * GET /api/avatar/state
 * Returns exactly one loopable animation URL selected dynamically from daily metrics.
 */
router.get('/state', requireAuth, async (req: AuthRequest, res) => {
    const query = parseQuery(res, avatarStateQuerySchema, req.query);
    if (!query) return;

    try {
        const userId = req.userId;
        if (!userId) {
            sendError(res, 401, 'Unauthorized');
            return;
        }

        const { start: todayStartUtc, end: tomorrowStartUtc } = getUtcDayRange(query.date);

        const [avatar, animations, health, mood] = await Promise.all([
            Avatar.findOne({ userId }),
            AvatarAnimation.find({ userId, stateType: { $in: ACTIVE_AVATAR_STATES } }),
            HealthEntry.findOne({ userId, date: { $gte: todayStartUtc, $lt: tomorrowStartUtc } }).sort({ updatedAt: -1, createdAt: -1 }),
            MoodEntry.findOne({ userId, date: { $gte: todayStartUtc, $lt: tomorrowStartUtc } }).sort({ updatedAt: -1, createdAt: -1 }),
        ]);

        if (!avatar && animations.length === 0) {
            sendError(res, 404, 'No avatar setup found. Please complete setup.');
            return;
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

        const { state: inferredState, reasoning } = chooseAvatarState(health, mood, ACTIVE_AVATAR_STATES);
        const requestedStateRaw = query.state ?? null;
        const requestedState = requestedStateRaw && ACTIVE_AVATAR_STATES.includes(requestedStateRaw as StateType)
            ? (requestedStateRaw as StateType)
            : null;
        const preferredCandidates: Array<StateType | null> = [
            requestedState,
            inferredState,
            'happy',
            'sad',
            'sleepy',
            'tired',
        ];
        const preferredStates = Array.from(
            new Set<StateType>(
                preferredCandidates.filter(
                    (value): value is StateType => !!value && ACTIVE_AVATAR_STATES.includes(value)
                )
            )
        );

        const resolvedState = preferredStates.find((state) => !!animMap[state]) || inferredState;
        const fallbackVideo =
            animMap[resolvedState] ||
            usableAnimations[0]?.videoUrl ||
            null;
        const resolvedReasoning = requestedState
            ? `Client preview requested "${requestedState}" state`
            : reasoning;

        if (!fallbackVideo && !avatar?.avatarImageUrl) {
            sendError(res, 404, 'No avatar media available yet');
            return;
        }

        sendSuccess(res, {
            state: resolvedState,
            videoUrl: fallbackVideo,
            videoByState: animMap,
            imageUrl: avatar?.avatarImageUrl ?? null,
            avatarFingerprint,
            reasoning: resolvedReasoning,
            mode: AVATAR_MODE,
            requiredStates: ACTIVE_AVATAR_STATES,
            availableStates: Object.keys(animMap),
        });
        return;
    } catch (error) {
        console.error('Avatar state fetch error:', error);
        sendError(res, 500, `Failed to fetch avatar state: ${getErrorMessage(error)}`);
        return;
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
            sendError(res, 401, 'Unauthorized');
            return;
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

        sendSuccess(res, {
            hasAvatar: !!avatar,
            avatarUrl: avatar?.avatarImageUrl,
            avatarFingerprint,
            stylePreset: avatar?.generationMetadata?.stylePreset || 'health_twin_demo_style_v1',
            mode: AVATAR_MODE,
            requiredStates: ACTIVE_AVATAR_STATES,
            generatedStates,
            pendingStates: ACTIVE_AVATAR_STATES.filter((state) => !generatedStates.includes(state)),
            ready: !!avatar && hasAllStates,
        });
        return;
    } catch (error) {
        sendError(res, 500, `Failed to fetch status: ${getErrorMessage(error)}`);
        return;
    }
});

/**
 * GET /api/avatar/library
 * Returns avatar image + per-state animation URLs for client-driven previews
 * (e.g., Scenario Explorer simulation state preview).
 */
router.get('/library', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            sendError(res, 401, 'Unauthorized');
            return;
        }

        const [avatar, animations] = await Promise.all([
            Avatar.findOne({ userId }),
            AvatarAnimation.find({ userId, stateType: { $in: ACTIVE_AVATAR_STATES } }),
        ]);

        if (!avatar && animations.length === 0) {
            sendError(res, 404, 'No avatar media found. Please complete setup.');
            return;
        }

        const avatarFingerprint = avatar?.avatarImageUrl ? computeAvatarFingerprint(avatar.avatarImageUrl) : null;
        const usableAnimations = animations.filter(anim =>
            isAvatarBasedAnimation(
                { videoUrl: anim.videoUrl, generationMetadata: safeMetadata(anim.generationMetadata) },
                avatarFingerprint
            )
        );

        const videoByState = usableAnimations.reduce((acc, anim) => {
            acc[anim.stateType] = anim.videoUrl;
            return acc;
        }, {} as Record<StateType, string>);

        sendSuccess(res, {
            mode: AVATAR_MODE,
            requiredStates: ACTIVE_AVATAR_STATES,
            imageUrl: avatar?.avatarImageUrl ?? null,
            videoByState,
            availableStates: Object.keys(videoByState),
        });
        return;
    } catch (error) {
        console.error('Avatar library fetch error:', error);
        sendError(res, 500, `Failed to fetch avatar library: ${getErrorMessage(error)}`);
        return;
    }
});

export default router;

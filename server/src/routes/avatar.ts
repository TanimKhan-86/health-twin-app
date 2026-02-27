import express from 'express';
import multer from 'multer';
import { authenticate as requireAuth } from '../middleware/auth';
import { Avatar } from '../models/Avatar';
import { AvatarAnimation, StateType } from '../models/AvatarAnimation';
import { generateBaseAvatar, generateStateAnimation } from '../lib/nanobanaService';
import HealthEntry from '../models/HealthEntry';
import MoodEntry from '../models/MoodEntry';

interface AuthRequest extends express.Request {
    userId?: string;
    file?: Express.Multer.File;
}

const router = express.Router();
const AVATAR_STATES: StateType[] = ['happy', 'sad', 'sleepy', 'stressed'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

function chooseAvatarState(health: any, mood: any): { state: StateType; reasoning: string } {
    const sleepHours = Number(health?.sleepHours ?? 0);
    const stressLevel = Number(mood?.stressLevel ?? 0);
    const heartRate = Number(health?.heartRate ?? 0);
    const steps = Number(health?.steps ?? 0);
    const waterLitres = Number(health?.waterLitres ?? 0);
    const energyScore = Number(health?.energyScore ?? 0);
    const moodEnergy = Number(mood?.energyLevel ?? 0);

    if (sleepHours > 0 && sleepHours <= 4) {
        return { state: 'sleepy', reasoning: `Sleep is low (${sleepHours}h)` };
    }

    if (stressLevel >= 7 || heartRate >= 95) {
        const source = stressLevel >= 7 ? `stress level ${stressLevel}/10` : `heart rate ${heartRate} bpm`;
        return { state: 'stressed', reasoning: `High stress signal from ${source}` };
    }

    let positiveSignals = 0;
    if (steps >= 8000) positiveSignals += 1;
    if (sleepHours >= 7) positiveSignals += 1;
    if (waterLitres >= 2) positiveSignals += 1;
    if (energyScore >= 70) positiveSignals += 1;
    if (moodEnergy >= 7) positiveSignals += 1;

    if (positiveSignals >= 2) {
        return { state: 'happy', reasoning: `Positive daily metrics (${positiveSignals} strong signals)` };
    }

    return { state: 'sad', reasoning: 'Default low/neutral activity state' };
}

/**
 * POST /api/avatar/setup
 * 1) user uploads real photo
 * 2) NanoBana stylizes avatar image
 * 3) avatar image is saved in DB
 * 4) saved avatar is retrieved from DB
 * 5) NanoBana generates 4 emotional animations
 * 6) each animation is saved in DB
 */
router.post('/setup', requireAuth, upload.single('photo'), async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No photo provided' });
        }

        const { url: avatarUrl, metadata } = await generateBaseAvatar(req.file.buffer, req.file.mimetype);

        await Avatar.findOneAndUpdate(
            { userId },
            {
                userId,
                avatarImageUrl: avatarUrl,
                generationMetadata: {
                    ...metadata,
                    source: 'photo_upload',
                    statesRequested: AVATAR_STATES,
                },
            },
            { upsert: true, new: true }
        );

        // Explicitly read avatar back from DB before animation generation (required flow).
        const savedAvatar = await Avatar.findOne({ userId });
        if (!savedAvatar?.avatarImageUrl) {
            return res.status(500).json({ success: false, error: 'Avatar saved but could not be reloaded from DB' });
        }

        const generatedAnimations = await Promise.all(
            AVATAR_STATES.map(async (state) => {
                const animation = await generateStateAnimation(savedAvatar.avatarImageUrl, state);
                await AvatarAnimation.findOneAndUpdate(
                    { userId, stateType: state },
                    {
                        userId,
                        stateType: state,
                        videoUrl: animation.url,
                        duration: animation.duration,
                        quality: animation.quality,
                        loopOptimized: animation.loopOptimized,
                        circularOptimized: animation.circularOptimized,
                        generationMetadata: animation.metadata,
                    },
                    { upsert: true, new: true, runValidators: true }
                );

                return {
                    state,
                    videoUrl: animation.url,
                    duration: animation.duration,
                    loopOptimized: animation.loopOptimized,
                    circularOptimized: animation.circularOptimized,
                };
            })
        );

        // Clean up old non-supported states from previous versions (e.g. neutral).
        await AvatarAnimation.deleteMany({
            userId,
            stateType: { $nin: AVATAR_STATES },
        } as any);

        return res.json({
            success: true,
            data: {
                avatarId: savedAvatar._id,
                imageUrl: savedAvatar.avatarImageUrl,
                stylePreset: savedAvatar.generationMetadata?.stylePreset || 'health_twin_demo_style_v1',
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

        const animations = await AvatarAnimation.find({
            userId,
            stateType: { $in: AVATAR_STATES },
        });

        if (animations.length === 0) {
            return res.status(404).json({ success: false, error: 'No avatar animations found. Please complete setup.' });
        }

        const animMap = animations.reduce((acc, anim) => {
            acc[anim.stateType] = anim.videoUrl;
            return acc;
        }, {} as Record<StateType, string>);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [health, mood] = await Promise.all([
            HealthEntry.findOne({ userId, date: { $gte: today } }).sort({ createdAt: -1 }),
            MoodEntry.findOne({ userId, date: { $gte: today } }).sort({ createdAt: -1 }),
        ]);

        const { state: selectedState, reasoning } = chooseAvatarState(health, mood);
        const fallbackVideo = animMap.sad || animations[0]?.videoUrl;
        const videoUrl = animMap[selectedState] || fallbackVideo;

        if (!videoUrl) {
            return res.status(404).json({ success: false, error: 'No animation video URL available' });
        }

        return res.json({
            success: true,
            data: {
                state: selectedState,
                videoUrl,
                reasoning,
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
 * Returns setup status + generation progress for the 4 required emotional states.
 */
router.get('/status', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const [avatar, animations] = await Promise.all([
            Avatar.findOne({ userId }),
            AvatarAnimation.find({ userId, stateType: { $in: AVATAR_STATES } }),
        ]);

        const generatedStates = animations.map((a) => a.stateType);
        const hasAllStates = AVATAR_STATES.every((state) => generatedStates.includes(state));

        return res.json({
            success: true,
            data: {
                hasAvatar: !!avatar,
                avatarUrl: avatar?.avatarImageUrl,
                stylePreset: avatar?.generationMetadata?.stylePreset || 'health_twin_demo_style_v1',
                generatedStates,
                pendingStates: AVATAR_STATES.filter((state) => !generatedStates.includes(state)),
                ready: !!avatar && hasAllStates,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch status' });
    }
});

export default router;

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

// Configure multer for memory storage (we just need the buffer to send to NanoBana)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

/**
 * POST /api/avatar/setup
 * Upload a real photo to generate the stylized base avatar and all 4 animation states.
 */
router.post('/setup', requireAuth, upload.single('photo'), async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No photo provided' });
        }

        // 1. Generate Base Avatar
        const { url: avatarUrl, metadata } = await generateBaseAvatar(req.file.buffer, req.file.mimetype);

        // Save base avatar
        const avatar = await Avatar.findOneAndUpdate(
            { userId },
            { userId, avatarImageUrl: avatarUrl, generationMetadata: metadata },
            { upsert: true, new: true }
        );

        // 2. We can return success early so UI doesn't hang, and kick off background video generation.
        res.json({
            success: true,
            data: {
                avatarId: avatar._id,
                imageUrl: avatarUrl,
                message: 'Avatar created. Animations are generating in the background.',
            },
        });

        // 3. Background Job: Generate all animations
        const states: StateType[] = ['neutral', 'happy', 'sad', 'sleepy', 'stressed'];

        // Process sequentially or Promise.all (Demo does sequential to see logs clearly)
        for (const state of states) {
            try {
                const { url: videoUrl, duration } = await generateStateAnimation(avatarUrl, state);

                await AvatarAnimation.findOneAndUpdate(
                    { userId, stateType: state },
                    { userId, stateType: state, videoUrl, duration },
                    { upsert: true }
                );
                console.log(`[Avatar Setup] Successfully created ${state} state for user ${userId}`);
            } catch (err) {
                console.error(`[Avatar Setup] Failed to generate ${state} state:`, err);
            }
        }

    } catch (error) {
        console.error('Avatar setup error:', error);
        res.status(500).json({ success: false, error: 'Failed to process avatar generation' });
    }
});

/**
 * GET /api/avatar/state
 * Dynamically selects which video to show based on the user's recent health data
 */
router.get('/state', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId;

        // Fetch user's animations
        const animations = await AvatarAnimation.find({ userId });

        if (animations.length === 0) {
            return res.status(404).json({ success: false, error: 'No avatar animations found. Please complete setup.' });
        }

        const animMap = animations.reduce((acc, anim) => {
            acc[anim.stateType] = anim.videoUrl;
            return acc;
        }, {} as Record<string, string>);

        // Fetch today's health data to determine logic
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [health, mood] = await Promise.all([
            HealthEntry.findOne({ userId, date: { $gte: today } }).sort({ createdAt: -1 }),
            MoodEntry.findOne({ userId, date: { $gte: today } }).sort({ createdAt: -1 })
        ]);

        // LOGIC ENGINE for dynamic state mapping
        let activeState: StateType = 'neutral';
        let reasoning = 'Defaulting to neutral state';

        if (health && health.sleepHours > 0 && health.sleepHours < 5) {
            activeState = 'sleepy';
            reasoning = `Low sleep detected (${health.sleepHours} hrs)`;
        } else if (health && health.heartRate !== undefined && health.heartRate > 90) {
            activeState = 'stressed';
            reasoning = `Elevated heart rate (${health.heartRate} bpm)`;
        } else if (mood && mood.energyLevel >= 8) {
            activeState = 'happy';
            reasoning = `High mood energy level (${mood.energyLevel})`;
        } else if (mood && mood.energyLevel <= 3) {
            activeState = 'sad';
            reasoning = `Low mood energy level (${mood.energyLevel})`;
        } else if (health && health.steps > 8000) {
            activeState = 'happy';
            reasoning = `High activity (${health.steps} steps)`;
        }

        // Fallback if the activeState video wasn't generated
        const videoUrl = animMap[activeState] || animMap['neutral'] || animations[0].videoUrl;

        res.json({
            success: true,
            data: {
                state: activeState,
                videoUrl,
                reasoning,
            }
        });

    } catch (error) {
        console.error('Avatar state fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch avatar state' });
    }
});

/**
 * GET /api/avatar/status
 * Check if the user has an active avatar setup
 */
router.get('/status', requireAuth, async (req: AuthRequest, res) => {
    try {
        const avatar = await Avatar.findOne({ userId: req.userId });
        res.json({
            success: true,
            data: {
                hasAvatar: !!avatar,
                avatarUrl: avatar?.avatarImageUrl,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch status' });
    }
});

export default router;

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import HealthEntry from '../models/HealthEntry';

const router = Router();
router.use(authenticate);

// GET /api/streak
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const entries = await HealthEntry.find({ userId: req.userId })
            .sort({ date: -1 })
            .select('date');

        if (!entries.length) {
            res.json({ success: true, data: { currentStreak: 0, longestStreak: 0, lastLogDate: null } });
            return;
        }

        // Build streak by checking consecutive days
        const dates = entries.map(e => {
            const d = new Date(e.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        });

        const unique = [...new Set(dates)].sort((a, b) => b - a);
        const DAY = 86400000;

        let currentStreak = 1;
        let longestStreak = 1;
        let streak = 1;

        for (let i = 1; i < unique.length; i++) {
            if (unique[i - 1] - unique[i] === DAY) {
                streak++;
                longestStreak = Math.max(longestStreak, streak);
            } else {
                streak = 1;
            }
        }

        // Check if streak is still active (last entry today or yesterday)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffFromToday = today.getTime() - unique[0];
        currentStreak = diffFromToday <= DAY ? streak : 0;

        res.json({
            success: true,
            data: {
                currentStreak,
                longestStreak,
                lastLogDate: new Date(unique[0]).toISOString(),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;

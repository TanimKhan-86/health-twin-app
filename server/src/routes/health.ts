import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import HealthEntry from '../models/HealthEntry';
import MoodEntry from '../models/MoodEntry';

const router = Router();
router.use(authenticate);

// GET /api/health — all entries for user (optionally last N days)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const entries = await HealthEntry.find({
            userId: req.userId,
            date: { $gte: since },
        }).sort({ date: -1 });

        res.json({ success: true, data: entries });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /api/health/today
router.get('/today', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const entry = await HealthEntry.findOne({
            userId: req.userId,
            date: { $gte: start, $lte: end },
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: entry ?? null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /api/health/history?limit=7
router.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 30;
        const since = new Date();
        since.setDate(since.getDate() - limit);

        const entries = await HealthEntry.find({
            userId: req.userId,
            date: { $gte: since },
        }).sort({ date: -1 });

        res.json({ success: true, data: entries });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /api/health/seed-demo — creates 7 days of backdated health + mood data
router.post('/seed-demo', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const MOODS = ['happy', 'energetic', 'neutral', 'tired', 'stressed', 'sad'] as const;

        // Clear existing data
        await Promise.all([
            HealthEntry.deleteMany({ userId }),
            MoodEntry.deleteMany({ userId }),
        ]);

        const healthDocs = [];
        const moodDocs = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(12, 0, 0, 0);

            healthDocs.push({
                userId,
                date,
                steps: 5000 + Math.floor(Math.random() * 7000),
                sleepHours: +(5 + Math.random() * 4).toFixed(1),
                waterLitres: +(1.5 + Math.random() * 1.5).toFixed(1),
                heartRate: 60 + Math.floor(Math.random() * 30),
                weight: +(70 + Math.random() * 5).toFixed(1),
                notes: `Demo entry day ${7 - i}`,
            });

            moodDocs.push({
                userId,
                date,
                mood: MOODS[Math.floor(Math.random() * MOODS.length)],
                energyLevel: 4 + Math.floor(Math.random() * 7),
                stressLevel: 1 + Math.floor(Math.random() * 6),
                notes: `Demo mood day ${7 - i}`,
            });
        }

        await Promise.all([
            HealthEntry.insertMany(healthDocs),
            MoodEntry.insertMany(moodDocs),
        ]);

        res.json({
            success: true,
            data: {
                message: '✅ 7 days of demo data seeded successfully',
                healthEntries: healthDocs.length,
                moodEntries: moodDocs.length,
            },
        });
    } catch (err) {
        console.error('Seed demo error:', err);
        res.status(500).json({ success: false, error: 'Server error during seeding' });
    }
});

// POST /api/health — create a new entry
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { date, steps, sleepHours, waterLitres, heartRate, weight, notes } = req.body;
        const entry = await HealthEntry.create({
            userId: req.userId,
            date: date ? new Date(date) : new Date(),
            steps, sleepHours, waterLitres, heartRate, weight, notes,
        });
        res.status(201).json({ success: true, data: entry });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// PUT /api/health/:id — update entry
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const entry = await HealthEntry.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!entry) { res.status(404).json({ success: false, error: 'Entry not found' }); return; }
        res.json({ success: true, data: entry });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// DELETE /api/health/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const entry = await HealthEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!entry) { res.status(404).json({ success: false, error: 'Entry not found' }); return; }
        res.json({ success: true, data: { message: 'Deleted' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import MoodEntry from '../models/MoodEntry';

const router = Router();
router.use(authenticate);

// GET /api/mood
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const entries = await MoodEntry.find({
            userId: req.userId,
            date: { $gte: since },
        }).sort({ date: -1 });

        res.json({ success: true, data: entries });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /api/mood/today
router.get('/today', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const entry = await MoodEntry.findOne({
            userId: req.userId,
            date: { $gte: start, $lte: end },
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: entry ?? null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /api/mood/history?limit=7
router.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string) || 30;
        const since = new Date();
        since.setDate(since.getDate() - limit);

        const entries = await MoodEntry.find({
            userId: req.userId,
            date: { $gte: since },
        }).sort({ date: -1 });

        res.json({ success: true, data: entries });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /api/mood
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { date, mood, energyLevel, stressLevel, notes } = req.body;
        const entry = await MoodEntry.create({
            userId: req.userId,
            date: date ? new Date(date) : new Date(),
            mood, energyLevel, stressLevel, notes,
        });
        res.status(201).json({ success: true, data: entry });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// PUT /api/mood/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const entry = await MoodEntry.findOneAndUpdate(
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

// DELETE /api/mood/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const entry = await MoodEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!entry) { res.status(404).json({ success: false, error: 'Entry not found' }); return; }
        res.json({ success: true, data: { message: 'Deleted' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;

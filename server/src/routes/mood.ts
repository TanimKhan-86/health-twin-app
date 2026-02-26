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

        res.json(entries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
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
        res.status(201).json(entry);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
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
        if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
        res.json(entry);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/mood/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const entry = await MoodEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;

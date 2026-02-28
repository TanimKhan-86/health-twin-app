import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import MoodEntry from '../models/MoodEntry';

const router = Router();
router.use(authenticate);

function toUtcDayStart(input?: string | Date): Date {
    const parsed = input ? new Date(input) : new Date();
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('Invalid date');
    }
    parsed.setUTCHours(0, 0, 0, 0);
    return parsed;
}

function getErrorMessage(err: any): string {
    if (err?.name === 'ValidationError') {
        const first = Object.values(err.errors || {})[0] as { message?: string } | undefined;
        return first?.message || 'Validation failed';
    }
    if (err?.code === 11000) {
        return 'Daily mood log already exists for this date';
    }
    if (typeof err?.message === 'string' && err.message.length > 0) {
        return err.message;
    }
    return 'Server error';
}

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
        }).sort({ updatedAt: -1, createdAt: -1 });

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
        const normalizedDate = toUtcDayStart(date);

        const setFields: Record<string, unknown> = {};
        if (mood !== undefined) setFields.mood = mood;
        if (energyLevel !== undefined) setFields.energyLevel = energyLevel;
        if (stressLevel !== undefined) setFields.stressLevel = stressLevel;
        if (notes !== undefined) setFields.notes = notes;

        const entry = await MoodEntry.findOneAndUpdate(
            { userId: req.userId, date: normalizedDate },
            {
                $set: setFields,
                $setOnInsert: {
                    userId: req.userId,
                    date: normalizedDate,
                },
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        res.json({ success: true, data: entry });
    } catch (err: any) {
        console.error(err);
        const statusCode = err?.name === 'ValidationError' || err?.code === 11000 || err?.message === 'Invalid date' ? 400 : 500;
        res.status(statusCode).json({ success: false, error: getErrorMessage(err) });
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

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import HealthEntry from '../models/HealthEntry';
import MoodEntry from '../models/MoodEntry';

const router = Router();
router.use(authenticate);

// GET /api/analytics/summary?days=7
router.get('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const days = parseInt(req.query.days as string) || 7;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [healthEntries, moodEntries] = await Promise.all([
            HealthEntry.find({ userId: req.userId, date: { $gte: since } }).sort({ date: 1 }),
            MoodEntry.find({ userId: req.userId, date: { $gte: since } }).sort({ date: 1 }),
        ]);

        // Compute averages
        const count = healthEntries.length;
        const avgSteps = count ? Math.round(healthEntries.reduce((s, e) => s + e.steps, 0) / count) : 0;
        const avgSleep = count ? +(healthEntries.reduce((s, e) => s + e.sleepHours, 0) / count).toFixed(1) : 0;
        const avgWater = count ? +(healthEntries.reduce((s, e) => s + e.waterLitres, 0) / count).toFixed(1) : 0;
        const avgHR = count ? Math.round(healthEntries.reduce((s, e) => s + e.heartRate, 0) / count) : 0;

        const moodCount = moodEntries.length;
        const avgEnergy = moodCount ? +(moodEntries.reduce((s, e) => s + e.energyLevel, 0) / moodCount).toFixed(1) : 0;
        const avgStress = moodCount ? +(moodEntries.reduce((s, e) => s + e.stressLevel, 0) / moodCount).toFixed(1) : 0;

        // Mood distribution
        const moodDist: Record<string, number> = {};
        moodEntries.forEach(e => { moodDist[e.mood] = (moodDist[e.mood] || 0) + 1; });

        res.json({
            period: { days, from: since, to: new Date() },
            health: { count, avgSteps, avgSleep, avgWater, avgHR },
            mood: { count: moodCount, avgEnergy, avgStress, distribution: moodDist },
            healthTimeline: healthEntries,
            moodTimeline: moodEntries,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;

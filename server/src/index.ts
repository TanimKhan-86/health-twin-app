import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './db';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import moodRoutes from './routes/mood';
import analyticsRoutes from './routes/analytics';
import achievementsRoutes from './routes/achievements';
import seedRoutes from './routes/seed';
import aiRoutes from './routes/ai';
import streakRoutes from './routes/streak';
import avatarRoutes from './routes/avatar';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware — dynamically accept all origins for local dev Expo testing
app.use(cors({
    origin: (origin, callback) => {
        // Echo the origin back so `credentials: true` works without a wildcard
        callback(null, origin || true);
    },
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/avatar', avatarRoutes);

// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Health Twin API is running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

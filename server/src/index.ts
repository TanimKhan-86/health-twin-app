import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import moodRoutes from './routes/mood';
import analyticsRoutes from './routes/analytics';
import achievementsRoutes from './routes/achievements';
import seedRoutes from './routes/seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/seed', seedRoutes);

// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Health Twin API is running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

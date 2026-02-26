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
import aiRoutes from './routes/ai';
import streakRoutes from './routes/streak';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware — allow all localhost ports for dev + configured origin for production
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        // Allow any localhost / 192.168.x.x / 10.x.x.x for dev
        if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        // Allow configured production origin
        if (process.env.CLIENT_ORIGIN && origin === process.env.CLIENT_ORIGIN) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
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
app.use('/api/ai', aiRoutes);
app.use('/api/streak', streakRoutes);

// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Health Twin API is running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

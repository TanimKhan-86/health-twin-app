import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import HealthEntry from '../models/HealthEntry';
import MoodEntry from '../models/MoodEntry';
import { Avatar } from '../models/Avatar';
import { AvatarAnimation } from '../models/AvatarAnimation';
import WeeklyAnalysisCache from '../models/WeeklyAnalysisCache';
import { AuthSessionDto, AuthUserDto } from '../contracts/api';
import { getErrorMessage, sendError, sendSuccess } from '../lib/apiResponse';
import { parseBody } from '../lib/validation';

const router = Router();

const registerSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
    email: z.string().trim().email('Invalid email format').transform((value) => value.toLowerCase()),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    profileImage: z.string().trim().min(1).optional(),
    age: z.coerce.number().int().min(1).max(120).optional(),
    heightCm: z.coerce.number().min(40).max(250).optional(),
    weightKg: z.coerce.number().min(20).max(400).optional(),
});

const loginSchema = z.object({
    email: z.string().trim().email('Invalid email format').transform((value) => value.toLowerCase()),
    password: z.string().min(1, 'Password is required'),
});

function toAuthUser(user: {
    _id: unknown;
    name: string;
    email: string;
    age?: number;
    heightCm?: number;
    weightKg?: number;
    profileImage?: string | null;
}): AuthUserDto {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        age: user.age,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        profileImage: user.profileImage ?? null,
    };
}

function createAuthToken(userId: string): string | null {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    return jwt.sign({ userId }, secret, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', async (req, res: Response): Promise<void> => {
    const input = parseBody(res, registerSchema, req.body);
    if (!input) return;

    try {
        const existing = await User.findOne({ email: input.email });
        if (existing) {
            sendError(res, 409, 'Email already registered');
            return;
        }

        const user = await User.create(input);
        const token = createAuthToken(String(user._id));
        if (!token) {
            sendError(res, 500, 'JWT secret is not configured');
            return;
        }

        const payload: AuthSessionDto = {
            token,
            user: toAuthUser(user),
        };
        sendSuccess(res, payload, 201);
    } catch (error: unknown) {
        console.error('Register error:', error);
        sendError(res, 500, getErrorMessage(error));
    }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response): Promise<void> => {
    const input = parseBody(res, loginSchema, req.body);
    if (!input) return;

    try {
        const user = await User.findOne({ email: input.email });
        if (!user) {
            sendError(res, 401, 'Invalid credentials');
            return;
        }

        const valid = await user.comparePassword(input.password);
        if (!valid) {
            sendError(res, 401, 'Invalid credentials');
            return;
        }

        const token = createAuthToken(String(user._id));
        if (!token) {
            sendError(res, 500, 'JWT secret is not configured');
            return;
        }

        const payload: AuthSessionDto = {
            token,
            user: toAuthUser(user),
        };
        sendSuccess(res, payload);
    } catch (error: unknown) {
        console.error('Login error:', error);
        sendError(res, 500, getErrorMessage(error));
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.userId) {
            sendError(res, 401, 'Unauthorized');
            return;
        }

        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        sendSuccess(res, { user: toAuthUser(user) });
    } catch (error: unknown) {
        sendError(res, 500, getErrorMessage(error));
    }
});

// DELETE /api/auth/me
router.delete('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.userId) {
            sendError(res, 401, 'Unauthorized');
            return;
        }

        const userId = req.userId;
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            sendError(res, 404, 'User not found');
            return;
        }

        await Promise.all([
            HealthEntry.deleteMany({ userId }),
            MoodEntry.deleteMany({ userId }),
            Avatar.deleteMany({ userId }),
            AvatarAnimation.deleteMany({ userId }),
            WeeklyAnalysisCache.deleteMany({ userId }),
        ]);

        sendSuccess(res, { message: 'Account and associated data deleted successfully' });
    } catch (error: unknown) {
        console.error('Delete account error:', error);
        sendError(res, 500, getErrorMessage(error));
    }
});

export default router;

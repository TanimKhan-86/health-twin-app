import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, profileImage, age, heightCm, weightKg } = req.body;
        console.log(`[Register] Request for ${email}. profileImage present?`, !!profileImage, typeof profileImage);
        if (profileImage) {
            console.log(`[Register] profileImage length:`, profileImage.length, `Starts with:`, profileImage.substring(0, 30));
        }

        if (!name || !email || !password) {
            res.status(400).json({ error: 'name, email and password are required' });
            return;
        }

        const existing = await User.findOne({ email });
        if (existing) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        const user = await User.create({ name, email, password, profileImage, age, heightCm, weightKg });

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET as string,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'email and password are required' });
            return;
        }

        const user = await User.findOne({ email });
        console.log(`[Login] findOne result for ${email}:`, user ? 'FOUND' : 'null');
        console.log(`[Login] Raw password input length: ${password.length}`);

        if (!user) {
            console.warn(`[Login] Failed: Email ${email} not found`);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        console.log(`[Login] Comparing password for ${email}. Hash length: ${user.password?.length}`);
        const valid = await user.comparePassword(password);
        if (!valid) {
            console.warn(`[Login] Failed: Invalid password for ${email}`);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET as string,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }
        res.json({ user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage } });
    } catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

export default router;

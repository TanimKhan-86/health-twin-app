import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import { StateType } from '../models/AvatarAnimation';

const NANO_BANA_API_URL = process.env.NANO_BANA_API_URL || 'https://api.nanobana.ai/v1';
const NANO_BANA_API_KEY = process.env.NANO_BANA_API_KEY || '';
const NANO_BANA_STYLE_PRESET = process.env.NANO_BANA_STYLE_PRESET || 'health_twin_demo_style_v1';

const FALLBACK_ANIMATIONS: Record<StateType, string> = {
    happy: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    sad: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    sleepy: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    stressed: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
};

function fallbackAvatarUrlFromImage(imageBuffer: Buffer): string {
    const seed = crypto.createHash('sha1').update(imageBuffer).digest('hex').slice(0, 16);
    return `https://api.dicebear.com/9.x/personas/png?seed=${seed}&size=512&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function firstString(...values: Array<unknown>): string | null {
    for (const value of values) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }
    return null;
}

function parseAvatarUrl(payload: any): string | null {
    return firstString(
        payload?.avatarUrl,
        payload?.imageUrl,
        payload?.url,
        payload?.data?.avatarUrl,
        payload?.data?.imageUrl,
        payload?.data?.url,
        payload?.result?.avatarUrl,
        payload?.result?.imageUrl,
        payload?.result?.url
    );
}

function parseVideoUrl(payload: any): string | null {
    return firstString(
        payload?.videoUrl,
        payload?.animationUrl,
        payload?.url,
        payload?.data?.videoUrl,
        payload?.data?.animationUrl,
        payload?.data?.url,
        payload?.result?.videoUrl,
        payload?.result?.animationUrl,
        payload?.result?.url
    );
}

export interface BaseAvatarResult {
    url: string;
    metadata: Record<string, any>;
}

export interface AnimationResult {
    url: string;
    duration: number;
    quality: 'high' | 'standard';
    loopOptimized: boolean;
    circularOptimized: boolean;
    metadata: Record<string, any>;
}

/**
 * Generates a stylized avatar from a real uploaded photo using NanoBana.
 * Falls back to deterministic demo output when API credentials are not configured.
 */
export async function generateBaseAvatar(imageBuffer: Buffer, mimetype: string): Promise<BaseAvatarResult> {
    console.log(`[NanoBana] Processing photo (${mimetype}, ${Math.round(imageBuffer.length / 1024)}KB)`);

    if (!NANO_BANA_API_KEY) {
        const fallbackUrl = fallbackAvatarUrlFromImage(imageBuffer);
        return {
            url: fallbackUrl,
            metadata: {
                provider: 'nanobana_fallback',
                reason: 'NANO_BANA_API_KEY missing',
                stylePreset: NANO_BANA_STYLE_PRESET,
                quality: 'high',
                frameTarget: 'circular',
                generatedAt: new Date().toISOString(),
            },
        };
    }

    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'avatar-upload.jpg', contentType: mimetype });
    formData.append('stylePreset', NANO_BANA_STYLE_PRESET);
    formData.append('outputFormat', 'png');
    formData.append('quality', 'high');
    formData.append('frameTarget', 'circular');

    try {
        const response = await axios.post(`${NANO_BANA_API_URL}/avatar/generate`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${NANO_BANA_API_KEY}`,
            },
            timeout: 120_000,
        });

        const avatarUrl = parseAvatarUrl(response.data);
        if (!avatarUrl) {
            throw new Error('NanoBana response missing avatar URL');
        }

        return {
            url: avatarUrl,
            metadata: {
                provider: 'nanobana',
                stylePreset: NANO_BANA_STYLE_PRESET,
                quality: 'high',
                frameTarget: 'circular',
                generatedAt: new Date().toISOString(),
                responseMeta: response.data?.meta || null,
            },
        };
    } catch (error: any) {
        console.warn('[NanoBana] Avatar generation failed, using fallback:', error?.message || error);
        const fallbackUrl = fallbackAvatarUrlFromImage(imageBuffer);
        return {
            url: fallbackUrl,
            metadata: {
                provider: 'nanobana_fallback',
                reason: error?.message || 'Unknown error',
                stylePreset: NANO_BANA_STYLE_PRESET,
                quality: 'high',
                frameTarget: 'circular',
                generatedAt: new Date().toISOString(),
            },
        };
    }
}

/**
 * Generates a short loopable emotional animation from a saved avatar.
 */
export async function generateStateAnimation(baseAvatarUrl: string, state: StateType): Promise<AnimationResult> {
    const payload = {
        avatarImageUrl: baseAvatarUrl,
        emotion: state,
        durationSeconds: 4,
        loop: true,
        quality: 'high',
        frameTarget: 'circular',
        outputFormat: 'mp4',
        stylePreset: NANO_BANA_STYLE_PRESET,
    };

    if (!NANO_BANA_API_KEY) {
        return {
            url: FALLBACK_ANIMATIONS[state],
            duration: 4,
            quality: 'high',
            loopOptimized: true,
            circularOptimized: true,
            metadata: {
                provider: 'nanobana_fallback',
                reason: 'NANO_BANA_API_KEY missing',
                state,
                generatedAt: new Date().toISOString(),
            },
        };
    }

    try {
        const response = await axios.post(`${NANO_BANA_API_URL}/avatar/animate`, payload, {
            headers: {
                Authorization: `Bearer ${NANO_BANA_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 180_000,
        });

        const videoUrl = parseVideoUrl(response.data);
        if (!videoUrl) {
            throw new Error(`NanoBana response missing animation URL for state "${state}"`);
        }

        const duration = Number(response.data?.durationSeconds || response.data?.data?.durationSeconds || 4);

        return {
            url: videoUrl,
            duration: Number.isFinite(duration) && duration > 0 ? duration : 4,
            quality: 'high',
            loopOptimized: true,
            circularOptimized: true,
            metadata: {
                provider: 'nanobana',
                state,
                stylePreset: NANO_BANA_STYLE_PRESET,
                generatedAt: new Date().toISOString(),
                responseMeta: response.data?.meta || null,
            },
        };
    } catch (error: any) {
        console.warn(`[NanoBana] Animation generation failed for ${state}, using fallback:`, error?.message || error);
        return {
            url: FALLBACK_ANIMATIONS[state],
            duration: 4,
            quality: 'high',
            loopOptimized: true,
            circularOptimized: true,
            metadata: {
                provider: 'nanobana_fallback',
                reason: error?.message || 'Unknown error',
                state,
                generatedAt: new Date().toISOString(),
            },
        };
    }
}

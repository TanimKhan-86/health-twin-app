import axios from 'axios';
import crypto from 'crypto';
import express from 'express';
import { StateType } from '../models/AvatarAnimation';

const STOCK_SAMPLE_VIDEO_PATTERN = /^https:\/\/storage\.googleapis\.com\/gtv-videos-bucket\/sample\//i;

export interface SourceImage {
    buffer: Buffer;
    mimetype: string;
    source: 'upload' | 'profile';
    profileDataUri?: string;
}

export interface AvatarVideoCandidate {
    state: StateType;
    videoUrl: string;
    duration: number;
    quality: 'high' | 'standard';
    loopOptimized: boolean;
    circularOptimized: boolean;
    metadata: Record<string, unknown>;
}

export function safeMetadata(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function computeAvatarFingerprint(avatarImageUrl: string): string {
    return crypto.createHash('sha256').update(avatarImageUrl).digest('hex');
}

export function isStockFallbackVideo(videoUrl?: string | null): boolean {
    if (!videoUrl) return true;
    return STOCK_SAMPLE_VIDEO_PATTERN.test(videoUrl);
}

export function isAvatarBasedAnimation(animation: {
    videoUrl?: string | null;
    generationMetadata?: Record<string, unknown>;
}, avatarFingerprint?: string | null): boolean {
    if (!animation.videoUrl) return false;
    if (isStockFallbackVideo(animation.videoUrl)) return false;

    const metadata = safeMetadata(animation.generationMetadata);
    const provider = typeof metadata.provider === 'string' ? metadata.provider : '';
    const animationFingerprint = typeof metadata.avatarFingerprint === 'string' ? metadata.avatarFingerprint : null;

    if (avatarFingerprint) {
        return animationFingerprint === avatarFingerprint;
    }

    if (animation.videoUrl.startsWith('data:video/')) return true;
    return provider === 'nanobana_google'
        || provider === 'nanobana_reused'
        || provider === 'nanobana_surrogate'
        || provider.startsWith('prebuilt_');
}

export function toDataUri(buffer: Buffer, mimetype: string): string {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
}

function parseDataUri(dataUri: string): { buffer: Buffer; mimetype: string } | null {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return {
        mimetype: match[1],
        buffer: Buffer.from(match[2], 'base64'),
    };
}

export async function resolveSourceImage(
    req: express.Request & { file?: Express.Multer.File },
    userProfileImage?: string | null
): Promise<SourceImage> {
    if (req.file) {
        return {
            buffer: req.file.buffer,
            mimetype: req.file.mimetype || 'image/jpeg',
            source: 'upload',
            profileDataUri: toDataUri(req.file.buffer, req.file.mimetype || 'image/jpeg'),
        };
    }

    if (!userProfileImage) {
        throw new Error('No source image available');
    }

    const parsed = parseDataUri(userProfileImage);
    if (parsed) {
        return {
            buffer: parsed.buffer,
            mimetype: parsed.mimetype,
            source: 'profile',
            profileDataUri: userProfileImage,
        };
    }

    const download = await axios.get<ArrayBuffer>(userProfileImage, {
        responseType: 'arraybuffer',
        timeout: 30_000,
    });
    const mimetype = (download.headers['content-type'] || 'image/jpeg').split(';')[0];
    const buffer = Buffer.from(download.data);
    return {
        buffer,
        mimetype,
        source: 'profile',
        profileDataUri: toDataUri(buffer, mimetype),
    };
}

interface HealthSignal {
    sleepHours?: number;
    heartRate?: number;
    steps?: number;
    waterLitres?: number;
    energyScore?: number;
}

interface MoodSignal {
    mood?: string;
    energyLevel?: number;
    stressLevel?: number;
}

export function chooseAvatarState(
    health: HealthSignal | null | undefined,
    mood: MoodSignal | null | undefined,
    availableStates: StateType[]
): { state: StateType; reasoning: string } {
    const hasState = (state: StateType): boolean => availableStates.includes(state);
    const fallbackSadLike = (): StateType => {
        if (hasState('sad')) return 'sad';
        return availableStates[0] || 'sad';
    };

    const sleepHours = Number(health?.sleepHours ?? 0);
    const stressLevel = Number(mood?.stressLevel ?? 0);
    const heartRate = Number(health?.heartRate ?? 0);
    const steps = Number(health?.steps ?? 0);
    const waterLitres = Number(health?.waterLitres ?? 0);
    const energyScore = Number(health?.energyScore ?? 0);
    const moodEnergy = Number(mood?.energyLevel ?? 0);
    const moodName = typeof mood?.mood === 'string' ? mood.mood.toLowerCase() : '';

    if (sleepHours > 0 && sleepHours <= 4 && hasState('sleepy')) {
        return { state: 'sleepy', reasoning: `Sleep is low (${sleepHours}h)` };
    }

    let fatigueSignalSource: string | null = null;
    if (
        moodName === 'tired' ||
        (energyScore > 0 && energyScore <= 45) ||
        (moodEnergy > 0 && moodEnergy <= 4) ||
        stressLevel >= 7 ||
        heartRate >= 95
    ) {
        fatigueSignalSource = moodName === 'tired'
            ? 'mood: tired'
            : energyScore > 0 && energyScore <= 45
                ? `energy score ${Math.round(energyScore)}`
                : moodEnergy > 0 && moodEnergy <= 4
                    ? `mood energy ${moodEnergy}/10`
                    : stressLevel >= 7
                        ? `stress level ${stressLevel}/10`
                        : `heart rate ${heartRate} bpm`;
    }

    if (fatigueSignalSource) {
        if (hasState('tired')) {
            return { state: 'tired', reasoning: `Low-energy/fatigue signal from ${fatigueSignalSource}` };
        }
        return { state: fallbackSadLike(), reasoning: `Low-energy/stress signal from ${fatigueSignalSource}` };
    }

    let positiveSignals = 0;
    if (steps >= 8000) positiveSignals += 1;
    if (sleepHours >= 7) positiveSignals += 1;
    if (waterLitres >= 2) positiveSignals += 1;
    if (energyScore >= 70) positiveSignals += 1;
    if (moodEnergy >= 7) positiveSignals += 1;

    if (positiveSignals >= 2 && hasState('happy')) {
        return { state: 'happy', reasoning: `Positive daily metrics (${positiveSignals} strong signals)` };
    }

    return { state: fallbackSadLike(), reasoning: 'Default low/neutral activity state' };
}

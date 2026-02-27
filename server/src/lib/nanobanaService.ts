import { StateType } from '../models/AvatarAnimation';

// Demo URLs for testing the dashboard integration without a real API key
const DEMO_AVATAR_URL = 'https://utfs.io/f/6b9b3e0c-c0f5-46db-b7b5-2d64a0f44358-1zbfv.png';

const DEMO_ANIMATIONS: Record<StateType, string> = {
    happy: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    sad: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    sleepy: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    stressed: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    neutral: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
};

/**
 * Simulates generating a base avatar from a user photo
 */
export async function generateBaseAvatar(imageBuffer: Buffer, mimetype: string): Promise<{ url: string; metadata: any }> {
    console.log(`[NanoBana] Processing uploaded image (${mimetype}, ${Math.round(imageBuffer.length / 1024)}KB)`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
        url: DEMO_AVATAR_URL,
        metadata: {
            provider: 'nanobana_demo',
            style: 'modern_stylized',
            aspectRatio: '1:1',
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Simulates generating an animated state from the base avatar
 */
export async function generateStateAnimation(baseAvatarUrl: string, state: StateType): Promise<{ url: string; duration: number }> {
    console.log(`[NanoBana] Generating ${state} animation for avatar`);

    // Simulate API delay for animation rendering
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
        url: DEMO_ANIMATIONS[state] || DEMO_ANIMATIONS.neutral,
        duration: 5, // All demo videos assumed 5 seconds
    };
}

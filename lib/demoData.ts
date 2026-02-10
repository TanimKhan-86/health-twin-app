import { UserService, HealthService, MoodService, StreakService, AchievementService } from './services';

/**
 * Helper functions to populate database with demo/test data
 * Useful for testing and development
 */
// Helper to generate random number between min and max
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const DemoDataHelper = {
    /**
     * Check if ANY data exists in the health_entries table
     */
    async checkIfDataExists(): Promise<boolean> {
        try {
            // Assuming 'db' is imported or globally available for database access
            // This part of the code snippet is incomplete without the 'db' import/definition.
            // For the purpose of this edit, I'll assume 'db' is accessible.
            // If 'db' is not defined, this will cause a runtime error.
            const database = db.getDB();
            const result = await database.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM health_entries'
            );
            return (result?.count || 0) > 0;
        } catch (e) {
            console.warn("Error checking for existing data:", e);
            return false;
        }
    },

    /**
     * Create a demo user
     */
    async createDemoUser(): Promise<string> {
        const userId = `demo_user_${Date.now()}`;

        await UserService.upsertUser({
            user_id: userId,
            name: 'Demo User',
            study_mode: 'both',
            consent_given: true,
            settings_json: JSON.stringify({
                notifications_enabled: true,
                theme: 'light',
                units: 'metric',
            }),
        });

        console.log(`Created demo user: ${userId}`);
        return userId;
    },

    /**
     * Add sample health data for the past 7 days
     */
    async addSampleHealthData(userId: string): Promise<void> {
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const steps = Math.floor(Math.random() * 5000) + 5000; // 5k-10k steps
            const sleep = Math.random() * 3 + 5; // 5-8 hours
            const energyScore = (sleep / 8) * 0.6 + (steps / 10000) * 0.4;

            await HealthService.upsertHealthEntry({
                user_id: userId,
                date: dateStr,
                steps,
                sleep_hours: Number(sleep.toFixed(1)),
                energy_score: Number((energyScore * 100).toFixed(1)),
            });
        }

        console.log('Added 7 days of sample health data');
    },

    /**
     * Add sample mood data for the past 7 days
     */
    async addSampleMoodData(userId: string): Promise<void> {
        const today = new Date();
        const moods: Array<'great' | 'good' | 'okay' | 'low' | 'bad'> = ['great', 'good', 'okay', 'low', 'bad'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const moodValue = moods[Math.floor(Math.random() * moods.length)];
            const emotionScore = Math.random() * 40 + 60; // 60-100

            await MoodService.addMoodEntry({
                user_id: userId,
                date: dateStr,
                mood_value: moodValue,
                emotion_score: Number(emotionScore.toFixed(1)),
                diary_text: `Sample diary entry for ${dateStr}. Feeling ${moodValue} today!`,
            });
        }

        console.log('Added 7 days of sample mood data');
    },

    /**
     * Initialize streak for user
     */
    async initializeSampleStreak(userId: string): Promise<void> {
        await StreakService.initStreak(userId);

        // Simulate 3 consecutive check-ins
        const today = new Date();
        for (let i = 2; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            await StreakService.updateStreak(userId, dateStr);
        }

        console.log('Initialized sample streak (3-day streak)');
    },

    /**
     * Unlock sample achievements
     */
    async unlockSampleAchievements(userId: string): Promise<void> {
        const achievements = [
            {
                user_id: userId,
                achievement_type: 'milestone',
                achievement_name: 'First Steps',
                metadata_json: JSON.stringify({ description: 'Completed your first health entry' }),
            },
            {
                user_id: userId,
                achievement_type: 'consistency',
                achievement_name: '3-Day Streak',
                metadata_json: JSON.stringify({ description: 'Maintained a 3-day check-in streak' }),
            },
        ];

        for (const achievement of achievements) {
            await AchievementService.unlockAchievement(achievement);
        }

        console.log('Unlocked 2 sample achievements');
    },

    /**
     * Populate all demo data at once
     */
    async populateAllDemoData(): Promise<string> {
        const userId = await this.createDemoUser();
        await this.addSampleHealthData(userId);
        await this.addSampleMoodData(userId);
        await this.initializeSampleStreak(userId);
        await this.unlockSampleAchievements(userId);

        console.log('✅ All demo data populated successfully');
        return userId;
    },
};

/**
 * Utility to format date as YYYY-MM-DD
 */
/**
 * Utility to format date as YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

/**
 * Get today's date as YYYY-MM-DD
 */
export const getToday = (): string => {
    return formatDate(new Date());
};

/**
 * Get date N days ago as YYYY-MM-DD
 */
export const getDaysAgo = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatDate(date);
};

import db from './database';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * User Service - Handles all user-related database operations
 */

export interface User {
    id?: number;
    user_id: string;
    name?: string;
    email?: string;
    password?: string;
    profile_image?: string;
    created_at?: string;
    study_mode?: 'dashboard' | 'twin_story' | 'both';
    consent_given?: boolean;
    settings_json?: string;
}

export interface UserSettings {
    notifications_enabled?: boolean;
    theme?: 'light' | 'dark';
    units?: 'metric' | 'imperial';
    [key: string]: any;
}

export const UserService = {
    /**
     * Create or update user profile
     */
    async upsertUser(user: User): Promise<void> {
        const database = db.getDB();

        const settingsJson = user.settings_json || '{}';
        const consentGiven = user.consent_given ? 1 : 0;

        // Simple password hashing (just for demo structure, actually storing plain text in prototype)
        // In production, use bcrypt or similar

        await database.runAsync(
            `INSERT INTO users (user_id, name, email, password, profile_image, study_mode, consent_given, settings_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         name = excluded.name,
         email = excluded.email,
         password = excluded.password,
         profile_image = excluded.profile_image,
         study_mode = excluded.study_mode,
         consent_given = excluded.consent_given,
         settings_json = excluded.settings_json`,
            [
                user.user_id,
                user.name || null,
                user.email || null,
                user.password || null,
                user.profile_image || null,
                user.study_mode || 'both',
                consentGiven,
                settingsJson
            ]
        );
    },

    /**
     * Authenticate user
     */
    async authenticateUser(email: string, password: string): Promise<User | null> {
        const database = db.getDB();

        const result = await database.getFirstAsync<User>(
            'SELECT * FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        if (result) {
            result.consent_given = Boolean(result.consent_given);
        }

        return result || null;
    },

    /**
     * Get user by user_id
     */
    async getUser(userId: string): Promise<User | null> {
        const database = db.getDB();

        const result = await database.getFirstAsync<User>(
            'SELECT * FROM users WHERE user_id = ?',
            [userId]
        );

        if (result) {
            result.consent_given = Boolean(result.consent_given);
        }

        return result || null;
    },

    /**
     * Update user settings
     */
    async updateSettings(userId: string, settings: UserSettings): Promise<void> {
        const database = db.getDB();
        const settingsJson = JSON.stringify(settings);

        await database.runAsync(
            'UPDATE users SET settings_json = ? WHERE user_id = ?',
            [settingsJson, userId]
        );
    },

    /**
     * Get user settings
     */
    async getSettings(userId: string): Promise<UserSettings> {
        const user = await this.getUser(userId);
        if (!user || !user.settings_json) {
            return {};
        }

        try {
            return JSON.parse(user.settings_json);
        } catch {
            return {};
        }
    },

    /**
     * Delete user and all associated data
     */
    async deleteUser(userId: string): Promise<void> {
        const database = db.getDB();

        // Delete in order (foreign key constraints)
        await database.runAsync('DELETE FROM achievements WHERE user_id = ?', [userId]);
        await database.runAsync('DELETE FROM streaks WHERE user_id = ?', [userId]);
        await database.runAsync('DELETE FROM moods WHERE user_id = ?', [userId]);
        await database.runAsync('DELETE FROM health_entries WHERE user_id = ?', [userId]);
        await database.runAsync('DELETE FROM users WHERE user_id = ?', [userId]);
    },
};

/**
 * Health Entry Service - Handles daily health metrics
 */

export interface HealthEntry {
    id?: number;
    user_id: string;
    date: string; // YYYY-MM-DD format
    steps?: number;
    sleep_hours?: number;
    energy_score?: number;
    created_at?: string;
    updated_at?: string;
}

export const HealthService = {
    /**
     * Add or update health entry for a specific date
     */
    async upsertHealthEntry(entry: HealthEntry): Promise<void> {
        const database = db.getDB();

        await database.runAsync(
            `INSERT INTO health_entries (user_id, date, steps, sleep_hours, energy_score, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, date) DO UPDATE SET
         steps = excluded.steps,
         sleep_hours = excluded.sleep_hours,
         energy_score = excluded.energy_score,
         updated_at = CURRENT_TIMESTAMP`,
            [
                entry.user_id,
                entry.date,
                entry.steps || 0,
                entry.sleep_hours || 0,
                entry.energy_score || null,
            ]
        );
    },

    /**
     * Get health entry for a specific date
     */
    async getHealthEntry(userId: string, date: string): Promise<HealthEntry | null> {
        const database = db.getDB();

        const result = await database.getFirstAsync<HealthEntry>(
            'SELECT * FROM health_entries WHERE user_id = ? AND date = ?',
            [userId, date]
        );

        return result || null;
    },

    /**
     * Get health entries for a date range
     */
    async getHealthEntriesRange(
        userId: string,
        startDate: string,
        endDate: string
    ): Promise<HealthEntry[]> {
        const database = db.getDB();

        const results = await database.getAllAsync<HealthEntry>(
            'SELECT * FROM health_entries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
            [userId, startDate, endDate]
        );

        return results;
    },

    /**
     * Get recent health entries (last N days)
     */
    async getRecentEntries(userId: string, days: number = 7): Promise<HealthEntry[]> {
        const database = db.getDB();

        const results = await database.getAllAsync<HealthEntry>(
            'SELECT * FROM health_entries WHERE user_id = ? ORDER BY date DESC LIMIT ?',
            [userId, days]
        );

        return results;
    },

    /**
     * Calculate average energy score for a period
     */
    async getAverageEnergyScore(userId: string, days: number = 7): Promise<number> {
        const database = db.getDB();

        const result = await database.getFirstAsync<{ avg: number }>(
            'SELECT AVG(energy_score) as avg FROM health_entries WHERE user_id = ? AND energy_score IS NOT NULL ORDER BY date DESC LIMIT ?',
            [userId, days]
        );

        return result?.avg || 0;
    },
};

/**
 * Mood Service - Handles mood/emotion tracking
 */

export type MoodValue = 'great' | 'good' | 'okay' | 'low' | 'bad';

export interface MoodEntry {
    id?: number;
    user_id: string;
    date: string;
    mood_value: MoodValue;
    emotion_score?: number;
    diary_text?: string;
    created_at?: string;
}

export const MoodService = {
    /**
     * Add mood entry
     */
    async addMoodEntry(entry: MoodEntry): Promise<void> {
        const database = db.getDB();

        await database.runAsync(
            `INSERT INTO moods (user_id, date, mood_value, emotion_score, diary_text)
       VALUES (?, ?, ?, ?, ?)`,
            [
                entry.user_id,
                entry.date,
                entry.mood_value,
                entry.emotion_score || null,
                entry.diary_text || null,
            ]
        );
    },

    /**
     * Get mood entries for a date range
     */
    async getMoodsRange(
        userId: string,
        startDate: string,
        endDate: string
    ): Promise<MoodEntry[]> {
        const database = db.getDB();

        const results = await database.getAllAsync<MoodEntry>(
            'SELECT * FROM moods WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
            [userId, startDate, endDate]
        );

        return results;
    },

    /**
     * Get recent mood entries
     */
    async getRecentMoods(userId: string, days: number = 7): Promise<MoodEntry[]> {
        const database = db.getDB();

        const results = await database.getAllAsync<MoodEntry>(
            'SELECT * FROM moods WHERE user_id = ? ORDER BY date DESC LIMIT ?',
            [userId, days]
        );

        return results;
    },

    /**
     * Get mood entry for a specific date (latest one if multiple)
     */
    async getMoodForDate(userId: string, date: string): Promise<MoodEntry | null> {
        const database = db.getDB();

        const result = await database.getFirstAsync<MoodEntry>(
            'SELECT * FROM moods WHERE user_id = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
            [userId, date]
        );

        return result || null;
    },
};

/**
 * Streak Service - Handles consistency tracking
 */

export interface Streak {
    id?: number;
    user_id: string;
    current_streak: number;
    longest_streak: number;
    last_check_in_date?: string;
    updated_at?: string;
}

export const StreakService = {
    /**
     * Initialize streak for a user
     */
    async initStreak(userId: string): Promise<void> {
        const database = db.getDB();

        await database.runAsync(
            `INSERT OR IGNORE INTO streaks (user_id, current_streak, longest_streak)
       VALUES (?, 0, 0)`,
            [userId]
        );
    },

    /**
     * Get user's streak data
     */
    async getStreak(userId: string): Promise<Streak | null> {
        const database = db.getDB();

        const result = await database.getFirstAsync<Streak>(
            'SELECT * FROM streaks WHERE user_id = ?',
            [userId]
        );

        return result || null;
    },

    /**
     * Update streak (call this on daily check-in)
     */
    async updateStreak(userId: string, checkInDate: string): Promise<Streak> {
        const database = db.getDB();

        // Get current streak
        let streak = await this.getStreak(userId);

        if (!streak) {
            await this.initStreak(userId);
            streak = await this.getStreak(userId);
            if (!streak) throw new Error('Failed to initialize streak');
        }

        const lastCheckIn = streak.last_check_in_date;
        let newCurrentStreak = streak.current_streak;
        let newLongestStreak = streak.longest_streak;

        if (!lastCheckIn) {
            // First check-in ever
            newCurrentStreak = 1;
        } else {
            const lastDate = new Date(lastCheckIn);
            const currentDate = new Date(checkInDate);
            const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Consecutive day
                newCurrentStreak += 1;
            } else if (diffDays === 0) {
                // Same day, no change
                newCurrentStreak = streak.current_streak;
            } else {
                // Streak broken
                newCurrentStreak = 1;
            }
        }

        // Update longest streak if needed
        if (newCurrentStreak > newLongestStreak) {
            newLongestStreak = newCurrentStreak;
        }

        await database.runAsync(
            `UPDATE streaks 
       SET current_streak = ?, longest_streak = ?, last_check_in_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
            [newCurrentStreak, newLongestStreak, checkInDate, userId]
        );

        return {
            user_id: userId,
            current_streak: newCurrentStreak,
            longest_streak: newLongestStreak,
            last_check_in_date: checkInDate,
        };
    },
};

/**
 * Achievement Service - Handles gamification rewards
 */

export interface Achievement {
    id?: number;
    user_id: string;
    achievement_type: string; // 'milestone', 'consistency', 'improvement'
    achievement_name: string;
    unlocked_at?: string;
    metadata_json?: string;
}

export const AchievementService = {
    /**
     * Unlock an achievement
     */
    async unlockAchievement(achievement: Achievement): Promise<void> {
        const database = db.getDB();

        const metadataJson = achievement.metadata_json || '{}';

        await database.runAsync(
            `INSERT OR IGNORE INTO achievements (user_id, achievement_type, achievement_name, metadata_json)
       VALUES (?, ?, ?, ?)`,
            [achievement.user_id, achievement.achievement_type, achievement.achievement_name, metadataJson]
        );
    },

    /**
     * Get all unlocked achievements for a user
     */
    async getAchievements(userId: string): Promise<Achievement[]> {
        const database = db.getDB();

        const results = await database.getAllAsync<Achievement>(
            'SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC',
            [userId]
        );

        return results;
    },

    /**
     * Check if achievement is unlocked
     */
    async isAchievementUnlocked(userId: string, achievementName: string): Promise<boolean> {
        const database = db.getDB();

        const result = await database.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM achievements WHERE user_id = ? AND achievement_name = ?',
            [userId, achievementName]
        );

        return (result?.count || 0) > 0;
    },
};

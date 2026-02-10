import { HealthService, StreakService, AchievementService, Achievement } from './services';

/**
 * Gamification Service
 * Handles rules for unlocking achievements and checking streaks.
 */

export const BADGES = [
    {
        id: 'first_step',
        name: 'First Step',
        description: 'Log your first health entry.',
        icon: '👣',
        category: 'milestone',
    },
    {
        id: 'streak_3',
        name: 'Consistency Is Key',
        description: 'Maintain a 3-day streak.',
        icon: '🔥',
        category: 'consistency',
    },
    {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak.',
        icon: '📅',
        category: 'consistency',
    },
    {
        id: 'steps_10k',
        name: 'Marathoner',
        description: 'Walk 10,000 steps in a single day.',
        icon: '🏃',
        category: 'improvement',
    },
    {
        id: 'sleep_8h',
        name: 'Sleeping Beauty',
        description: 'Get a full 8 hours of sleep.',
        icon: '😴',
        category: 'improvement',
    },
    {
        id: 'energy_master',
        name: 'High Energy',
        description: 'Reach an energy score of 90+.',
        icon: '⚡',
        category: 'milestone',
    },
];

export const GamificationService = {
    /**
     * Check for new achievements based on latest activity
     * Returns list of newly unlocked achievements
     */
    async checkAchievements(userId: string): Promise<Achievement[]> {
        const newUnlocks: Achievement[] = [];

        // 1. Get User Data
        const streak = await StreakService.getStreak(userId);
        const today = new Date().toISOString().split('T')[0];
        const todayEntry = await HealthService.getHealthEntry(userId, today);
        const allAchievements = await AchievementService.getAchievements(userId);
        const unlockedIds = new Set(allAchievements.map(a => a.achievement_name)); // specific logic here using name as id for simplicity in this demo

        // Helper to unlock
        const tryUnlock = async (badgeId: string) => {
            if (!unlockedIds.has(badgeId)) {
                const badge = BADGES.find(b => b.id === badgeId);
                if (badge) {
                    const newAchievement: Achievement = {
                        user_id: userId,
                        achievement_type: badge.category,
                        achievement_name: badge.id, // Storing ID as name for easy lookup
                        metadata_json: JSON.stringify({ name: badge.name, icon: badge.icon, description: badge.description })
                    };
                    await AchievementService.unlockAchievement(newAchievement);
                    newUnlocks.push(newAchievement);
                }
            }
        };

        // 2. Check Rules

        // Rule: First Step (Any entry)
        if (todayEntry) {
            await tryUnlock('first_step');
        }

        // Rule: Streaks
        if (streak) {
            if (streak.current_streak >= 3) await tryUnlock('streak_3');
            if (streak.current_streak >= 7) await tryUnlock('streak_7');
        }

        // Rule: Steps
        if (todayEntry && (todayEntry.steps ?? 0) >= 10000) {
            await tryUnlock('steps_10k');
        }

        // Rule: Sleep
        if (todayEntry && (todayEntry.sleep_hours ?? 0) >= 8) {
            await tryUnlock('sleep_8h');
        }

        // Rule: Energy
        if (todayEntry && (todayEntry.energy_score ?? 0) >= 90) {
            await tryUnlock('energy_master');
        }

        return newUnlocks;
    },

    /**
     * Get all badge definitions with unlocked status
     */
    async getBadgeProgress(userId: string) {
        const unlocked = await AchievementService.getAchievements(userId);
        const unlockedIds = new Set(unlocked.map(a => a.achievement_name));

        return BADGES.map(badge => ({
            ...badge,
            isUnlocked: unlockedIds.has(badge.id),
            unlockedAt: unlocked.find(a => a.achievement_name === badge.id)?.unlocked_at
        }));
    }
};

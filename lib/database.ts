import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Database Schema for AI Health Twin App
 * 
 * Tables:
 * 1. users - User profile and settings
 * 2. health_entries - Daily health data (steps, sleep, etc.)
 * 3. moods - Mood diary entries with optional text
 * 4. streaks - Streak tracking data
 * 5. achievements - Unlocked achievements
 */

const DB_NAME = 'health_twin.db';
const WEB_STORAGE_KEYS = ['users', 'health_entries', 'moods', 'streaks', 'achievements'];

// A mock SQLite DB interface for Web
class WebMockDB {
  async execAsync(query: string): Promise<void> {
    console.log('[Web Mock DB] Executing query:', query);
    return Promise.resolve();
  }
  async runAsync(query: string, params: any[] = []): Promise<void> {
    // A very crude mock for runAsync just to keep things from completely breaking on web.
    // In a real prod app you would completely decouple the query layer, but this will get the UI running.
    console.log('[Web Mock DB] Running query with params:', query, params);

    // Quick hack for user creation
    if (query.includes('INSERT INTO users')) {
      let usersStr = await AsyncStorage.getItem('users');
      let users = usersStr ? JSON.parse(usersStr) : [];
      const [userId, name, email, password, profileImage, studyMode, consentGiven, settingsJson] = params;

      users.push({
        user_id: userId,
        name,
        email,
        password,
        profile_image: profileImage,
        study_mode: studyMode,
        consent_given: consentGiven,
        settings_json: settingsJson,
      });
      await AsyncStorage.setItem('users', JSON.stringify(users));
    }

    // Streak initialization
    if (query.includes('INSERT OR IGNORE INTO streaks')) {
      const [userId] = params;
      let streaksStr = await AsyncStorage.getItem('streaks');
      let streaks = streaksStr ? JSON.parse(streaksStr) : [];

      const exists = streaks.find((s: any) => s.user_id === userId);
      if (!exists) {
        streaks.push({
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
        });
        await AsyncStorage.setItem('streaks', JSON.stringify(streaks));
      }
    }

    // Streak updating
    if (query.includes('UPDATE streaks')) {
      const [currentStreak, longestStreak, checkInDate, userId] = params;
      let streaksStr = await AsyncStorage.getItem('streaks');
      let streaks = streaksStr ? JSON.parse(streaksStr) : [];

      const index = streaks.findIndex((s: any) => s.user_id === userId);
      if (index !== -1) {
        streaks[index].current_streak = currentStreak;
        streaks[index].longest_streak = longestStreak;
        streaks[index].last_check_in_date = checkInDate;
        await AsyncStorage.setItem('streaks', JSON.stringify(streaks));
      }
    }

    return Promise.resolve();
  }
  async getFirstAsync<T>(query: string, params: any[] = []): Promise<T | null> {
    console.log('[Web Mock DB] getFirstAsync:', query, params);

    // Quick hack for login getting user
    if (query.includes('SELECT * FROM users WHERE email = ? AND password = ?')) {
      const [email, password] = params;
      let usersStr = await AsyncStorage.getItem('users');
      if (usersStr) {
        let users = JSON.parse(usersStr);
        let user = users.find((u: any) => u.email === email && u.password === password);
        if (user) return user as T;
      }
    }

    // Hack for getUser by ID
    if (query.includes('SELECT * FROM users WHERE user_id = ?')) {
      const [userId] = params;
      let usersStr = await AsyncStorage.getItem('users');
      if (usersStr) {
        let users = JSON.parse(usersStr);
        let user = users.find((u: any) => u.user_id === userId);
        if (user) return user as T;
      }
    }

    // getStreak
    if (query.includes('SELECT * FROM streaks WHERE user_id = ?')) {
      const [userId] = params;
      let streaksStr = await AsyncStorage.getItem('streaks');
      if (streaksStr) {
        let streaks = JSON.parse(streaksStr);
        let streak = streaks.find((s: any) => s.user_id === userId);
        if (streak) return streak as T;
      }
    }

    // isAchievementUnlocked
    if (query.includes('SELECT COUNT(*) as count FROM achievements WHERE user_id = ? AND achievement_name = ?')) {
      const [userId, achievementName] = params;
      let achievementsStr = await AsyncStorage.getItem('achievements');
      if (achievementsStr) {
        let achievements = JSON.parse(achievementsStr);
        let count = achievements.filter((a: any) => a.user_id === userId && a.achievement_name === achievementName).length;
        return { count } as unknown as T;
      }
      return { count: 0 } as unknown as T;
    }

    return Promise.resolve(null);
  }
  async getAllAsync<T>(query: string, params: any[] = []): Promise<T[]> {
    console.log('[Web Mock DB] getAllAsync:', query, params);

    // getAchievements
    if (query.includes('SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC')) {
      const [userId] = params;
      let achievementsStr = await AsyncStorage.getItem('achievements');
      if (achievementsStr) {
        let achievements = JSON.parse(achievementsStr);
        return achievements.filter((a: any) => a.user_id === userId) as T[];
      }
      return Promise.resolve([]);
    }

    // getRecentMoods
    if (query.includes('SELECT * FROM moods WHERE user_id = ? ORDER BY date DESC LIMIT ?')) {
      const [userId] = params; // intentionally ignoring limit for mock
      let moodsStr = await AsyncStorage.getItem('moods');
      if (moodsStr) {
        let moods = JSON.parse(moodsStr);
        return moods.filter((m: any) => m.user_id === userId) as T[];
      }
      return Promise.resolve([]);
    }

    return Promise.resolve([]);
  }
  async closeAsync(): Promise<void> {
    return Promise.resolve();
  }
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | WebMockDB | null = null;
  private initPromise: Promise<void> | null = null;
  private isWeb: boolean = Platform.OS === 'web';

  /**
   * Initialize database and create tables if they don't exist
   */
  async init(): Promise<void> {
    if (this.db) {
      console.log('Database already initialized');
      return;
    }

    if (this.initPromise) {
      console.log('Database initialization already in progress, waiting...');
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (this.isWeb) {
          console.log('Using Web Mock Database');
          this.db = new WebMockDB();
          // We don't need to run create tables since it's an async storage mock 
        } else {
          console.log('Opening database...');
          this.db = await SQLite.openDatabaseAsync(DB_NAME);
          await this.createTables();
        }

        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Database initialization failed:', error);
        this.db = null; // Reset on failure
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }
  /**
   * Create all necessary tables
   */
  private async createTables(): Promise<void> {
    // Only used for Native SQLite
    if (!this.db || this.isWeb) return;

    const sqliteDb = this.db as SQLite.SQLiteDatabase;

    // Users table - stores user profile and preferences
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        profile_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        study_mode TEXT CHECK(study_mode IN ('dashboard', 'twin_story', 'both')),
        consent_given INTEGER DEFAULT 0,
        settings_json TEXT
      );
    `);

    // Migration for existing tables - Granular handling
    try {
      await sqliteDb.execAsync(`ALTER TABLE users ADD COLUMN email TEXT;`); // Removing UNIQUE constraint for migration simplicity if dupes exist
      console.log('Migrated: Added email column');
    } catch (e) { console.log('Migration note (email):', e); }

    try {
      await sqliteDb.execAsync(`ALTER TABLE users ADD COLUMN password TEXT;`);
      console.log('Migrated: Added password column');
    } catch (e) { console.log('Migration note (password):', e); }

    try {
      await sqliteDb.execAsync(`ALTER TABLE users ADD COLUMN profile_image TEXT;`);
      console.log('Migrated: Added profile_image column');
    } catch (e) { console.log('Migration note (profile_image):', e); }

    // Health entries table - daily health metrics
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS health_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        steps INTEGER DEFAULT 0,
        sleep_hours REAL DEFAULT 0,
        energy_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        UNIQUE(user_id, date)
      );
    `);

    // Moods table - emotional/mood tracking with optional diary
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS moods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        mood_value TEXT CHECK(mood_value IN ('great', 'good', 'okay', 'low', 'bad')),
        emotion_score REAL,
        diary_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
    `);

    // Streaks table - tracking consistency
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_check_in_date DATE,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        UNIQUE(user_id)
      );
    `);

    // Achievements table - gamification rewards
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        achievement_type TEXT NOT NULL,
        achievement_name TEXT NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata_json TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        UNIQUE(user_id, achievement_name)
      );
    `);

    // Create indexes for better query performance
    await sqliteDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_health_entries_user_date ON health_entries(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    `);

    console.log('Database tables created successfully');
  }

  /**
   * Get database instance
   */
  getDB(): any {
    if (!this.db) throw new Error('Database not initialized. Call init() first.');
    return this.db;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      if (!this.isWeb) {
        await (this.db as SQLite.SQLiteDatabase).closeAsync();
      }
      this.db = null;
    }
  }

  /**
   * Reset database (WARNING: Deletes all data)
   */
  async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    if (this.isWeb) {
      for (const key of WEB_STORAGE_KEYS) {
        await AsyncStorage.removeItem(key);
      }
      console.log('Web mock database reset successfully');
      return;
    }

    const sqliteDb = this.db as SQLite.SQLiteDatabase;
    const tables = ['achievements', 'streaks', 'moods', 'health_entries', 'users'];

    for (const table of tables) {
      await sqliteDb.execAsync(`DROP TABLE IF EXISTS ${table};`);
    }

    await this.createTables();
    console.log('Database reset successfully');
  }
}

// Export singleton instance
export const db = new DatabaseService();
export default db;

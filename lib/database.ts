import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

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

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
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
        console.log('Opening database...');
        this.db = await SQLite.openDatabaseAsync(DB_NAME);
        await this.createTables();
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
    if (!this.db) throw new Error('Database not initialized');

    // Users table - stores user profile and preferences
    await this.db.execAsync(`
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
      await this.db.execAsync(`ALTER TABLE users ADD COLUMN email TEXT;`); // Removing UNIQUE constraint for migration simplicity if dupes exist
      console.log('Migrated: Added email column');
    } catch (e) { console.log('Migration note (email):', e); }

    try {
      await this.db.execAsync(`ALTER TABLE users ADD COLUMN password TEXT;`);
      console.log('Migrated: Added password column');
    } catch (e) { console.log('Migration note (password):', e); }

    try {
      await this.db.execAsync(`ALTER TABLE users ADD COLUMN profile_image TEXT;`);
      console.log('Migrated: Added profile_image column');
    } catch (e) { console.log('Migration note (profile_image):', e); }

    // Health entries table - daily health metrics
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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
    await this.db.execAsync(`
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
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_health_entries_user_date ON health_entries(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    `);

    console.log('Database tables created successfully');
  }

  /**
   * Get database instance
   */
  getDB(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('Database not initialized. Call init() first.');
    return this.db;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  /**
   * Reset database (WARNING: Deletes all data)
   */
  async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = ['achievements', 'streaks', 'moods', 'health_entries', 'users'];

    for (const table of tables) {
      await this.db.execAsync(`DROP TABLE IF EXISTS ${table};`);
    }

    await this.createTables();
    console.log('Database reset successfully');
  }
}

// Export singleton instance
export const db = new DatabaseService();
export default db;

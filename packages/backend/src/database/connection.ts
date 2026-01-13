import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.resolve(process.cwd(), config.databasePath);
    logger.info(`Connecting to database at ${dbPath}`);

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    logger.info('Database connected successfully');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

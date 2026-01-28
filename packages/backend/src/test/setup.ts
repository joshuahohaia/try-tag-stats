import { beforeAll } from 'vitest';
import { initializeSchema } from '../database/index.js';

// Initialize test database before all tests
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.TURSO_DATABASE_URL = 'file::memory:';
  process.env.TURSO_AUTH_TOKEN = '';

  // Initialize schema for in-memory test database
  await initializeSchema();
});

import { beforeAll } from 'vitest';
import { initializeSchema } from '../database/index.js';

// Initialize test database before all tests
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = ':memory:';

  // Initialize schema for in-memory test database
  initializeSchema();
});

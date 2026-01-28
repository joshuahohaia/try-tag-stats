import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { initializeSchema } from '../database/index.js';
import type { Express } from 'express';

describe('API Endpoints', () => {
  let app: Express;

  beforeAll(async () => {
    // Use in-memory database for tests
    process.env.TURSO_DATABASE_URL = 'file::memory:';
    process.env.TURSO_AUTH_TOKEN = '';
    await initializeSchema();
    app = createApp();
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('GET /api/v1', () => {
    it('should return API info with available endpoints', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Try Tag Stats API');
      expect(response.body.data.endpoints).toEqual({
        health: '/api/v1/health',
        regions: '/api/v1/regions',
        leagues: '/api/v1/leagues',
        divisions: '/api/v1/divisions',
        teams: '/api/v1/teams',
        fixtures: '/api/v1/fixtures',
      });
    });
  });

  describe('GET /api/v1/regions', () => {
    it('should return empty array when no data exists', async () => {
      const response = await request(app).get('/api/v1/regions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/leagues', () => {
    it('should return empty array when no data exists', async () => {
      const response = await request(app).get('/api/v1/leagues');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/divisions/:id', () => {
    it('should return 404 for non-existent division', async () => {
      const response = await request(app).get('/api/v1/divisions/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/divisions/:id/standings', () => {
    it('should return empty array for non-existent division', async () => {
      const response = await request(app).get('/api/v1/divisions/999/standings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/teams/:id', () => {
    it('should return 404 for non-existent team', async () => {
      const response = await request(app).get('/api/v1/teams/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/teams/batch', () => {
    it('should return 400 when ids parameter is missing', async () => {
      const response = await request(app).get('/api/v1/teams/batch');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return empty array for non-existent team IDs', async () => {
      const response = await request(app).get('/api/v1/teams/batch?ids=999,888');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/fixtures', () => {
    it('should return empty array when no data exists', async () => {
      const response = await request(app).get('/api/v1/fixtures');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const response = await request(app).get('/api/v1/unknown-route');

      expect(response.status).toBe(404);
    });
  });
});

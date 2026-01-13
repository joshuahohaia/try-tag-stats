import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { initializeSchema } from './database/index.js';
import { apiRouter } from './routes/index.js';

// Initialize database
initializeSchema();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// API info endpoint
app.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Try Tag Stats API',
      version: '1.0.0',
      endpoints: {
        health: '/api/v1/health',
        regions: '/api/v1/regions',
        leagues: '/api/v1/leagues',
        divisions: '/api/v1/divisions',
        teams: '/api/v1/teams',
        fixtures: '/api/v1/fixtures',
      },
    },
  });
});

// API routes
app.use('/api/v1', apiRouter);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

export { app };

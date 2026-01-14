import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

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

  // Serve frontend static files in production
  if (config.nodeEnv === 'production') {
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));

    // Handle SPA routing - serve index.html for all non-API routes
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

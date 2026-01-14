import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { initializeSchema } from './database/index.js';
import { createApp } from './app.js';

// Initialize database
initializeSchema();

// Create and start the app
const app = createApp();

app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

export { app };

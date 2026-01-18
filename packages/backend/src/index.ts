import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create and start the app
const app = createApp({
  staticPath: path.join(__dirname, '../../frontend/dist'),
});

app.listen(env.port, () => {
  logger.info(`Server running on http://localhost:${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
});

export { app };

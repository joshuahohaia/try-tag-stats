import { createClient, Client } from '@libsql/client';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let client: Client | null = null;

export function getDatabase(): Client {
  if (!client) {
    logger.info(`Connecting to Turso database at ${config.turso.databaseUrl}`);

    client = createClient({
      url: config.turso.databaseUrl,
      authToken: config.turso.authToken,
    });

    logger.info('Database connected successfully');
  }
  return client;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    client.close();
    client = null;
    logger.info('Database connection closed');
  }
}

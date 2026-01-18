import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(env.databaseUrl);
export const db = drizzle(client, { schema, logger: env.nodeEnv === 'development' });
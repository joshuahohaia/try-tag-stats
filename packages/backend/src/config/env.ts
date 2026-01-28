import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  cronSecret: process.env.CRON_SECRET || '',
  turso: {
    databaseUrl: process.env.TURSO_DATABASE_URL || 'file:./data/trytag.db',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  },
  scraper: {
    baseUrl: process.env.SCRAPER_BASE_URL || 'https://trytagrugby.spawtz.com',
    rateLimit: parseInt(process.env.SCRAPER_RATE_LIMIT || '5', 10),
    timeout: parseInt(process.env.SCRAPER_TIMEOUT || '30000', 10),
  },
} as const;

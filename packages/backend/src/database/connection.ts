import { createClient, Client } from '@libsql/client';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let client: Client | null = null;

const RETRY_DELAYS_MS = [200, 1000, 3000];

/** True for dropped or reset network connections. Auth, schema and SQL errors are not transient. */
export function isTransientConnectionError(err: unknown): boolean {
  const e = err as { message?: string; code?: string; cause?: { message?: string; code?: string } } | null;
  const text = [e?.message, e?.code, e?.cause?.message, e?.cause?.code].filter(Boolean).join(' ');
  return /fetch failed|other side closed|ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|UND_ERR_SOCKET/i.test(text);
}

export async function retryTransient<T>(fn: () => Promise<T>, delays: number[] = RETRY_DELAYS_MS): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= delays.length || !isTransientConnectionError(err)) throw err;
      logger.warn({ attempt: attempt + 1 }, 'Database connection error on a read, retrying');
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

function isReadStatement(stmt: unknown): boolean {
  const sql = typeof stmt === 'string' ? stmt : (stmt as { sql?: string } | null)?.sql ?? '';
  return /^\s*(SELECT|PRAGMA\s+table_info)\b/i.test(sql);
}

const IDLE_REFRESH_MS = 5000;

/**
 * Retries only plain SELECT statements on dropped connections. Writes and batches are
 * never replayed: a dropped connection can still mean the write committed.
 * After an idle gap (for example a long scrape between writes) a cheap SELECT 1 runs
 * first, with the same retry, so the write itself is less likely to hit a dead connection.
 */
export function retryReads(base: Client, idleRefreshMs: number = IDLE_REFRESH_MS, delays?: number[]): Client {
  const execute = base.execute.bind(base);
  let lastUsed = Date.now();
  base.execute = (async (...args: Parameters<Client['execute']>) => {
    if (Date.now() - lastUsed > idleRefreshMs) {
      try {
        await retryTransient(() => execute('SELECT 1'), delays);
      } catch {
        // the real statement below reports any lasting problem
      }
    }
    try {
      return isReadStatement(args[0]) ? await retryTransient(() => execute(...args), delays) : await execute(...args);
    } finally {
      lastUsed = Date.now();
    }
  }) as Client['execute'];
  return base;
}

export function getDatabase(): Client {
  if (!client) {
    logger.info(`Connecting to Turso database at ${config.turso.databaseUrl}`);

    client = retryReads(
      createClient({
        url: config.turso.databaseUrl,
        authToken: config.turso.authToken,
      })
    );

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

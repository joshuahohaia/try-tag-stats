import { getDatabase } from '../connection.js';

export interface SyncStatus {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastAttemptStatus: 'running' | 'success' | 'failed' | null;
}

const JOB_TYPE = 'full_sync';

export const syncRunRepository = {
  async start(): Promise<number> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `INSERT INTO scrape_jobs (job_type, status, started_at)
            VALUES (?, 'running', CURRENT_TIMESTAMP) RETURNING id`,
      args: [JOB_TYPE],
    });
    return Number(result.rows[0].id);
  },

  async finish(id: number, success: boolean, itemsProcessed: number, errorMessage?: string): Promise<void> {
    const db = getDatabase();
    await db.execute({
      sql: `UPDATE scrape_jobs
            SET status = ?, completed_at = CURRENT_TIMESTAMP, items_processed = ?, error_message = ?
            WHERE id = ?`,
      args: [success ? 'success' : 'failed', itemsProcessed, errorMessage ?? null, id],
    });
  },

  async status(): Promise<SyncStatus> {
    const db = getDatabase();
    const ok = await db.execute({
      sql: `SELECT completed_at FROM scrape_jobs
            WHERE job_type = ? AND status = 'success' ORDER BY id DESC LIMIT 1`,
      args: [JOB_TYPE],
    });
    const last = await db.execute({
      sql: `SELECT started_at, status FROM scrape_jobs WHERE job_type = ? ORDER BY id DESC LIMIT 1`,
      args: [JOB_TYPE],
    });
    const toIso = (v: unknown) => (v ? `${String(v).replace(' ', 'T')}Z` : null);
    return {
      lastSuccessAt: toIso(ok.rows[0]?.completed_at),
      lastAttemptAt: toIso(last.rows[0]?.started_at),
      lastAttemptStatus: (last.rows[0]?.status as SyncStatus['lastAttemptStatus']) ?? null,
    };
  },
};

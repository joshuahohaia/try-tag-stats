import { getDatabase } from '../connection.js';
import type { Division } from '@trytag/shared';
import type { Row } from '@libsql/client';

function rowToDivision(row: Row): Division {
  return {
    id: row.id as number,
    externalDivisionId: row.external_division_id as number,
    leagueId: row.league_id as number,
    seasonId: row.season_id as number,
    name: row.name as string,
    tier: row.tier as number | null,
    phaseId: (row.phase_id as number | null) ?? null,
    phaseName: (row.phase_name as string | null) ?? null,
  };
}

export const divisionRepository = {
  async countActive(): Promise<number> {
    const db = getDatabase();
    const result = await db.execute('SELECT COUNT(*) AS n FROM divisions WHERE is_active = 1');
    return Number(result.rows[0]?.n ?? 0);
  },

  /**
   * Reversible: hides divisions that the latest complete sync did not see.
   * Rows, standings, fixtures and history are kept; a later sync that sees
   * the division again sets is_active back to 1.
   */
  async markUnseenInactive(syncStartedAtIso: string): Promise<number> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `UPDATE divisions SET is_active = 0
            WHERE is_active = 1 AND (last_seen_at IS NULL OR last_seen_at < ?)`,
      args: [syncStartedAtIso],
    });
    return result.rowsAffected;
  },

  async findAll(): Promise<Division[]> {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM divisions ORDER BY name');
    return result.rows.map(rowToDivision);
  },

  async findById(id: number): Promise<Division | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM divisions WHERE id = ?',
      args: [id],
    });
    return result.rows[0] ? rowToDivision(result.rows[0]) : null;
  },

  async findByIds(ids: number[]): Promise<Division[]> {
    if (ids.length === 0) return [];
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.execute({
      sql: `SELECT * FROM divisions WHERE id IN (${placeholders})`,
      args: ids,
    });
    return result.rows.map(rowToDivision);
  },

  async findByLeagueAndSeason(leagueId: number, seasonId: number): Promise<Division[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM divisions WHERE league_id = ? AND season_id = ? ORDER BY COALESCE(phase_id, 0), tier, name',
      args: [leagueId, seasonId],
    });
    return result.rows.map(rowToDivision);
  },

  async findByExternalId(externalDivisionId: number, leagueId: number, seasonId: number): Promise<Division | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM divisions WHERE external_division_id = ? AND league_id = ? AND season_id = ?',
      args: [externalDivisionId, leagueId, seasonId],
    });
    return result.rows[0] ? rowToDivision(result.rows[0]) : null;
  },

  async upsert(data: {
    externalDivisionId: number;
    leagueId: number;
    seasonId: number;
    name: string;
    tier?: number;
    phaseId?: number | null;
    phaseName?: string | null;
  }): Promise<Division> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        INSERT INTO divisions (external_division_id, league_id, season_id, name, tier, phase_id, phase_name, is_active, last_seen_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(external_division_id, league_id, season_id) DO UPDATE SET
          name = excluded.name,
          tier = excluded.tier,
          phase_id = COALESCE(excluded.phase_id, phase_id),
          phase_name = COALESCE(excluded.phase_name, phase_name),
          is_active = 1,
          last_seen_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      args: [
        data.externalDivisionId,
        data.leagueId,
        data.seasonId,
        data.name,
        data.tier ?? null,
        data.phaseId ?? null,
        data.phaseName ?? null,
      ],
    });
    return rowToDivision(result.rows[0]);
  },

  async updateLastScraped(id: number): Promise<void> {
    const db = getDatabase();
    await db.execute({
      sql: 'UPDATE divisions SET last_scraped_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [id],
    });
  },
};

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
  };
}

export const divisionRepository = {
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
      sql: 'SELECT * FROM divisions WHERE league_id = ? AND season_id = ? ORDER BY tier, name',
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
  }): Promise<Division> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        INSERT INTO divisions (external_division_id, league_id, season_id, name, tier, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(external_division_id, league_id, season_id) DO UPDATE SET
          name = excluded.name,
          tier = excluded.tier,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      args: [
        data.externalDivisionId,
        data.leagueId,
        data.seasonId,
        data.name,
        data.tier ?? null,
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
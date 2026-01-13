import { getDatabase } from '../connection.js';
import type { Division } from '@trytag/shared';

interface DivisionRow {
  id: number;
  external_division_id: number;
  league_id: number;
  season_id: number;
  name: string;
  tier: number | null;
  created_at: string;
  updated_at: string;
  last_scraped_at: string | null;
}

function rowToDivision(row: DivisionRow): Division {
  return {
    id: row.id,
    externalDivisionId: row.external_division_id,
    leagueId: row.league_id,
    seasonId: row.season_id,
    name: row.name,
    tier: row.tier,
  };
}

export const divisionRepository = {
  findAll(): Division[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM divisions ORDER BY name').all() as DivisionRow[];
    return rows.map(rowToDivision);
  },

  findById(id: number): Division | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM divisions WHERE id = ?').get(id) as DivisionRow | undefined;
    return row ? rowToDivision(row) : null;
  },

  findByLeagueAndSeason(leagueId: number, seasonId: number): Division[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM divisions WHERE league_id = ? AND season_id = ? ORDER BY tier, name')
      .all(leagueId, seasonId) as DivisionRow[];
    return rows.map(rowToDivision);
  },

  findByExternalId(externalDivisionId: number, leagueId: number, seasonId: number): Division | null {
    const db = getDatabase();
    const row = db
      .prepare(
        'SELECT * FROM divisions WHERE external_division_id = ? AND league_id = ? AND season_id = ?'
      )
      .get(externalDivisionId, leagueId, seasonId) as DivisionRow | undefined;
    return row ? rowToDivision(row) : null;
  },

  upsert(data: {
    externalDivisionId: number;
    leagueId: number;
    seasonId: number;
    name: string;
    tier?: number;
  }): Division {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO divisions (external_division_id, league_id, season_id, name, tier, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(external_division_id, league_id, season_id) DO UPDATE SET
        name = excluded.name,
        tier = excluded.tier,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    const row = stmt.get(
      data.externalDivisionId,
      data.leagueId,
      data.seasonId,
      data.name,
      data.tier ?? null
    ) as DivisionRow;
    return rowToDivision(row);
  },

  updateLastScraped(id: number): void {
    const db = getDatabase();
    db.prepare('UPDATE divisions SET last_scraped_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  },
};

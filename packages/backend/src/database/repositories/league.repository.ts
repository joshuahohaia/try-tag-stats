import { getDatabase } from '../connection.js';
import type { League } from '@trytag/shared';

interface LeagueRow {
  id: number;
  external_league_id: number;
  name: string;
  region_id: number | null;
  venue_name: string | null;
  day_of_week: string | null;
  format: string | null;
  created_at: string;
  updated_at: string;
}

function rowToLeague(row: LeagueRow): League {
  return {
    id: row.id,
    externalLeagueId: row.external_league_id,
    name: row.name,
    regionId: row.region_id ?? 0,
    venueName: row.venue_name,
    dayOfWeek: row.day_of_week,
    format: row.format,
  };
}

export const leagueRepository = {
  findAll(): League[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM leagues ORDER BY name').all() as LeagueRow[];
    return rows.map(rowToLeague);
  },

  findByRegion(regionId: number): League[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM leagues WHERE region_id = ? ORDER BY name')
      .all(regionId) as LeagueRow[];
    return rows.map(rowToLeague);
  },

  findById(id: number): League | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM leagues WHERE id = ?').get(id) as LeagueRow | undefined;
    return row ? rowToLeague(row) : null;
  },

  findByExternalId(externalLeagueId: number): League | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM leagues WHERE external_league_id = ?')
      .get(externalLeagueId) as LeagueRow | undefined;
    return row ? rowToLeague(row) : null;
  },

  upsert(data: {
    externalLeagueId: number;
    name: string;
    regionId?: number;
    venueName?: string;
    dayOfWeek?: string;
    format?: string;
  }): League {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO leagues (external_league_id, name, region_id, venue_name, day_of_week, format, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(external_league_id) DO UPDATE SET
        name = excluded.name,
        region_id = excluded.region_id,
        venue_name = excluded.venue_name,
        day_of_week = excluded.day_of_week,
        format = excluded.format,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    const row = stmt.get(
      data.externalLeagueId,
      data.name,
      data.regionId ?? null,
      data.venueName ?? null,
      data.dayOfWeek ?? null,
      data.format ?? null
    ) as LeagueRow;
    return rowToLeague(row);
  },
};

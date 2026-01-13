import { getDatabase } from '../connection.js';
import type { Season } from '@trytag/shared';

interface SeasonRow {
  id: number;
  external_season_id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: number;
  created_at: string;
  updated_at: string;
}

function rowToSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    externalSeasonId: row.external_season_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isCurrent: row.is_current === 1,
  };
}

export const seasonRepository = {
  findAll(): Season[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM seasons ORDER BY name DESC').all() as SeasonRow[];
    return rows.map(rowToSeason);
  },

  findById(id: number): Season | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM seasons WHERE id = ?').get(id) as SeasonRow | undefined;
    return row ? rowToSeason(row) : null;
  },

  findByExternalId(externalSeasonId: number): Season | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM seasons WHERE external_season_id = ?')
      .get(externalSeasonId) as SeasonRow | undefined;
    return row ? rowToSeason(row) : null;
  },

  findCurrent(): Season | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM seasons WHERE is_current = 1').get() as
      | SeasonRow
      | undefined;
    return row ? rowToSeason(row) : null;
  },

  upsert(data: { externalSeasonId: number; name: string; isCurrent?: boolean }): Season {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO seasons (external_season_id, name, is_current, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(external_season_id) DO UPDATE SET
        name = excluded.name,
        is_current = excluded.is_current,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    const row = stmt.get(data.externalSeasonId, data.name, data.isCurrent ? 1 : 0) as SeasonRow;
    return rowToSeason(row);
  },

  setCurrent(id: number): void {
    const db = getDatabase();
    db.prepare('UPDATE seasons SET is_current = 0').run();
    db.prepare('UPDATE seasons SET is_current = 1 WHERE id = ?').run(id);
  },
};

import { getDatabase } from '../connection.js';
import type { Season } from '@trytag/shared';
import type { Row } from '@libsql/client';

function rowToSeason(row: Row): Season {
  return {
    id: row.id as number,
    externalSeasonId: row.external_season_id as number,
    name: row.name as string,
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    isCurrent: row.is_current === 1,
  };
}

export const seasonRepository = {
  async findAll(): Promise<Season[]> {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM seasons ORDER BY name DESC');
    return result.rows.map(rowToSeason);
  },

  async findById(id: number): Promise<Season | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM seasons WHERE id = ?',
      args: [id],
    });
    return result.rows[0] ? rowToSeason(result.rows[0]) : null;
  },

  async findByExternalId(externalSeasonId: number): Promise<Season | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM seasons WHERE external_season_id = ?',
      args: [externalSeasonId],
    });
    return result.rows[0] ? rowToSeason(result.rows[0]) : null;
  },

  async findCurrent(): Promise<Season | null> {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM seasons WHERE is_current = 1');
    return result.rows[0] ? rowToSeason(result.rows[0]) : null;
  },

  async upsert(data: { externalSeasonId: number; name: string; isCurrent?: boolean }): Promise<Season> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        INSERT INTO seasons (external_season_id, name, is_current, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(external_season_id) DO UPDATE SET
          name = excluded.name,
          is_current = excluded.is_current,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      args: [data.externalSeasonId, data.name, data.isCurrent ? 1 : 0],
    });
    return rowToSeason(result.rows[0]);
  },

  async setCurrent(id: number): Promise<void> {
    const db = getDatabase();
    await db.batch([
      'UPDATE seasons SET is_current = 0',
      { sql: 'UPDATE seasons SET is_current = 1 WHERE id = ?', args: [id] },
    ]);
  },
};

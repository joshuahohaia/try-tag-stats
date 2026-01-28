import { getDatabase } from '../connection.js';
import type { Region } from '@trytag/shared';
import type { Row } from '@libsql/client';

interface RegionRow {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

function rowToRegion(row: Row): Region {
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
  };
}

export const regionRepository = {
  async findAll(): Promise<Region[]> {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM regions ORDER BY name');
    return result.rows.map(rowToRegion);
  },

  async findById(id: number): Promise<Region | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM regions WHERE id = ?',
      args: [id],
    });
    return result.rows[0] ? rowToRegion(result.rows[0]) : null;
  },

  async findBySlug(slug: string): Promise<Region | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM regions WHERE slug = ?',
      args: [slug],
    });
    return result.rows[0] ? rowToRegion(result.rows[0]) : null;
  },

  async upsert(name: string, slug: string): Promise<Region> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        INSERT INTO regions (name, slug, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(name) DO UPDATE SET
          slug = excluded.slug,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      args: [name, slug],
    });
    return rowToRegion(result.rows[0]);
  },
};

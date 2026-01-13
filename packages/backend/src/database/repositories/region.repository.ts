import { getDatabase } from '../connection.js';
import type { Region } from '@trytag/shared';

interface RegionRow {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

function rowToRegion(row: RegionRow): Region {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

export const regionRepository = {
  findAll(): Region[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM regions ORDER BY name').all() as RegionRow[];
    return rows.map(rowToRegion);
  },

  findById(id: number): Region | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM regions WHERE id = ?').get(id) as RegionRow | undefined;
    return row ? rowToRegion(row) : null;
  },

  findBySlug(slug: string): Region | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM regions WHERE slug = ?').get(slug) as RegionRow | undefined;
    return row ? rowToRegion(row) : null;
  },

  upsert(name: string, slug: string): Region {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO regions (name, slug, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(name) DO UPDATE SET
        slug = excluded.slug,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    const row = stmt.get(name, slug) as RegionRow;
    return rowToRegion(row);
  },
};

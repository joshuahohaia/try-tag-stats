import { getDatabase } from '../connection.js';
import type { Team } from '@trytag/shared';

interface TeamRow {
  id: number;
  external_team_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    externalTeamId: row.external_team_id,
    name: row.name,
  };
}

export const teamRepository = {
  findAll(): Team[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM teams ORDER BY name').all() as TeamRow[];
    return rows.map(rowToTeam);
  },

  findById(id: number): Team | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as TeamRow | undefined;
    return row ? rowToTeam(row) : null;
  },

  findByExternalId(externalTeamId: number): Team | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM teams WHERE external_team_id = ?')
      .get(externalTeamId) as TeamRow | undefined;
    return row ? rowToTeam(row) : null;
  },

  findByIds(ids: number[]): Team[] {
    if (ids.length === 0) return [];
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const rows = db
      .prepare(`SELECT * FROM teams WHERE id IN (${placeholders}) ORDER BY name`)
      .all(...ids) as TeamRow[];
    return rows.map(rowToTeam);
  },

  findByDivision(divisionId: number): Team[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT t.* FROM teams t
        INNER JOIN team_divisions td ON t.id = td.team_id
        WHERE td.division_id = ?
        ORDER BY t.name
      `
      )
      .all(divisionId) as TeamRow[];
    return rows.map(rowToTeam);
  },

  upsert(externalTeamId: number, name: string): Team {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO teams (external_team_id, name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(external_team_id) DO UPDATE SET
        name = excluded.name,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    const row = stmt.get(externalTeamId, name) as TeamRow;
    return rowToTeam(row);
  },

  linkToDivision(teamId: number, divisionId: number): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR IGNORE INTO team_divisions (team_id, division_id)
      VALUES (?, ?)
    `).run(teamId, divisionId);
  },
};

import { getDatabase } from '../connection.js';
import type { Team } from '@trytag/shared';
import type { Row } from '@libsql/client';

function rowToTeam(row: Row): Team {
  return {
    id: row.id as number,
    externalTeamId: row.external_team_id as number,
    name: row.name as string,
  };
}

export const teamRepository = {
  async findAll(): Promise<Team[]> {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM teams ORDER BY name');
    return result.rows.map(rowToTeam);
  },

  async findById(id: number): Promise<Team | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM teams WHERE id = ?',
      args: [id],
    });
    return result.rows[0] ? rowToTeam(result.rows[0]) : null;
  },

  async findByExternalId(externalTeamId: number): Promise<Team | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM teams WHERE external_team_id = ?',
      args: [externalTeamId],
    });
    return result.rows[0] ? rowToTeam(result.rows[0]) : null;
  },

  async findByName(name: string): Promise<Team | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM teams WHERE name = ?',
      args: [name],
    });
    return result.rows[0] ? rowToTeam(result.rows[0]) : null;
  },

  async findByIds(ids: number[]): Promise<Team[]> {
    if (ids.length === 0) return [];
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.execute({
      sql: `SELECT * FROM teams WHERE id IN (${placeholders}) ORDER BY name`,
      args: ids,
    });
    return result.rows.map(rowToTeam);
  },

  async findByDivision(divisionId: number): Promise<Team[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        SELECT t.* FROM teams t
        INNER JOIN team_divisions td ON t.id = td.team_id
        WHERE td.division_id = ?
        ORDER BY t.name
      `,
      args: [divisionId],
    });
    return result.rows.map(rowToTeam);
  },

  async upsert(externalTeamId: number, name: string): Promise<Team> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        INSERT INTO teams (external_team_id, name, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(external_team_id) DO UPDATE SET
          name = excluded.name,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      args: [externalTeamId, name],
    });
    return rowToTeam(result.rows[0]);
  },

  async linkToDivision(teamId: number, divisionId: number): Promise<void> {
    const db = getDatabase();
    await db.execute({
      sql: `
        INSERT OR IGNORE INTO team_divisions (team_id, division_id)
        VALUES (?, ?)
      `,
      args: [teamId, divisionId],
    });
  },
};

import { getDatabase } from '../connection.js';

export interface TeamKit {
  teamId: number;
  primary: string;
  secondary: string;
  updatedAt: string;
  version: number;
}

function toKit(r: Record<string, unknown>): TeamKit {
  return {
    teamId: Number(r.team_id),
    primary: String(r.primary_colour),
    secondary: String(r.secondary_colour),
    updatedAt: String(r.updated_at),
    version: Number(r.version),
  };
}

export type WriteResult = { ok: true; kit: TeamKit | null } | { ok: false; current: TeamKit | null };

export const teamKitRepository = {
  async findAll(): Promise<TeamKit[]> {
    const res = await getDatabase().execute('SELECT * FROM team_kits ORDER BY team_id');
    return res.rows.map((r) => toKit(r as unknown as Record<string, unknown>));
  },

  async findByTeamId(teamId: number): Promise<TeamKit | null> {
    const res = await getDatabase().execute({
      sql: 'SELECT * FROM team_kits WHERE team_id = ?',
      args: [teamId],
    });
    return res.rows[0] ? toKit(res.rows[0] as unknown as Record<string, unknown>) : null;
  },

  /**
   * Compare-and-set. expectedVersion is the version the editor last saw (null = no kit saved yet).
   * The check and the write are one statement, so two concurrent edits cannot both win.
   */
  async save(teamId: number, primary: string, secondary: string, expectedVersion: number | null): Promise<WriteResult> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const res =
      expectedVersion === null
        ? await db.execute({
            sql: `INSERT INTO team_kits (team_id, primary_colour, secondary_colour, updated_at, version)
                  VALUES (?, ?, ?, ?, 1) ON CONFLICT(team_id) DO NOTHING`,
            args: [teamId, primary, secondary, now],
          })
        : await db.execute({
            sql: `UPDATE team_kits SET primary_colour = ?, secondary_colour = ?, updated_at = ?, version = version + 1
                  WHERE team_id = ? AND version = ?`,
            args: [primary, secondary, now, teamId, expectedVersion],
          });
    if (res.rowsAffected === 0) return { ok: false, current: await this.findByTeamId(teamId) };
    return { ok: true, kit: await this.findByTeamId(teamId) };
  },

  /** Reset to generated colours (deletes the row), only if the version still matches. */
  async reset(teamId: number, expectedVersion: number): Promise<WriteResult> {
    const res = await getDatabase().execute({
      sql: 'DELETE FROM team_kits WHERE team_id = ? AND version = ?',
      args: [teamId, expectedVersion],
    });
    if (res.rowsAffected === 0) return { ok: false, current: await this.findByTeamId(teamId) };
    return { ok: true, kit: null };
  },
};

import { getDatabase } from '../connection.js';
import type { League, LeagueSummary } from '@trytag/shared';
import type { Row } from '@libsql/client';

function rowToLeague(row: Row): League {
  return {
    id: row.id as number,
    externalLeagueId: row.external_league_id as number,
    name: row.name as string,
    regionId: (row.region_id as number | null) ?? 0,
    venueName: row.venue_name as string | null,
    dayOfWeek: row.day_of_week as string | null,
    format: row.format as string | null,
  };
}

export const leagueRepository = {
  async findAll(): Promise<League[]> {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM leagues ORDER BY name');
    return result.rows.map(rowToLeague);
  },

  async findByRegion(regionId: number): Promise<League[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM leagues WHERE region_id = ? ORDER BY name',
      args: [regionId],
    });
    return result.rows.map(rowToLeague);
  },

  async findById(id: number): Promise<League | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM leagues WHERE id = ?',
      args: [id],
    });
    return result.rows[0] ? rowToLeague(result.rows[0]) : null;
  },

  async findByExternalId(externalLeagueId: number): Promise<League | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM leagues WHERE external_league_id = ?',
      args: [externalLeagueId],
    });
    return result.rows[0] ? rowToLeague(result.rows[0]) : null;
  },

  async upsert(data: {
    externalLeagueId: number;
    name: string;
    regionId?: number;
    venueName?: string;
    dayOfWeek?: string;
    format?: string;
  }): Promise<League> {
    const db = getDatabase();
    // Clean up name - remove trailing/leading dashes and spaces (e.g., " - -")
    // Include various dash characters: hyphen (-), en-dash (–), em-dash (—)
    const cleanName = data.name.replace(/[\s\-–—]+$/g, '').replace(/^[\s\-–—]+/g, '').trim();
    const result = await db.execute({
      sql: `
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
      `,
      args: [
        data.externalLeagueId,
        cleanName,
        data.regionId ?? null,
        data.venueName ?? null,
        data.dayOfWeek ?? null,
        data.format ?? null,
      ],
    });
    return rowToLeague(result.rows[0]);
  },

  async findAllWithSummary(regionId?: number): Promise<LeagueSummary[]> {
    const db = getDatabase();
    const regionFilter = regionId ? 'WHERE l.region_id = ?' : '';
    const args = regionId ? [regionId] : [];

    const result = await db.execute({
      sql: `
        SELECT
          l.*,
          COALESCE((
            SELECT COUNT(DISTINCT s.team_id)
            FROM standings s
            JOIN divisions d ON s.division_id = d.id
            JOIN seasons se ON d.season_id = se.id
            WHERE d.league_id = l.id AND se.is_current = 1
          ), 0) as team_count,
          (
            SELECT t.name
            FROM standings s
            JOIN divisions d ON s.division_id = d.id
            JOIN seasons se ON d.season_id = se.id
            JOIN teams t ON s.team_id = t.id
            WHERE d.league_id = l.id AND se.is_current = 1 AND s.position = 1
            LIMIT 1
          ) as leader_team_name,
          COALESCE((
            SELECT COUNT(*)
            FROM fixtures f
            JOIN divisions d ON f.division_id = d.id
            JOIN seasons se ON d.season_id = se.id
            WHERE d.league_id = l.id AND se.is_current = 1 AND f.status = 'completed'
          ), 0) as fixtures_played,
          COALESCE((
            SELECT COUNT(*)
            FROM fixtures f
            JOIN divisions d ON f.division_id = d.id
            JOIN seasons se ON d.season_id = se.id
            WHERE d.league_id = l.id AND se.is_current = 1 AND f.status = 'scheduled'
          ), 0) as fixtures_remaining,
          (
            SELECT MIN(f.fixture_date)
            FROM fixtures f
            JOIN divisions d ON f.division_id = d.id
            JOIN seasons se ON d.season_id = se.id
            WHERE d.league_id = l.id AND se.is_current = 1 AND f.status = 'scheduled' AND f.fixture_date >= date('now')
          ) as next_fixture_date
        FROM leagues l
        ${regionFilter}
        ORDER BY l.name
      `,
      args,
    });

    return result.rows.map((row): LeagueSummary => ({
      ...rowToLeague(row),
      teamCount: row.team_count as number,
      leaderTeamName: row.leader_team_name as string | null,
      fixturesPlayed: row.fixtures_played as number,
      fixturesRemaining: row.fixtures_remaining as number,
      nextFixtureDate: row.next_fixture_date as string | null,
    }));
  },
};

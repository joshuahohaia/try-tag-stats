import { getDatabase } from '../connection.js';
import type { Fixture, FixtureWithTeams, Team, FixtureStatus } from '@trytag/shared';
import type { Row } from '@libsql/client';

function rowToFixture(row: Row): Fixture {
  return {
    id: row.id as number,
    externalFixtureId: row.external_fixture_id as number | null,
    divisionId: row.division_id as number,
    homeTeamId: row.home_team_id as number,
    awayTeamId: row.away_team_id as number,
    fixtureDate: row.fixture_date as string,
    fixtureTime: row.fixture_time as string | null,
    pitch: row.pitch as string | null,
    roundNumber: row.round_number as number | null,
    homeScore: row.home_score as number | null,
    awayScore: row.away_score as number | null,
    status: row.status as FixtureStatus,
    isForfeit: row.is_forfeit === 1,
  };
}

function rowToFixtureWithTeams(row: Row): FixtureWithTeams {
  const homeTeam: Team = {
    id: row.home_team_id as number,
    externalTeamId: row.home_team_external_id as number,
    name: row.home_team_name as string,
  };
  const awayTeam: Team = {
    id: row.away_team_id as number,
    externalTeamId: row.away_team_external_id as number,
    name: row.away_team_name as string,
  };
  return {
    ...rowToFixture(row),
    homeTeam,
    awayTeam,
  };
}

export const fixtureRepository = {
  async findByDivision(divisionId: number): Promise<FixtureWithTeams[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        SELECT f.*,
          ht.name as home_team_name, ht.external_team_id as home_team_external_id,
          at.name as away_team_name, at.external_team_id as away_team_external_id
        FROM fixtures f
        INNER JOIN teams ht ON f.home_team_id = ht.id
        INNER JOIN teams at ON f.away_team_id = at.id
        WHERE f.division_id = ?
        ORDER BY f.fixture_date, CASE WHEN f.fixture_time IS NULL THEN 1 ELSE 0 END, f.fixture_time
      `,
      args: [divisionId],
    });
    return result.rows.map(rowToFixtureWithTeams);
  },

  async findByTeam(teamId: number): Promise<FixtureWithTeams[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        SELECT f.*,
          ht.name as home_team_name, ht.external_team_id as home_team_external_id,
          at.name as away_team_name, at.external_team_id as away_team_external_id
        FROM fixtures f
        INNER JOIN teams ht ON f.home_team_id = ht.id
        INNER JOIN teams at ON f.away_team_id = at.id
        WHERE f.home_team_id = ? OR f.away_team_id = ?
        ORDER BY f.fixture_date DESC, CASE WHEN f.fixture_time IS NULL THEN 1 ELSE 0 END, f.fixture_time DESC
      `,
      args: [teamId, teamId],
    });
    return result.rows.map(rowToFixtureWithTeams);
  },

  async findById(id: number): Promise<FixtureWithTeams | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        SELECT f.*,
          ht.name as home_team_name, ht.external_team_id as home_team_external_id,
          at.name as away_team_name, at.external_team_id as away_team_external_id
        FROM fixtures f
        INNER JOIN teams ht ON f.home_team_id = ht.id
        INNER JOIN teams at ON f.away_team_id = at.id
        WHERE f.id = ?
      `,
      args: [id],
    });
    return result.rows[0] ? rowToFixtureWithTeams(result.rows[0]) : null;
  },

  async findByTeamsAndDate(
    teamId1: number,
    teamId2: number,
    date: string
  ): Promise<FixtureWithTeams | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        SELECT f.*,
          ht.name as home_team_name, ht.external_team_id as home_team_external_id,
          at.name as away_team_name, at.external_team_id as away_team_external_id
        FROM fixtures f
        INNER JOIN teams ht ON f.home_team_id = ht.id
        INNER JOIN teams at ON f.away_team_id = at.id
        WHERE f.fixture_date = ?
          AND ((f.home_team_id = ? AND f.away_team_id = ?)
            OR (f.home_team_id = ? AND f.away_team_id = ?))
        LIMIT 1
      `,
      args: [date, teamId1, teamId2, teamId2, teamId1],
    });
    return result.rows[0] ? rowToFixtureWithTeams(result.rows[0]) : null;
  },

  async findHeadToHead(
    homeTeamId: number,
    awayTeamId: number,
    limit = 5
  ): Promise<FixtureWithTeams[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        SELECT f.*,
          ht.name as home_team_name, ht.external_team_id as home_team_external_id,
          at.name as away_team_name, at.external_team_id as away_team_external_id
        FROM fixtures f
        INNER JOIN teams ht ON f.home_team_id = ht.id
        INNER JOIN teams at ON f.away_team_id = at.id
        WHERE f.home_score IS NOT NULL
          AND f.away_score IS NOT NULL
          AND ((f.home_team_id = ? AND f.away_team_id = ?)
            OR (f.home_team_id = ? AND f.away_team_id = ?))
        ORDER BY f.fixture_date DESC
        LIMIT ?
      `,
      args: [homeTeamId, awayTeamId, awayTeamId, homeTeamId, limit],
    });
    return result.rows.map(rowToFixtureWithTeams);
  },

  async findUpcoming(teamId?: number, limit = 10): Promise<FixtureWithTeams[]> {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    let sql = `
      SELECT f.*,
        ht.name as home_team_name, ht.external_team_id as home_team_external_id,
        at.name as away_team_name, at.external_team_id as away_team_external_id
      FROM fixtures f
      INNER JOIN teams ht ON f.home_team_id = ht.id
      INNER JOIN teams at ON f.away_team_id = at.id
      WHERE f.fixture_date >= ? AND f.status = 'scheduled'
    `;

    const args: (string | number)[] = [today];

    if (teamId) {
      sql += ' AND (f.home_team_id = ? OR f.away_team_id = ?)';
      args.push(teamId, teamId);
    }

    sql +=
      ' ORDER BY f.fixture_date, CASE WHEN f.fixture_time IS NULL THEN 1 ELSE 0 END, f.fixture_time LIMIT ?';
    args.push(limit);

    const result = await db.execute({ sql, args });
    return result.rows.map(rowToFixtureWithTeams);
  },

  async findRecent(teamId?: number, limit = 10): Promise<FixtureWithTeams[]> {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    let sql = `
      SELECT f.*,
        ht.name as home_team_name, ht.external_team_id as home_team_external_id,
        at.name as away_team_name, at.external_team_id as away_team_external_id
      FROM fixtures f
      INNER JOIN teams ht ON f.home_team_id = ht.id
      INNER JOIN teams at ON f.away_team_id = at.id
      WHERE f.fixture_date <= ?
    `;

    const args: (string | number)[] = [today];

    if (teamId) {
      sql += ' AND (f.home_team_id = ? OR f.away_team_id = ?)';
      args.push(teamId, teamId);
    }

    sql +=
      " ORDER BY f.fixture_date DESC, CASE WHEN f.fixture_time IS NULL THEN 1 ELSE 0 END, f.fixture_time DESC LIMIT ?";
    args.push(limit);

    const result = await db.execute({ sql, args });
    return result.rows.map(rowToFixtureWithTeams);
  },

  async findUpcomingByTeams(teamIds: number[], limit = 50): Promise<FixtureWithTeams[]> {
    if (teamIds.length === 0) return [];

    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const placeholders = teamIds.map(() => '?').join(',');

    const sql = `
      SELECT f.*,
        ht.name as home_team_name, ht.external_team_id as home_team_external_id,
        at.name as away_team_name, at.external_team_id as away_team_external_id
      FROM fixtures f
      INNER JOIN teams ht ON f.home_team_id = ht.id
      INNER JOIN teams at ON f.away_team_id = at.id
      WHERE f.fixture_date >= ? AND f.status = 'scheduled'
      AND (f.home_team_id IN (${placeholders}) OR f.away_team_id IN (${placeholders}))
      ORDER BY f.fixture_date, CASE WHEN f.fixture_time IS NULL THEN 1 ELSE 0 END, f.fixture_time LIMIT ?
    `;

    const args: (string | number)[] = [today, ...teamIds, ...teamIds, limit];

    const result = await db.execute({ sql, args });
    return result.rows.map(rowToFixtureWithTeams);
  },

  async findRecentByTeams(teamIds: number[], limit = 50): Promise<FixtureWithTeams[]> {
    if (teamIds.length === 0) return [];

    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const placeholders = teamIds.map(() => '?').join(',');

    const sql = `
      SELECT f.*,
        ht.name as home_team_name, ht.external_team_id as home_team_external_id,
        at.name as away_team_name, at.external_team_id as away_team_external_id
      FROM fixtures f
      INNER JOIN teams ht ON f.home_team_id = ht.id
      INNER JOIN teams at ON f.away_team_id = at.id
      WHERE f.fixture_date <= ?
      AND (f.home_team_id IN (${placeholders}) OR f.away_team_id IN (${placeholders}))
      ORDER BY f.fixture_date DESC, CASE WHEN f.fixture_time IS NULL THEN 1 ELSE 0 END, f.fixture_time DESC LIMIT ?
    `;

    const args: (string | number)[] = [today, ...teamIds, ...teamIds, limit];

    const result = await db.execute({ sql, args });
    return result.rows.map(rowToFixtureWithTeams);
  },

  async upsert(data: Omit<Fixture, 'id'>): Promise<Fixture> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        INSERT INTO fixtures (
          external_fixture_id, division_id, home_team_id, away_team_id,
          fixture_date, fixture_time, pitch, round_number,
          home_score, away_score, status, is_forfeit, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(division_id, home_team_id, away_team_id, fixture_date) DO UPDATE SET
          external_fixture_id = excluded.external_fixture_id,
          fixture_time = excluded.fixture_time,
          pitch = excluded.pitch,
          round_number = excluded.round_number,
          home_score = excluded.home_score,
          away_score = excluded.away_score,
          status = excluded.status,
          is_forfeit = excluded.is_forfeit,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      args: [
        data.externalFixtureId,
        data.divisionId,
        data.homeTeamId,
        data.awayTeamId,
        data.fixtureDate,
        data.fixtureTime,
        data.pitch,
        data.roundNumber,
        data.homeScore,
        data.awayScore,
        data.status,
        data.isForfeit ? 1 : 0,
      ],
    });
    return rowToFixture(result.rows[0]);
  },
};

import { getDatabase } from '../connection.js';
import type { Fixture, FixtureWithTeams, Team, FixtureStatus } from '@trytag/shared';

interface FixtureRow {
  id: number;
  external_fixture_id: number | null;
  division_id: number;
  home_team_id: number;
  away_team_id: number;
  fixture_date: string;
  fixture_time: string | null;
  pitch: string | null;
  round_number: number | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  is_forfeit: number;
  created_at: string;
  updated_at: string;
}

interface FixtureWithTeamsRow extends FixtureRow {
  home_team_name: string;
  home_team_external_id: number;
  away_team_name: string;
  away_team_external_id: number;
}

function rowToFixture(row: FixtureRow): Fixture {
  return {
    id: row.id,
    externalFixtureId: row.external_fixture_id,
    divisionId: row.division_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    fixtureDate: row.fixture_date,
    fixtureTime: row.fixture_time,
    pitch: row.pitch,
    roundNumber: row.round_number,
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status as FixtureStatus,
    isForfeit: row.is_forfeit === 1,
  };
}

function rowToFixtureWithTeams(row: FixtureWithTeamsRow): FixtureWithTeams {
  const homeTeam: Team = {
    id: row.home_team_id,
    externalTeamId: row.home_team_external_id,
    name: row.home_team_name,
  };
  const awayTeam: Team = {
    id: row.away_team_id,
    externalTeamId: row.away_team_external_id,
    name: row.away_team_name,
  };
  return {
    ...rowToFixture(row),
    homeTeam,
    awayTeam,
  };
}

export const fixtureRepository = {
  findByDivision(divisionId: number): FixtureWithTeams[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT f.*,
          ht.name as home_team_name, ht.external_team_id as home_team_external_id,
          at.name as away_team_name, at.external_team_id as away_team_external_id
        FROM fixtures f
        INNER JOIN teams ht ON f.home_team_id = ht.id
        INNER JOIN teams at ON f.away_team_id = at.id
        WHERE f.division_id = ?
        ORDER BY f.fixture_date, f.fixture_time
      `
      )
      .all(divisionId) as FixtureWithTeamsRow[];
    return rows.map(rowToFixtureWithTeams);
  },

  findByTeam(teamId: number): FixtureWithTeams[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT f.*,
          ht.name as home_team_name, ht.external_team_id as home_team_external_id,
          at.name as away_team_name, at.external_team_id as away_team_external_id
        FROM fixtures f
        INNER JOIN teams ht ON f.home_team_id = ht.id
        INNER JOIN teams at ON f.away_team_id = at.id
        WHERE f.home_team_id = ? OR f.away_team_id = ?
        ORDER BY f.fixture_date DESC, f.fixture_time DESC
      `
      )
      .all(teamId, teamId) as FixtureWithTeamsRow[];
    return rows.map(rowToFixtureWithTeams);
  },

  findUpcoming(teamId?: number, limit = 10): FixtureWithTeams[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    let query = `
      SELECT f.*,
        ht.name as home_team_name, ht.external_team_id as home_team_external_id,
        at.name as away_team_name, at.external_team_id as away_team_external_id
      FROM fixtures f
      INNER JOIN teams ht ON f.home_team_id = ht.id
      INNER JOIN teams at ON f.away_team_id = at.id
      WHERE f.fixture_date >= ? AND f.status = 'scheduled'
    `;

    const params: (string | number)[] = [today];

    if (teamId) {
      query += ' AND (f.home_team_id = ? OR f.away_team_id = ?)';
      params.push(teamId, teamId);
    }

    query += ' ORDER BY f.fixture_date, f.fixture_time LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params) as FixtureWithTeamsRow[];
    return rows.map(rowToFixtureWithTeams);
  },

  findRecent(teamId?: number, limit = 10): FixtureWithTeams[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    let query = `
      SELECT f.*,
        ht.name as home_team_name, ht.external_team_id as home_team_external_id,
        at.name as away_team_name, at.external_team_id as away_team_external_id
      FROM fixtures f
      INNER JOIN teams ht ON f.home_team_id = ht.id
      INNER JOIN teams at ON f.away_team_id = at.id
      WHERE f.fixture_date < ? AND f.status = 'completed'
    `;

    const params: (string | number)[] = [today];

    if (teamId) {
      query += ' AND (f.home_team_id = ? OR f.away_team_id = ?)';
      params.push(teamId, teamId);
    }

    query += ' ORDER BY f.fixture_date DESC, f.fixture_time DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params) as FixtureWithTeamsRow[];
    return rows.map(rowToFixtureWithTeams);
  },

  findUpcomingByTeams(teamIds: number[], limit = 50): FixtureWithTeams[] {
    if (teamIds.length === 0) return [];
    
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const placeholders = teamIds.map(() => '?').join(',');

    const query = `
      SELECT f.*,
        ht.name as home_team_name, ht.external_team_id as home_team_external_id,
        at.name as away_team_name, at.external_team_id as away_team_external_id
      FROM fixtures f
      INNER JOIN teams ht ON f.home_team_id = ht.id
      INNER JOIN teams at ON f.away_team_id = at.id
      WHERE f.fixture_date >= ? AND f.status = 'scheduled'
      AND (f.home_team_id IN (${placeholders}) OR f.away_team_id IN (${placeholders}))
      ORDER BY f.fixture_date, f.fixture_time LIMIT ?
    `;

    const params: (string | number)[] = [today, ...teamIds, ...teamIds, limit];
    
    const rows = db.prepare(query).all(...params) as FixtureWithTeamsRow[];
    return rows.map(rowToFixtureWithTeams);
  },

  findRecentByTeams(teamIds: number[], limit = 50): FixtureWithTeams[] {
    if (teamIds.length === 0) return [];

    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const placeholders = teamIds.map(() => '?').join(',');

    const query = `
      SELECT f.*,
        ht.name as home_team_name, ht.external_team_id as home_team_external_id,
        at.name as away_team_name, at.external_team_id as away_team_external_id
      FROM fixtures f
      INNER JOIN teams ht ON f.home_team_id = ht.id
      INNER JOIN teams at ON f.away_team_id = at.id
      WHERE f.fixture_date < ? AND f.status = 'completed'
      AND (f.home_team_id IN (${placeholders}) OR f.away_team_id IN (${placeholders}))
      ORDER BY f.fixture_date DESC, f.fixture_time DESC LIMIT ?
    `;

    const params: (string | number)[] = [today, ...teamIds, ...teamIds, limit];

    const rows = db.prepare(query).all(...params) as FixtureWithTeamsRow[];
    return rows.map(rowToFixtureWithTeams);
  },

  upsert(data: Omit<Fixture, 'id'>): Fixture {
    const db = getDatabase();
    const stmt = db.prepare(`
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
    `);
    const row = stmt.get(
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
      data.isForfeit ? 1 : 0
    ) as FixtureRow;
    return rowToFixture(row);
  },
};

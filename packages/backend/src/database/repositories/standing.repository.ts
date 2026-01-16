import { getDatabase } from '../connection.js';
import type { Standing, StandingWithTeam, Team } from '@trytag/shared';

interface StandingRow {
  id: number;
  team_id: number;
  division_id: number;
  position: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  forfeits_for: number;
  forfeits_against: number;
  points_for: number;
  points_against: number;
  point_difference: number;
  bonus_points: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}

interface StandingWithTeamRow extends StandingRow {
  team_name: string;
  external_team_id: number;
  form?: string;
}

interface StandingWithDivisionRow extends StandingRow {
  division_name: string;
  league_id: number;
  league_name: string;
  season_name: string;
}

export interface StandingWithDivision extends Standing {
  divisionName: string;
  leagueId: number;
  leagueName: string;
  seasonName: string;
}

function rowToStanding(row: StandingRow): Standing {
  return {
    id: row.id,
    teamId: row.team_id,
    divisionId: row.division_id,
    position: row.position,
    played: row.played,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    forfeitsFor: row.forfeits_for,
    forfeitsAgainst: row.forfeits_against,
    pointsFor: row.points_for,
    pointsAgainst: row.points_against,
    pointDifference: row.point_difference,
    bonusPoints: row.bonus_points,
    totalPoints: row.total_points,
  };
}

function rowToStandingWithTeam(row: StandingWithTeamRow): StandingWithTeam {
  const team: Team = {
    id: row.team_id,
    externalTeamId: row.external_team_id,
    name: row.team_name,
  };
  return {
    ...rowToStanding(row),
    team,
    form: row.form,
  };
}

function rowToStandingWithDivision(row: StandingWithDivisionRow): StandingWithDivision {
  return {
    ...rowToStanding(row),
    divisionName: row.division_name,
    leagueId: row.league_id,
    leagueName: row.league_name,
    seasonName: row.season_name,
  };
}

export const standingRepository = {
  findByDivision(divisionId: number): StandingWithTeam[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT s.*, t.name as team_name, t.external_team_id,
          (
            SELECT GROUP_CONCAT(result, '')
            FROM (
              SELECT result, fixture_date, fixture_time
              FROM (
                SELECT
                  CASE
                    WHEN (f.home_team_id = s.team_id AND f.home_score > f.away_score) OR
                         (f.away_team_id = s.team_id AND f.away_score > f.home_score) THEN 'W'
                    WHEN (f.home_team_id = s.team_id AND f.home_score < f.away_score) OR
                         (f.away_team_id = s.team_id AND f.away_score < f.home_score) THEN 'L'
                    ELSE 'D'
                  END as result,
                  f.fixture_date,
                  f.fixture_time
                FROM fixtures f
                WHERE f.division_id = s.division_id
                  AND (f.home_team_id = s.team_id OR f.away_team_id = s.team_id)
                  AND f.status = 'completed'
                  AND f.home_score IS NOT NULL
                ORDER BY f.fixture_date DESC, CASE WHEN f.fixture_time IS NULL THEN 1 ELSE 0 END, f.fixture_time DESC
                LIMIT 5
              )
              ORDER BY fixture_date, CASE WHEN fixture_time IS NULL THEN 1 ELSE 0 END, fixture_time
            )
          ) as form
        FROM standings s
        INNER JOIN teams t ON s.team_id = t.id
        WHERE s.division_id = ?
        ORDER BY s.position
      `
      )
      .all(divisionId) as StandingWithTeamRow[];
    return rows.map(rowToStandingWithTeam);
  },

  findByDivisionIds(divisionIds: number[]): StandingWithTeam[] {
    if (divisionIds.length === 0) return [];
    const db = getDatabase();
    const placeholders = divisionIds.map(() => '?').join(',');
    const rows = db
      .prepare(
        `
        SELECT s.*, t.name as team_name, t.external_team_id,
          (
            SELECT GROUP_CONCAT(result, '')
            FROM (
              SELECT result, fixture_date, fixture_time
              FROM (
                SELECT
                  CASE
                    WHEN (f.home_team_id = s.team_id AND f.home_score > f.away_score) OR
                         (f.away_team_id = s.team_id AND f.away_score > f.home_score) THEN 'W'
                    WHEN (f.home_team_id = s.team_id AND f.home_score < f.away_score) OR
                         (f.away_team_id = s.team_id AND f.away_score < f.home_score) THEN 'L'
                    ELSE 'D'
                  END as result,
                  f.fixture_date,
                  f.fixture_time
                FROM fixtures f
                WHERE f.division_id = s.division_id
                  AND (f.home_team_id = s.team_id OR f.away_team_id = s.team_id)
                  AND f.status = 'completed'
                  AND f.home_score IS NOT NULL
                ORDER BY f.fixture_date DESC, CASE WHEN f.fixture_time IS NULL THEN 1 ELSE 0 END, f.fixture_time DESC
                LIMIT 5
              )
              ORDER BY fixture_date, CASE WHEN fixture_time IS NULL THEN 1 ELSE 0 END, fixture_time
            )
          ) as form
        FROM standings s
        INNER JOIN teams t ON s.team_id = t.id
        WHERE s.division_id IN (${placeholders})
        ORDER BY s.division_id, s.position
      `
      )
      .all(...divisionIds) as StandingWithTeamRow[];
    return rows.map(rowToStandingWithTeam);
  },

  findByTeam(teamId: number): StandingWithDivision[] {
    const db = getDatabase();
    const rows = db
      .prepare(`
        SELECT s.*, 
               d.name as division_name, 
               l.id as league_id, 
               l.name as league_name,
               se.name as season_name
        FROM standings s
        INNER JOIN divisions d ON s.division_id = d.id
        INNER JOIN leagues l ON d.league_id = l.id
        INNER JOIN seasons se ON d.season_id = se.id
        WHERE s.team_id = ? 
        ORDER BY se.id DESC
      `)
      .all(teamId) as StandingWithDivisionRow[];
    return rows.map(rowToStandingWithDivision);
  },

  findByTeamAndDivision(teamId: number, divisionId: number): Standing | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM standings WHERE team_id = ? AND division_id = ?')
      .get(teamId, divisionId) as StandingRow | undefined;
    return row ? rowToStanding(row) : null;
  },

  upsert(data: Omit<Standing, 'id'>): Standing {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO standings (
        team_id, division_id, position, played, wins, losses, draws,
        forfeits_for, forfeits_against, points_for, points_against,
        point_difference, bonus_points, total_points, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(team_id, division_id) DO UPDATE SET
        position = excluded.position,
        played = excluded.played,
        wins = excluded.wins,
        losses = excluded.losses,
        draws = excluded.draws,
        forfeits_for = excluded.forfeits_for,
        forfeits_against = excluded.forfeits_against,
        points_for = excluded.points_for,
        points_against = excluded.points_against,
        point_difference = excluded.point_difference,
        bonus_points = excluded.bonus_points,
        total_points = excluded.total_points,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    const row = stmt.get(
      data.teamId,
      data.divisionId,
      data.position,
      data.played,
      data.wins,
      data.losses,
      data.draws,
      data.forfeitsFor,
      data.forfeitsAgainst,
      data.pointsFor,
      data.pointsAgainst,
      data.pointDifference,
      data.bonusPoints,
      data.totalPoints
    ) as StandingRow;
    return rowToStanding(row);
  },

  deleteByDivision(divisionId: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM standings WHERE division_id = ?').run(divisionId);
  },
};

import { getDatabase } from '../connection.js';
import type { Standing, StandingWithTeam, Team } from '@trytag/shared';
import type { Row } from '@libsql/client';

export interface StandingWithDivision extends Standing {
  divisionName: string;
  leagueId: number;
  leagueName: string;
  seasonName: string;
}

function rowToStanding(row: Row): Standing {
  return {
    id: row.id as number,
    teamId: row.team_id as number,
    divisionId: row.division_id as number,
    position: row.position as number,
    played: row.played as number,
    wins: row.wins as number,
    losses: row.losses as number,
    draws: row.draws as number,
    forfeitsFor: row.forfeits_for as number,
    forfeitsAgainst: row.forfeits_against as number,
    pointsFor: row.points_for as number,
    pointsAgainst: row.points_against as number,
    pointDifference: row.point_difference as number,
    bonusPoints: row.bonus_points as number,
    totalPoints: row.total_points as number,
  };
}

function rowToStandingWithTeam(row: Row): StandingWithTeam {
  const team: Team = {
    id: row.team_id as number,
    externalTeamId: row.external_team_id as number,
    name: row.team_name as string,
  };
  return {
    ...rowToStanding(row),
    team,
    form: row.form as string | undefined,
  };
}

function rowToStandingWithDivision(row: Row): StandingWithDivision {
  return {
    ...rowToStanding(row),
    divisionName: row.division_name as string,
    leagueId: row.league_id as number,
    leagueName: row.league_name as string,
    seasonName: row.season_name as string,
  };
}

export const standingRepository = {
  async findByDivision(divisionId: number): Promise<StandingWithTeam[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
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
      `,
      args: [divisionId],
    });
    return result.rows.map(rowToStandingWithTeam);
  },

  async findByDivisionIds(divisionIds: number[]): Promise<StandingWithTeam[]> {
    if (divisionIds.length === 0) return [];
    const db = getDatabase();
    const placeholders = divisionIds.map(() => '?').join(',');
    const result = await db.execute({
      sql: `
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
      `,
      args: divisionIds,
    });
    return result.rows.map(rowToStandingWithTeam);
  },

  async findByTeam(teamId: number): Promise<StandingWithDivision[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
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
      `,
      args: [teamId],
    });
    return result.rows.map(rowToStandingWithDivision);
  },

  async findByTeamAndDivision(teamId: number, divisionId: number): Promise<Standing | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM standings WHERE team_id = ? AND division_id = ?',
      args: [teamId, divisionId],
    });
    return result.rows[0] ? rowToStanding(result.rows[0]) : null;
  },

  async upsert(data: Omit<Standing, 'id'>): Promise<Standing> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
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
      `,
      args: [
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
        data.totalPoints,
      ],
    });
    return rowToStanding(result.rows[0]);
  },

  async deleteByDivision(divisionId: number): Promise<void> {
    const db = getDatabase();
    await db.execute({
      sql: 'DELETE FROM standings WHERE division_id = ?',
      args: [divisionId],
    });
  },
};

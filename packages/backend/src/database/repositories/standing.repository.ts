import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { divisions, fixtures, leagues, seasons, standings, teams } from '../schema.js';
import type { Standing, StandingWithTeam, Team } from '@trytag/shared';

// Custom type for the result of the query with the raw SQL 'form' string
type StandingWithTeamAndForm = Standing & { team: Team; form: string | null };

export interface StandingWithDivision extends Standing {
  divisionName: string;
  leagueId: number;
  leagueName: string;
  seasonName: string;
}

const formSubQuery = sql`(
  select string_agg(result, '' order by fixture_date, fixture_time)
  from (
    select
      case
        when (f.home_team_id = ${standings.teamId} and f.home_score > f.away_score) or (f.away_team_id = ${standings.teamId} and f.away_score > f.home_score) then 'W'
        when (f.home_team_id = ${standings.teamId} and f.home_score < f.away_score) or (f.away_team_id = ${standings.teamId} and f.away_score < f.home_score) then 'L'
        else 'D'
      end as result,
      f.fixture_date,
      f.fixture_time
    from ${fixtures} f
    where f.division_id = ${standings.divisionId}
      and (f.home_team_id = ${standings.teamId} or f.away_team_id = ${standings.teamId})
      and f.status = 'completed'
      and f.home_score is not null
    order by f.fixture_date desc, f.fixture_time desc NULLS LAST
    limit 5
  ) as form_subquery
)`.as('form');

export const standingRepository = {
  async findByDivision(divisionId: number): Promise<StandingWithTeam[]> {
    const results = await db
      .select({
        standing: standings,
        team: teams,
        form: formSubQuery,
      })
      .from(standings)
      .leftJoin(teams, eq(standings.teamId, teams.id))
      .where(eq(standings.divisionId, divisionId))
      .orderBy(standings.position);

    return results
      .filter((r) => r.team)
      .map((r) => ({
        ...(r.standing as Standing),
        team: r.team as Team,
        form: r.form,
      }));
  },

  async findByDivisionIds(divisionIds: number[]): Promise<StandingWithTeam[]> {
    if (divisionIds.length === 0) return [];

    const results = await db
      .select({
        standing: standings,
        team: teams,
        form: formSubQuery,
      })
      .from(standings)
      .leftJoin(teams, eq(standings.teamId, teams.id))
      .where(inArray(standings.divisionId, divisionIds))
      .orderBy(standings.divisionId, standings.position);

      return results
      .filter((r) => r.team)
      .map((r) => ({
        ...(r.standing as Standing),
        team: r.team as Team,
        form: r.form,
      }));
  },

  async findByTeam(teamId: number): Promise<StandingWithDivision[]> {
    return db.query.standings.findMany({
      where: eq(standings.teamId, teamId),
      orderBy: (standings, { desc }) => [desc(standings.id)], // Assuming order by latest season
      with: {
        division: {
          with: {
            league: true,
            season: true,
          },
        },
      },
    }).then(results => results.map(s => ({
      ...s,
      divisionName: s.division.name,
      leagueId: s.division.league.id,
      leagueName: s.division.league.name,
      seasonName: s.division.season.name,
    })));
  },

  async findByTeamAndDivision(teamId: number, divisionId: number): Promise<Standing | null> {
    const result = await db.query.standings.findFirst({
      where: and(eq(standings.teamId, teamId), eq(standings.divisionId, divisionId)),
    });
    return result ?? null;
  },

  async upsert(data: Omit<Standing, 'id'>): Promise<Standing> {
    const [result] = await db
      .insert(standings)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [standings.teamId, standings.divisionId],
        set: {
          position: data.position,
          played: data.played,
          wins: data.wins,
          losses: data.losses,
          draws: data.draws,
          forfeitsFor: data.forfeitsFor,
          forfeitsAgainst: data.forfeitsAgainst,
          pointsFor: data.pointsFor,
          pointsAgainst: data.pointsAgainst,
          pointDifference: data.pointDifference,
          bonusPoints: data.bonusPoints,
          totalPoints: data.totalPoints,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  },

  async deleteByDivision(divisionId: number): Promise<void> {
    await db.delete(standings).where(eq(standings.divisionId, divisionId));
  },
};

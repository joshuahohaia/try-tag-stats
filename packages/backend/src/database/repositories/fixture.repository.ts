import { and, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { fixtures } from '../schema.js';
import type { Fixture, FixtureWithTeams } from '@trytag/shared';

export const fixtureRepository = {
  async findByDivision(divisionId: number): Promise<FixtureWithTeams[]> {
    return db.query.fixtures.findMany({
      where: eq(fixtures.divisionId, divisionId),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: (fixtures, { asc }) => [
        asc(fixtures.fixtureDate),
        sql`${fixtures.fixtureTime} asc nulls last`,
      ],
    });
  },

  async findByTeam(teamId: number): Promise<FixtureWithTeams[]> {
    return db.query.fixtures.findMany({
      where: or(eq(fixtures.homeTeamId, teamId), eq(fixtures.awayTeamId, teamId)),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: (fixtures, { desc }) => [
        desc(fixtures.fixtureDate),
        sql`${fixtures.fixtureTime} desc nulls last`,
      ],
    });
  },

  async findUpcoming(teamId?: number, limit = 10): Promise<FixtureWithTeams[]> {
    const today = new Date();
    const conditions = [gte(fixtures.fixtureDate, today), eq(fixtures.status, 'scheduled')];

    if (teamId) {
      conditions.push(or(eq(fixtures.homeTeamId, teamId), eq(fixtures.awayTeamId, teamId)));
    }

    return db.query.fixtures.findMany({
      where: and(...conditions),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: (fixtures, { asc }) => [
        asc(fixtures.fixtureDate),
        sql`${fixtures.fixtureTime} asc nulls last`,
      ],
      limit,
    });
  },

  async findRecent(teamId?: number, limit = 10): Promise<FixtureWithTeams[]> {
    const today = new Date();
    const conditions = [lte(fixtures.fixtureDate, today)];

    if (teamId) {
      conditions.push(or(eq(fixtures.homeTeamId, teamId), eq(fixtures.awayTeamId, teamId)));
    }

    return db.query.fixtures.findMany({
      where: and(...conditions),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: (fixtures, { desc, asc }) => [
        asc(fixtures.status), // 'completed' comes before 'scheduled'/'postponed'
        desc(fixtures.fixtureDate),
        sql`${fixtures.fixtureTime} desc nulls last`,
      ],
      limit,
    });
  },

  async findUpcomingByTeams(teamIds: number[], limit = 50): Promise<FixtureWithTeams[]> {
    if (teamIds.length === 0) return [];
    const today = new Date();

    return db.query.fixtures.findMany({
      where: and(
        gte(fixtures.fixtureDate, today),
        eq(fixtures.status, 'scheduled'),
        or(inArray(fixtures.homeTeamId, teamIds), inArray(fixtures.awayTeamId, teamIds))
      ),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: (fixtures, { asc }) => [
        asc(fixtures.fixtureDate),
        sql`${fixtures.fixtureTime} asc nulls last`,
      ],
      limit,
    });
  },

  async findRecentByTeams(teamIds: number[], limit = 50): Promise<FixtureWithTeams[]> {
    if (teamIds.length === 0) return [];
    const today = new Date();

    return db.query.fixtures.findMany({
      where: and(
        lte(fixtures.fixtureDate, today),
        or(inArray(fixtures.homeTeamId, teamIds), inArray(fixtures.awayTeamId, teamIds))
      ),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: (fixtures, { desc }) => [
        desc(fixtures.fixtureDate),
        sql`${fixtures.fixtureTime} desc nulls last`,
      ],
      limit,
    });
  },

  async upsert(data: Omit<Fixture, 'id'>): Promise<Fixture> {
    const toInsert = { ...data, fixtureDate: new Date(data.fixtureDate) };

    const [result] = await db
      .insert(fixtures)
      .values({ ...toInsert, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [fixtures.divisionId, fixtures.homeTeamId, fixtures.awayTeamId, fixtures.fixtureDate],
        set: {
          externalFixtureId: toInsert.externalFixtureId,
          fixtureTime: toInsert.fixtureTime,
          pitch: toInsert.pitch,
          roundNumber: toInsert.roundNumber,
          homeScore: toInsert.homeScore,
          awayScore: toInsert.awayScore,
          status: toInsert.status,
          isForfeit: toInsert.isForfeit,
          updatedAt: new Date(),
        },
      })
      .returning();

    return { ...result, fixtureDate: result.fixtureDate.toISOString().split('T')[0] };
  },
};

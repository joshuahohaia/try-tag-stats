import { eq, inArray } from 'drizzle-orm';
import { db } from '../index.js';
import { teams, teamDivisions } from '../schema.js';
import type { Team } from '@trytag/shared';

export const teamRepository = {
  async findAll(): Promise<Team[]> {
    return db.query.teams.findMany({
      orderBy: (teams, { asc }) => [asc(teams.name)],
    });
  },

  async findById(id: number): Promise<Team | null> {
    const result = await db.query.teams.findFirst({
      where: eq(teams.id, id),
    });
    return result ?? null;
  },

  async findByExternalId(externalTeamId: number): Promise<Team | null> {
    const result = await db.query.teams.findFirst({
      where: eq(teams.externalTeamId, externalTeamId),
    });
    return result ?? null;
  },

  async findByName(name: string): Promise<Team | null> {
    const result = await db.query.teams.findFirst({
      where: eq(teams.name, name),
    });
    return result ?? null;
  },

  async findByIds(ids: number[]): Promise<Team[]> {
    if (ids.length === 0) return [];
    return db.query.teams.findMany({
      where: inArray(teams.id, ids),
      orderBy: (teams, { asc }) => [asc(teams.name)],
    });
  },

  async findByDivision(divisionId: number): Promise<Team[]> {
    const results = await db
      .select({ team: teams })
      .from(teamDivisions)
      .leftJoin(teams, eq(teamDivisions.teamId, teams.id))
      .where(eq(teamDivisions.divisionId, divisionId));

    return results.map((r) => r.team).filter((t): t is Team => t !== null);
  },

  async upsert(externalTeamId: number, name: string): Promise<Team> {
    const [result] = await db
      .insert(teams)
      .values({ externalTeamId, name, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: teams.externalTeamId,
        set: {
          name,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async linkToDivision(teamId: number, divisionId: number): Promise<void> {
    await db
      .insert(teamDivisions)
      .values({ teamId, divisionId })
      .onConflictDoNothing();
  },
};

import { and, eq } from 'drizzle-orm';
import { db } from '../index.js';
import { divisions } from '../schema.js';
import type { Division } from '@trytag/shared';

export const divisionRepository = {
  async findAll(): Promise<Division[]> {
    return db.query.divisions.findMany({
      orderBy: (divisions, { asc }) => [asc(divisions.name)],
    });
  },

  async findById(id: number): Promise<Division | null> {
    const result = await db.query.divisions.findFirst({
      where: eq(divisions.id, id),
    });
    return result ?? null;
  },

  async findByLeagueAndSeason(leagueId: number, seasonId: number): Promise<Division[]> {
    return db.query.divisions.findMany({
      where: and(eq(divisions.leagueId, leagueId), eq(divisions.seasonId, seasonId)),
      orderBy: (divisions, { asc }) => [asc(divisions.tier), asc(divisions.name)],
    });
  },

  async findByExternalId(
    externalDivisionId: number,
    leagueId: number,
    seasonId: number
  ): Promise<Division | null> {
    const result = await db.query.divisions.findFirst({
      where: and(
        eq(divisions.externalDivisionId, externalDivisionId),
        eq(divisions.leagueId, leagueId),
        eq(divisions.seasonId, seasonId)
      ),
    });
    return result ?? null;
  },

  async upsert(data: {
    externalDivisionId: number;
    leagueId: number;
    seasonId: number;
    name: string;
    tier?: number;
  }): Promise<Division> {
    const [result] = await db
      .insert(divisions)
      .values({ ...data, tier: data.tier ?? null, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [divisions.externalDivisionId, divisions.leagueId, divisions.seasonId],
        set: {
          name: data.name,
          tier: data.tier ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async updateLastScraped(id: number): Promise<void> {
    await db
      .update(divisions)
      .set({ lastScrapedAt: new Date() })
      .where(eq(divisions.id, id));
  },
};

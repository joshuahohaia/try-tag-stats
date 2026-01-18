import { eq } from 'drizzle-orm';
import { db } from '../index.js';
import { leagues } from '../schema.js';
import type { League } from '@trytag/shared';

// The shared League type expects regionId to be a number, but it's nullable in the DB.
// Replicate existing logic by mapping null regionId to 0.
function mapDrizzleResult(
  result: (typeof leagues)['$inferSelect']
): Omit<League, 'regionId'> & { regionId: number } {
  return {
    ...result,
    regionId: result.regionId ?? 0,
  };
}

export const leagueRepository = {
  async findAll(): Promise<League[]> {
    const results = await db.query.leagues.findMany({
      orderBy: (leagues, { asc }) => [asc(leagues.name)],
    });
    return results.map(mapDrizzleResult);
  },

  async findByRegion(regionId: number): Promise<League[]> {
    const results = await db.query.leagues.findMany({
      where: eq(leagues.regionId, regionId),
      orderBy: (leagues, { asc }) => [asc(leagues.name)],
    });
    return results.map(mapDrizzleResult);
  },

  async findById(id: number): Promise<League | null> {
    const result = await db.query.leagues.findFirst({
      where: eq(leagues.id, id),
    });
    return result ? mapDrizzleResult(result) : null;
  },

  async findByExternalId(externalLeagueId: number): Promise<League | null> {
    const result = await db.query.leagues.findFirst({
      where: eq(leagues.externalLeagueId, externalLeagueId),
    });
    return result ? mapDrizzleResult(result) : null;
  },

  async upsert(data: {
    externalLeagueId: number;
    name: string;
    regionId?: number;
    venueName?: string;
    dayOfWeek?: string;
    format?: string;
  }): Promise<League> {
    const [result] = await db
      .insert(leagues)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: leagues.externalLeagueId,
        set: {
          name: data.name,
          regionId: data.regionId,
          venueName: data.venueName,
          dayOfWeek: data.dayOfWeek,
          format: data.format,
          updatedAt: new Date(),
        },
      })
      .returning();

    return mapDrizzleResult(result);
  },
};

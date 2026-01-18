import { eq } from 'drizzle-orm';
import { db } from '../index.js';
import { seasons } from '../schema.js';
import type { Season } from '@trytag/shared';

export const seasonRepository = {
  async findAll(): Promise<Season[]> {
    return db.query.seasons.findMany({
      orderBy: (seasons, { desc }) => [desc(seasons.name)],
    });
  },

  async findById(id: number): Promise<Season | null> {
    const result = await db.query.seasons.findFirst({
      where: eq(seasons.id, id),
    });
    return result ?? null;
  },

  async findByExternalId(externalSeasonId: number): Promise<Season | null> {
    const result = await db.query.seasons.findFirst({
      where: eq(seasons.externalSeasonId, externalSeasonId),
    });
    return result ?? null;
  },

  async findCurrent(): Promise<Season | null> {
    const result = await db.query.seasons.findFirst({
      where: eq(seasons.isCurrent, true),
    });
    return result ?? null;
  },

  async upsert(data: {
    externalSeasonId: number;
    name: string;
    isCurrent?: boolean;
  }): Promise<Season> {
    const [result] = await db
      .insert(seasons)
      .values({ ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: seasons.externalSeasonId,
        set: {
          name: data.name,
          isCurrent: data.isCurrent,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async setCurrent(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(seasons).set({ isCurrent: false });
      await tx.update(seasons).set({ isCurrent: true }).where(eq(seasons.id, id));
    });
  },
};

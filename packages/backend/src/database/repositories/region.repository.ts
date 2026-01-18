import { eq } from 'drizzle-orm';
import { db } from '../index.js';
import { regions } from '../schema.js';
import type { Region } from '@trytag/shared';

export const regionRepository = {
  async findAll(): Promise<Region[]> {
    return db.query.regions.findMany({
      orderBy: (regions, { asc }) => [asc(regions.name)],
    });
  },

  async findById(id: number): Promise<Region | null> {
    const result = await db.query.regions.findFirst({
      where: eq(regions.id, id),
    });
    return result ?? null;
  },

  async findBySlug(slug: string): Promise<Region | null> {
    const result = await db.query.regions.findFirst({
      where: eq(regions.slug, slug),
    });
    return result ?? null;
  },

  async upsert(name: string, slug: string): Promise<Region> {
    const [result] = await db
      .insert(regions)
      .values({ name, slug, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: regions.name,
        set: {
          slug,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },
};

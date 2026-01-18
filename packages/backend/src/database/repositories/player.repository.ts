import { eq, or } from 'drizzle-orm';
import { db } from '../index.js';
import { players, playerTeams } from '../schema.js';
import type { Player } from '@trytag/shared';

export const playerRepository = {
  async findAll(): Promise<Player[]> {
    return db.query.players.findMany({
      orderBy: (players, { asc }) => [asc(players.name)],
    });
  },

  async findById(id: number): Promise<Player | null> {
    const result = await db.query.players.findFirst({
      where: eq(players.id, id),
    });
    return result ?? null;
  },

  async findByName(name: string): Promise<Player | null> {
    const result = await db.query.players.findFirst({
      where: eq(players.name, name),
    });
    return result ?? null;
  },

  async upsert(name: string, externalPlayerId?: number): Promise<Player> {
    return db.transaction(async (tx) => {
      // Check if player exists by external ID (if provided)
      if (externalPlayerId) {
        const existingByExtId = await tx.query.players.findFirst({
          where: eq(players.externalPlayerId, externalPlayerId),
        });

        if (existingByExtId) {
          if (existingByExtId.name !== name) {
            const [updated] = await tx
              .update(players)
              .set({ name, updatedAt: new Date() })
              .where(eq(players.id, existingByExtId.id))
              .returning();
            return updated;
          }
          return existingByExtId;
        }
      }

      // Check if player exists by name
      const existingByName = await tx.query.players.findFirst({
        where: eq(players.name, name),
      });

      if (existingByName) {
        if (externalPlayerId && existingByName.externalPlayerId !== externalPlayerId) {
          const [updated] = await tx
            .update(players)
            .set({ externalPlayerId, updatedAt: new Date() })
            .where(eq(players.id, existingByName.id))
            .returning();
          return updated;
        }
        return existingByName;
      }

      // Create new player
      const [result] = await tx
        .insert(players)
        .values({ name, externalPlayerId, updatedAt: new Date() })
        .returning();
      return result;
    });
  },

  async linkToTeamInDivision(
    playerId: number,
    teamId: number,
    divisionId: number
  ): Promise<void> {
    await db
      .insert(playerTeams)
      .values({ playerId, teamId, divisionId })
      .onConflictDoNothing();
  },
};
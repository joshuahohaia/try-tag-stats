import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../index.js';
import { playerAwards, players, teams } from '../schema.js';
import type { PlayerAward, PlayerAwardWithDetails } from '@trytag/shared';

export const playerAwardRepository = {
  async findByDivision(divisionId: number): Promise<PlayerAwardWithDetails[]> {
    return db.query.playerAwards.findMany({
      where: eq(playerAwards.divisionId, divisionId),
      with: {
        player: true,
        team: true,
      },
      orderBy: (playerAwards, { desc, asc }) => [
        desc(playerAwards.awardCount),
        asc(players.name),
      ],
    });
  },

  async findByDivisionIds(divisionIds: number[]): Promise<PlayerAwardWithDetails[]> {
    if (divisionIds.length === 0) return [];
    return db.query.playerAwards.findMany({
      where: inArray(playerAwards.divisionId, divisionIds),
      with: {
        player: true,
        team: true,
      },
      orderBy: (playerAwards, { desc, asc }) => [
        asc(playerAwards.divisionId),
        desc(playerAwards.awardCount),
        asc(players.name),
      ],
    });
  },

  async findByTeam(teamId: number): Promise<PlayerAwardWithDetails[]> {
    return db.query.playerAwards.findMany({
      where: eq(playerAwards.teamId, teamId),
      with: {
        player: true,
        team: true,
      },
      orderBy: (playerAwards, { desc, asc }) => [
        desc(playerAwards.awardCount),
        asc(players.name),
      ],
    });
  },

  async upsert(data: Omit<PlayerAward, 'id'>): Promise<PlayerAward> {
    const [result] = await db
      .insert(playerAwards)
      .values(data)
      .onConflictDoUpdate({
        target: [playerAwards.playerId, playerAwards.divisionId, playerAwards.awardType],
        set: {
          awardCount: data.awardCount,
          teamId: data.teamId,
          fixtureId: data.fixtureId,
        },
      })
      .returning();

    return result;
  },
};

import { describe, it, expect } from 'vitest';
import type { PlayerAwardWithDetails, StandingWithDivision } from '@trytag/shared';
import { currentSeasonAwards } from './awards';

const award = (playerId: number, divisionId: number, awardCount: number): PlayerAwardWithDetails => ({
  id: playerId * 1000 + divisionId,
  playerId,
  teamId: 1,
  divisionId,
  fixtureId: null,
  awardType: 'player_of_match',
  awardCount,
  player: { id: playerId, externalPlayerId: null, name: `P${playerId}` },
  team: { id: 1, externalTeamId: 1, name: 'T' },
});
const standing = (divisionId: number, seasonId: number, phaseId: number | null = null): StandingWithDivision =>
  ({ divisionId, seasonId, leagueId: 9, phaseId } as StandingWithDivision);

describe('currentSeasonAwards', () => {
  it('drops earlier seasons and adds a player across the divisions of the current season', () => {
    const standings = [standing(30, 5, 87), standing(20, 5), standing(10, 4)];
    const out = currentSeasonAwards([award(1, 20, 2), award(1, 30, 1), award(1, 10, 7), award(2, 20, 1)], standings);
    expect(out).toEqual([
      { playerId: 1, name: 'P1', awardCount: 3 },
      { playerId: 2, name: 'P2', awardCount: 1 },
    ]);
  });

  it('returns nothing without standings', () => {
    expect(currentSeasonAwards([award(1, 20, 2)], [])).toEqual([]);
  });
});

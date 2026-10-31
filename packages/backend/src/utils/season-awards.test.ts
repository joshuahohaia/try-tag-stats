import { describe, it, expect } from 'vitest';
import type { PlayerAwardWithDetails, StandingWithDivision } from '@trytag/shared';
import { seasonAwardsForDivision } from './season-awards.js';

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
const standing = (divisionId: number, seasonId: number, leagueId = 9): StandingWithDivision =>
  ({ divisionId, seasonId, leagueId }) as StandingWithDivision;

describe('seasonAwardsForDivision', () => {
  it('keeps one season, adds a player across its divisions, and drops earlier seasons', () => {
    const standings = [standing(30, 5), standing(20, 5), standing(10, 4)];
    const out = seasonAwardsForDivision(
      [award(1, 20, 2), award(1, 30, 1), award(1, 10, 7), award(2, 20, 1)],
      standings,
      20,
    );
    expect(out.map((a) => [a.playerId, a.awardCount])).toEqual([[1, 3], [2, 1]]);
  });

  it('returns nothing when the division is not in the standings', () => {
    expect(seasonAwardsForDivision([award(1, 20, 2)], [standing(10, 4)], 99)).toEqual([]);
  });
});

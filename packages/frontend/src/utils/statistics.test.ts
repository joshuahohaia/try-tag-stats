import { describe, it, expect } from 'vitest';
import type { PlayerAwardWithDetails } from '@trytag/shared';
import { calculateAwardPositions } from './statistics';

function stat(playerId: number, awardCount: number): PlayerAwardWithDetails {
  return {
    id: playerId * 100,
    playerId,
    teamId: 1,
    divisionId: 1,
    fixtureId: null,
    awardType: 'player_of_the_match',
    awardCount,
    player: { id: playerId, externalPlayerId: null, name: `Player ${playerId}` },
    team: { id: 1, externalTeamId: 1, name: 'Team' },
  };
}

describe('calculateAwardPositions', () => {
  it('assigns dense ranks with shared positions for ties', () => {
    const positions = calculateAwardPositions([
      stat(1, 5),
      stat(2, 5),
      stat(3, 4),
      stat(4, 3),
    ]);
    expect(positions.get(1)).toBe(1);
    expect(positions.get(2)).toBe(1);
    expect(positions.get(3)).toBe(2);
    expect(positions.get(4)).toBe(3);
  });

  it('ranks identically when the input is not pre-sorted', () => {
    // Regression: the removed duplicate helper in fixtures.ts walked the
    // array in order and only ranked correctly for descending input.
    const sorted = calculateAwardPositions([stat(1, 5), stat(2, 3), stat(3, 4)]);
    const shuffled = calculateAwardPositions([stat(3, 4), stat(1, 5), stat(2, 3)]);
    expect(shuffled.get(1)).toBe(1);
    expect(shuffled.get(3)).toBe(2);
    expect(shuffled.get(2)).toBe(3);
    expect([...shuffled.entries()].sort()).toEqual([...sorted.entries()].sort());
  });

  it('handles an empty list', () => {
    expect(calculateAwardPositions([]).size).toBe(0);
  });

  it('gives every player rank 1 when all counts are equal', () => {
    const positions = calculateAwardPositions([stat(1, 2), stat(2, 2), stat(3, 2)]);
    expect(positions.get(1)).toBe(1);
    expect(positions.get(2)).toBe(1);
    expect(positions.get(3)).toBe(1);
  });
});

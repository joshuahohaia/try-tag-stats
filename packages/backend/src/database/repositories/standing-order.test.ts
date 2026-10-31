import { describe, it, expect } from 'vitest';
import { orderTeamStandings } from './standing-order.js';

const row = (
  divisionId: number,
  phaseId: number | null,
  phaseStarted: boolean,
  leagueId = 1,
  seasonId = 78
) => ({ divisionId, phaseId, phaseStarted, leagueId, seasonId });

describe('orderTeamStandings', () => {
  it('puts the one started later phase first and keeps the first phase after it', () => {
    const out = orderTeamStandings([row(1584, null, true), row(1916, 87, true)]);
    expect(out.map((r) => r.divisionId)).toEqual([1916, 1584]);
  });

  it('keeps the first phase current when the later phase has not started', () => {
    const out = orderTeamStandings([row(1916, 87, false), row(1584, null, true)]);
    expect(out.map((r) => r.divisionId)).toEqual([1584, 1916]);
  });

  it('keeps the first phase current when several later phases have started', () => {
    const out = orderTeamStandings([row(1, 90, true), row(2, 91, true), row(3, null, true)]);
    expect(out.map((r) => r.divisionId)).toEqual([3, 1, 2]);
  });

  it('does not use phase id size to decide', () => {
    const a = orderTeamStandings([row(1, null, true), row(2, 5, true)]);
    const b = orderTeamStandings([row(1, null, true), row(2, 5000, true)]);
    expect(a.map((r) => r.divisionId)).toEqual([2, 1]);
    expect(b.map((r) => r.divisionId)).toEqual([2, 1]);
  });

  it('only reorders inside one league and season, and keeps season order', () => {
    const out = orderTeamStandings([
      row(10, null, true, 1, 78),
      row(11, 87, true, 1, 78),
      row(20, null, true, 2, 78),
      row(30, null, true, 1, 77),
      row(31, 80, true, 1, 77),
    ]);
    expect(out.map((r) => r.divisionId)).toEqual([11, 10, 20, 31, 30]);
  });

  it('does not expose the internal phaseStarted flag', () => {
    const out = orderTeamStandings([row(1, null, true)]);
    expect('phaseStarted' in out[0]).toBe(false);
  });
});

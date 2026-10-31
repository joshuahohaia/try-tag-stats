import { describe, it, expect } from 'vitest';
import type { FixtureWithTeams } from '@trytag/shared';
import { isResolvedTeam, lookupMatch, matchPath } from './matchLookup';

const fx = (over: Partial<FixtureWithTeams> & { id: number }): FixtureWithTeams =>
  ({
    externalFixtureId: null,
    divisionId: 0,
    homeTeamId: 1,
    awayTeamId: 2,
    fixtureDate: '2026-10-05',
    fixtureTime: '20:00',
    pitch: 'Pitch A',
    roundNumber: null,
    homeScore: 9,
    awayScore: 14,
    status: 'completed',
    isForfeit: false,
    homeTeam: { id: 1, externalTeamId: 11, name: 'Same Name' },
    awayTeam: { id: 2, externalTeamId: 22, name: 'Same Name' },
    ...over,
  }) as FixtureWithTeams;

describe('lookupMatch', () => {
  it('matches by team ids and date, not by name', () => {
    const other = fx({ id: -2, awayTeam: { id: 3, externalTeamId: 33, name: 'Same Name' } });
    const r = lookupMatch([other, fx({ id: -1 })], 1, 2, '2026-10-05');
    expect(r.kind).toBe('one');
    if (r.kind === 'one') expect(r.fixture.id).toBe(-1);
  });

  it('returns none when nothing matches', () => {
    expect(lookupMatch([fx({ id: -1 })], 1, 2, '2026-10-06').kind).toBe('none');
  });

  it('does not pick one of a double header', () => {
    const a = fx({ id: -1, fixtureTime: '19:00' });
    const b = fx({ id: -2, fixtureTime: '21:00', homeScore: 3, awayScore: 3 });
    const r = lookupMatch([a, b], 1, 2, '2026-10-05');
    expect(r.kind).toBe('many');
    expect(lookupMatch([a, b], 1, 2, '2026-10-05', '21:00').kind).toBe('one');
  });

  it('counts an identical duplicate once', () => {
    expect(lookupMatch([fx({ id: -1 }), fx({ id: -1 })], 1, 2, '2026-10-05').kind).toBe('one');
  });

  it('does not match the same ids the other way round', () => {
    expect(lookupMatch([fx({ id: -1 })], 2, 1, '2026-10-05').kind).toBe('none');
  });
});

describe('matchPath', () => {
  it('uses ids and date, and the time only when known', () => {
    const f = fx({ id: -1 });
    expect(matchPath(f).params).toEqual({ teamId: '1', opponentId: '2', date: '2026-10-05' });
    expect(matchPath(f).search).toEqual({ time: '20:00' });
    expect(matchPath(fx({ id: -1, fixtureTime: null })).search).toEqual({});
  });
});

describe('isResolvedTeam', () => {
  it('treats a team whose id equals its external id as unresolved', () => {
    expect(isResolvedTeam({ id: 22251, externalTeamId: 22251 })).toBe(false);
    expect(isResolvedTeam({ id: 3457, externalTeamId: 8024 })).toBe(true);
  });
});

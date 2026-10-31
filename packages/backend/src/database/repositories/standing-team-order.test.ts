import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.hoisted(() => {
  process.env.TURSO_DATABASE_URL = 'file:./data/test-team-order.db';
  process.env.TURSO_AUTH_TOKEN = '';
});

import { initializeSchema } from '../schema.js';
import {
  leagueRepository,
  seasonRepository,
  divisionRepository,
  standingRepository,
  teamRepository,
} from './index.js';

const stats = (played: number) => ({
  position: 1,
  played,
  wins: played,
  losses: 0,
  draws: 0,
  forfeitsFor: 0,
  forfeitsAgainst: 0,
  pointsFor: played * 10,
  pointsAgainst: 0,
  pointDifference: played * 10,
  bonusPoints: 0,
  totalPoints: played * 2,
});

describe('findByTeam current phase order', () => {
  beforeAll(async () => {
    await initializeSchema();
  });

  it('returns the started later phase first and keeps the first phase after it', async () => {
    const league = await leagueRepository.upsert({ externalLeagueId: 747, name: 'Battersea Park Astro' });
    const season = await seasonRepository.upsert({ externalSeasonId: 100, name: 'Autumn 2026' });
    // First phase division is inserted FIRST so it has the lower id, as in production.
    const first = await divisionRepository.upsert({ externalDivisionId: 8727, leagueId: league.id, seasonId: season.id, name: 'Division 1' });
    const cup = await divisionRepository.upsert({
      externalDivisionId: 184, leagueId: league.id, seasonId: season.id, name: 'Cup', phaseId: 87, phaseName: 'Phase 2',
    });
    const team = await teamRepository.upsert(8024, 'At least we try-ed');
    const other = await teamRepository.upsert(10442, 'Popping Tags');
    await standingRepository.upsert({ teamId: team.id, divisionId: first.id, ...stats(5) });
    await standingRepository.upsert({ teamId: team.id, divisionId: cup.id, ...stats(3) });

    const rows = await standingRepository.findByTeam(team.id);
    expect(rows.map((r) => [r.divisionName, r.phaseName])).toEqual([
      ['Cup', 'Phase 2'],
      ['Division 1', null],
    ]);
    expect('phaseStarted' in rows[0]).toBe(false);

    // Later phase not started by anyone: first phase stays current.
    await standingRepository.upsert({ teamId: team.id, divisionId: cup.id, ...stats(0) });
    await standingRepository.upsert({ teamId: other.id, divisionId: cup.id, ...stats(0) });
    const before = await standingRepository.findByTeam(team.id);
    expect(before.map((r) => r.divisionName)).toEqual(['Division 1', 'Cup']);

    // Another team in the later phase has played, so the phase has started for the league page rule.
    await standingRepository.upsert({ teamId: other.id, divisionId: cup.id, ...stats(1) });
    const after = await standingRepository.findByTeam(team.id);
    expect(after.map((r) => r.divisionName)).toEqual(['Cup', 'Division 1']);
  });
});

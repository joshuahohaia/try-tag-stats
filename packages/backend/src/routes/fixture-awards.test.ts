import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.hoisted(() => {
  process.env.TURSO_DATABASE_URL = 'file:./data/test-fixture-awards.db';
  process.env.TURSO_AUTH_TOKEN = '';
});

vi.mock('../scraper/index.js', () => ({
  scraperOrchestrator: { fetchTeamProfile: vi.fn().mockResolvedValue(null) },
}));

import request from 'supertest';
import { createApp } from '../app.js';
import { initializeSchema } from '../database/schema.js';
import {
  leagueRepository,
  seasonRepository,
  divisionRepository,
  standingRepository,
  teamRepository,
  playerRepository,
  playerAwardRepository,
  fixtureRepository,
} from '../database/repositories/index.js';

const stats = {
  position: 1, played: 1, wins: 1, losses: 0, draws: 0, forfeitsFor: 0, forfeitsAgainst: 0,
  pointsFor: 10, pointsAgainst: 0, pointDifference: 10, bonusPoints: 0, totalPoints: 2,
};

describe('GET /api/v1/fixtures/:id Player of the Match', () => {
  let fixtureId: number;

  beforeAll(async () => {
    await initializeSchema();
    const league = await leagueRepository.upsert({ externalLeagueId: 747, name: 'Battersea Park Astro' });
    const old = await seasonRepository.upsert({ externalSeasonId: 90, name: 'Winter 2025' });
    const current = await seasonRepository.upsert({ externalSeasonId: 100, name: 'Autumn 2026' });
    const oldDiv = await divisionRepository.upsert({ externalDivisionId: 1, leagueId: league.id, seasonId: old.id, name: 'Old Division' });
    const first = await divisionRepository.upsert({ externalDivisionId: 8727, leagueId: league.id, seasonId: current.id, name: 'Division 1' });
    const cup = await divisionRepository.upsert({
      externalDivisionId: 184, leagueId: league.id, seasonId: current.id, name: 'Cup', phaseId: 87, phaseName: 'Phase 2',
    });
    const home = await teamRepository.upsert(8024, 'Home Team');
    const away = await teamRepository.upsert(10442, 'Away Team');
    for (const t of [home, away]) {
      for (const d of [oldDiv, first, cup]) await standingRepository.upsert({ teamId: t.id, divisionId: d.id, ...stats });
    }
    const alec = await playerRepository.upsert('Alec Smail');
    const kim = await playerRepository.upsert('Kim Other');
    const award = (playerId: number, divisionId: number, awardCount: number) =>
      playerAwardRepository.upsert({ playerId, teamId: home.id, divisionId, fixtureId: null, awardType: 'player_of_match', awardCount });
    await award(alec.id, oldDiv.id, 2); // earlier season, must not count
    await award(alec.id, first.id, 1);
    await award(kim.id, first.id, 1);
    const fixture = await fixtureRepository.upsert({
      externalFixtureId: null, divisionId: cup.id, homeTeamId: home.id, awayTeamId: away.id,
      fixtureDate: '2026-11-02', fixtureTime: '20:40', pitch: 'Pitch A', roundNumber: null,
      homeScore: null, awayScore: null, status: 'scheduled', isForfeit: false,
    });
    fixtureId = fixture.id;
  });

  it('lists each player once with this season only', async () => {
    const res = await request(createApp()).get(`/api/v1/fixtures/${fixtureId}`);
    expect(res.status).toBe(200);
    const awards = res.body.data.homeTeamProfile.playerAwards;
    expect(awards.map((a: { player: { name: string }; awardCount: number }) => [a.player.name, a.awardCount])).toEqual([
      ['Alec Smail', 1],
      ['Kim Other', 1],
    ]);
  });
});

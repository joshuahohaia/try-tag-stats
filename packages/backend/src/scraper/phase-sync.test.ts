import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

vi.hoisted(() => {
  process.env.TURSO_DATABASE_URL = 'file:./data/test-phase-sync.db';
  process.env.TURSO_AUTH_TOKEN = '';
});

const fixture = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'parsers/phase-standings.fixture.html'), 'utf8');

const fixturesPage = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'parsers/phase-fixtures.fixture.html'), 'utf8');

vi.mock('./client.js', () => ({
  scraperClient: { fetchWithParams: vi.fn(async (endpoint: string) => (endpoint.includes('Fixtures') ? fixturesPage : fixture)) },
}));

import { initializeSchema } from '../database/schema.js';
import { leagueRepository, seasonRepository, divisionRepository, standingRepository } from '../database/repositories/index.js';
import { scraperClient } from './client.js';
import { fixtureRepository } from '../database/repositories/index.js';
import { scraperOrchestrator } from './index.js';

describe('phase sync', () => {
  beforeAll(async () => {
    await initializeSchema();
  });

  it('stores Cup and Plate as separate phase divisions and keeps first-phase divisions', async () => {
    const league = await leagueRepository.upsert({ externalLeagueId: 747, name: 'Battersea Park Astro' });
    const season = await seasonRepository.upsert({ externalSeasonId: 100, name: 'Autumn 2026' });
    const first = await divisionRepository.upsert({ externalDivisionId: 8727, leagueId: league.id, seasonId: season.id, name: 'Division 1' });

    const result = { itemsProcessed: { divisions: 0, teams: 0, standings: 0, fixtures: 0 } } as never;
    const ids = await (scraperOrchestrator as never as {
      syncPhase: (...a: unknown[]) => Promise<number[]>;
    }).syncPhase(league.id, season.id, 747, 100, { phaseId: 87, name: 'Phase 2' }, result);

    expect(ids).toEqual([184, 185]);
    // One standings request for the whole phase (PhaseId, no DivisionId), then one fixtures
    // request per phase division sent with both DivisionId and PhaseId.
    const calls = (scraperClient.fetchWithParams as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls).toHaveLength(3);
    const params = calls[0][1] as Record<string, unknown>;
    expect(params.PhaseId).toBe(87);
    expect(params.DivisionId).toBeUndefined();
    const fixtureCalls = calls.slice(1).map((c) => ({ endpoint: c[0], ...(c[1] as { DivisionId?: number; PhaseId?: number }) }));
    expect(fixtureCalls.map((c) => [c.endpoint, c.DivisionId, c.PhaseId])).toEqual([
      ['/Leagues/Fixtures', 184, 87],
      ['/Leagues/Fixtures', 185, 87],
    ]);

    const divisions = await divisionRepository.findByLeagueAndSeason(league.id, season.id);
    expect(divisions.map((d) => [d.name, d.externalDivisionId, d.phaseId, d.phaseName])).toEqual([
      ['Division 1', 8727, null, null],
      ['Cup', 184, 87, 'Phase 2'],
      ['Plate', 185, 87, 'Phase 2'],
    ]);

    const cup = divisions.find((d) => d.name === 'Cup')!;
    const plate = divisions.find((d) => d.name === 'Plate')!;
    const cupRows = await standingRepository.findByDivision(cup.id);
    const plateRows = await standingRepository.findByDivision(plate.id);
    expect(cupRows.length).toBe(6);
    expect(plateRows.length).toBe(6);
    expect(await standingRepository.findByDivision(first.id)).toHaveLength(0);

    // Phase fixtures are stored against the phase division (3 rows on the fixtures page)
    const cupFixtures = await fixtureRepository.findByDivision(cup.id);
    expect(cupFixtures.length).toBe(3);
    expect(cupFixtures.map((f) => f.fixtureDate)).toEqual(['2026-11-02', '2026-11-02', '2026-11-02']);

    // Re-running updates in place (no duplicates) and keeps the phase label
    await (scraperOrchestrator as never as { syncPhase: (...a: unknown[]) => Promise<number[]> })
      .syncPhase(league.id, season.id, 747, 100, { phaseId: 87, name: 'Phase 2' }, result);
    expect(await divisionRepository.findByLeagueAndSeason(league.id, season.id)).toHaveLength(3);
  });

  it('does not overwrite a first-phase division when Spawtz reuses its DivisionId', async () => {
    const league = await leagueRepository.upsert({ externalLeagueId: 748, name: 'Reused Id League' });
    const season = await seasonRepository.upsert({ externalSeasonId: 100, name: 'Autumn 2026' });
    // A first-phase division that already uses id 184, as the phase page will claim it for "Cup"
    const first = await divisionRepository.upsert({ externalDivisionId: 184, leagueId: league.id, seasonId: season.id, name: 'Division 9' });

    const result = { itemsProcessed: { divisions: 0, teams: 0, standings: 0, fixtures: 0 } } as never;
    const ids = await (scraperOrchestrator as never as { syncPhase: (...a: unknown[]) => Promise<number[]> })
      .syncPhase(league.id, season.id, 748, 100, { phaseId: 87, name: 'Phase 2' }, result);

    expect(ids).toEqual([185]); // only Plate stored
    const after = await divisionRepository.findByExternalId(184, league.id, season.id);
    expect(after?.id).toBe(first.id);
    expect(after?.name).toBe('Division 9');
    expect(after?.phaseId).toBeNull();
    expect(await standingRepository.findByDivision(first.id)).toHaveLength(0);
  });
});

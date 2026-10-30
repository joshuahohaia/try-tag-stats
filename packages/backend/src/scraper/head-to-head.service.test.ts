import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'parsers/team-results.fixture.html'), 'utf8');
const fetchWithParams = vi.fn();
vi.mock('./client.js', () => ({ scraperClient: { fetchWithParams: (...a: unknown[]) => fetchWithParams(...a) } }));

const ctx = (seasonId: number) => ({ leagueId: 747, seasonId, divisionId: seasonId * 10, seasonName: `S${seasonId}`, divisionName: 'Div' });

describe('head-to-head service limits', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchWithParams.mockReset();
  });

  it('shares one run between identical concurrent requests', async () => {
    fetchWithParams.mockResolvedValue(html);
    const { getHeadToHead } = await import('./head-to-head.service.js');
    const [a, b] = await Promise.all([getHeadToHead(1, 9739, [ctx(1)]), getHeadToHead(1, 9739, [ctx(1)])]);
    expect(fetchWithParams).toHaveBeenCalledTimes(1);
    expect(a.record.played).toBe(2);
    expect(b.record.played).toBe(2);
  });

  it('reuses a team page for a different opponent', async () => {
    fetchWithParams.mockResolvedValue(html);
    const { getHeadToHead } = await import('./head-to-head.service.js');
    await getHeadToHead(1, 9739, [ctx(1)]);
    const other = await getHeadToHead(1, 8024, [ctx(1)]);
    expect(fetchWithParams).toHaveBeenCalledTimes(1);
    expect(other.record.played).toBe(0 + other.counted.length);
  });

  it('does not retry a failed page straight away', async () => {
    fetchWithParams.mockRejectedValue(new Error('boom'));
    const { getHeadToHead } = await import('./head-to-head.service.js');
    const first = await getHeadToHead(1, 9739, [ctx(1)]);
    const second = await getHeadToHead(1, 9739, [ctx(1)]);
    expect(fetchWithParams).toHaveBeenCalledTimes(1);
    expect(first.complete).toBe(false);
    expect(second.failedSeasons).toHaveLength(1);
  });

  it('reads at most the per-request season limit and says it is incomplete', async () => {
    fetchWithParams.mockResolvedValue(html);
    const { getHeadToHead, LIMITS } = await import('./head-to-head.service.js');
    const many = Array.from({ length: 12 }, (_, i) => ctx(i + 1));
    const r = await getHeadToHead(2, 9739, many);
    expect(fetchWithParams.mock.calls.length).toBeLessThanOrEqual(LIMITS.maxSeasonsPerRequest);
    expect(r.complete).toBe(false);
  });

  it('stops fetching once the per-minute budget is used', async () => {
    fetchWithParams.mockResolvedValue(html);
    const { getHeadToHead, LIMITS } = await import('./head-to-head.service.js');
    for (let t = 1; t <= 6; t++) {
      await getHeadToHead(100 + t, 9739, Array.from({ length: 8 }, (_, i) => ctx(i + 1)));
    }
    expect(fetchWithParams.mock.calls.length).toBeLessThanOrEqual(LIMITS.maxFetchesPerMinute);
    const last = await getHeadToHead(999, 9739, [ctx(1)]);
    expect(last.busy).toBe(true);
  });
});

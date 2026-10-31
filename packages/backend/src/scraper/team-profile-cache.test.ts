import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchWithParams = vi.fn();
vi.mock('./client.js', () => ({ scraperClient: { fetchWithParams: (...a: unknown[]) => fetchWithParams(...a) } }));
vi.mock('./parsers/team-profile.parser.js', async (orig) => ({
  ...(await orig<object>()),
  parseTeamProfile: () => ({ positionHistory: [], seasonStats: [], previousSeasons: [], playerAwards: [], fixtureHistory: [], upcomingFixtures: [] }),
}));

describe('team profile cache', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    fetchWithParams.mockReset();
  });

  it('fetches once for repeated and concurrent views of the same team page', async () => {
    fetchWithParams.mockResolvedValue('<html></html>');
    const { scraperOrchestrator } = await import('./index.js');
    await Promise.all([scraperOrchestrator.fetchTeamProfile(1, { leagueId: 2 }), scraperOrchestrator.fetchTeamProfile(1, { leagueId: 2 })]);
    await scraperOrchestrator.fetchTeamProfile(1, { leagueId: 2 });
    expect(fetchWithParams).toHaveBeenCalledTimes(1);
    await scraperOrchestrator.fetchTeamProfile(1, { leagueId: 3 });
    expect(fetchWithParams).toHaveBeenCalledTimes(2);
  });

  it('does not retry a failed fetch straight away', async () => {
    fetchWithParams.mockRejectedValue(new Error('boom'));
    const { scraperOrchestrator } = await import('./index.js');
    expect(await scraperOrchestrator.fetchTeamProfile(5)).toBeNull();
    expect(await scraperOrchestrator.fetchTeamProfile(5)).toBeNull();
    expect(fetchWithParams).toHaveBeenCalledTimes(1);
  });

  it('marks an older copy stale, and only returns it when the caller allows it', async () => {
    vi.useFakeTimers();
    fetchWithParams.mockResolvedValueOnce('<html></html>').mockRejectedValue(new Error('down'));
    const { scraperOrchestrator } = await import('./index.js');
    const first = await scraperOrchestrator.fetchTeamProfile(7, undefined, { allowStale: true });
    expect(first?.stale).toBe(false);
    const readAt = first?.fetchedAt;
    vi.advanceTimersByTime(30 * 60 * 1000);
    const strict = await scraperOrchestrator.fetchTeamProfile(7);
    expect(strict).toBeNull();
    vi.advanceTimersByTime(3 * 60 * 1000);
    const stale = await scraperOrchestrator.fetchTeamProfile(7, undefined, { allowStale: true });
    expect(stale?.stale).toBe(true);
    expect(stale?.fetchedAt).toBe(readAt);
  });

  it('does not serve a copy older than 6 hours', async () => {
    vi.useFakeTimers();
    fetchWithParams.mockResolvedValueOnce('<html></html>').mockRejectedValue(new Error('down'));
    const { scraperOrchestrator } = await import('./index.js');
    await scraperOrchestrator.fetchTeamProfile(8, undefined, { allowStale: true });
    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1000);
    expect(await scraperOrchestrator.fetchTeamProfile(8, undefined, { allowStale: true })).toBeNull();
  });
});

describe('scraper client block handling', () => {
  it('pauses all requests after a 429 and reports the status', async () => {
    vi.resetModules();
    vi.useRealTimers();
    vi.doUnmock('./client.js');
    const axios = (await import('axios')).default;
    const get = vi.fn().mockRejectedValue(Object.assign(new Error('429'), { isAxiosError: true, response: { status: 429, headers: {} } }));
    vi.spyOn(axios, 'create').mockReturnValue({ get } as never);
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const { scraperClient, SourceBlockedError } = await import('./client.js');
    await expect(scraperClient.fetch('/a')).rejects.toBeInstanceOf(SourceBlockedError);
    await expect(scraperClient.fetch('/b')).rejects.toBeInstanceOf(SourceBlockedError);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('honours Retry-After and fails queued requests without sending them', async () => {
    vi.resetModules();
    vi.useRealTimers();
    vi.doUnmock('./client.js');
    const axios = (await import('axios')).default;
    const get = vi.fn().mockRejectedValue(Object.assign(new Error('403'), { isAxiosError: true, response: { status: 403, headers: { 'retry-after': '120' } } }));
    vi.spyOn(axios, 'create').mockReturnValue({ get } as never);
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const { scraperClient, SourceBlockedError } = await import('./client.js');
    const results = await Promise.allSettled([scraperClient.fetch('/a'), scraperClient.fetch('/b'), scraperClient.fetch('/c'), scraperClient.fetch('/d')]);
    expect(results.every((r) => r.status === 'rejected' && r.reason instanceof SourceBlockedError)).toBe(true);
    const first = (results[0] as PromiseRejectedResult).reason as InstanceType<typeof SourceBlockedError>;
    expect(first.status).toBe(403);
    expect(first.retryAfterMs).toBe(120000);
    // two may have been in flight together (max concurrency 2); the queued ones send nothing
    expect(get.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

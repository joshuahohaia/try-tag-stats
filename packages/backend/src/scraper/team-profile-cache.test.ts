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

  it('serves the older copy when a later fetch fails', async () => {
    vi.useFakeTimers();
    fetchWithParams.mockResolvedValueOnce('<html></html>').mockRejectedValue(new Error('down'));
    const { scraperOrchestrator } = await import('./index.js');
    const first = await scraperOrchestrator.fetchTeamProfile(7);
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(await scraperOrchestrator.fetchTeamProfile(7)).toBe(first);
    expect(fetchWithParams).toHaveBeenCalledTimes(2);
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
});

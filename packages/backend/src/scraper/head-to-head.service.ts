import { ENDPOINTS } from '@trytag/shared';
import { scraperClient } from './client.js';
import { parseTeamProfile } from './parsers/team-profile.parser.js';
import { parseTeamResults } from './parsers/team-results.parser.js';
import { buildHeadToHead, type HeadToHeadResult, type SeasonResults } from './head-to-head.js';
import { logger } from '../utils/logger.js';

/** Pilot scope: only these Spawtz league ids are read. */
export const PILOT_LEAGUE_EXTERNAL_IDS = [747]; // Battersea Park Astro

/** Limits that keep visitor-triggered reads small. */
export const LIMITS = {
  /** Most season pages read for one team in one request, plus at most one extra page for the seasons list. */
  maxSeasonsPerRequest: 8,
  /** Success cache lifetime. */
  successTtlMs: 6 * 60 * 60 * 1000,
  /** A failed page is not retried for this long. */
  failureTtlMs: 10 * 60 * 1000,
  /** Most uncached Spawtz pages fetched per minute across all visitors. */
  maxFetchesPerMinute: 30,
  /** Most cached pages kept in memory. */
  maxCacheEntries: 300,
};

export interface SeasonContext {
  leagueId: number;
  seasonId: number;
  divisionId: number;
  seasonName: string;
  divisionName: string;
}

interface PageData {
  rows: SeasonResults['rows'];
  previousSeasons?: SeasonContext[];
}

type CacheEntry = { at: number; ok: true; value: PageData } | { at: number; ok: false };

const cache = new Map<string, CacheEntry>();
const inflightPage = new Map<string, Promise<PageData>>();
const inflightPair = new Map<string, Promise<HeadToHeadResponse>>();

class BusyError extends Error {}

let windowStart = 0;
let windowCount = 0;
function takeFetchBudget(): boolean {
  const now = Date.now();
  if (now - windowStart >= 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= LIMITS.maxFetchesPerMinute) return false;
  windowCount += 1;
  return true;
}

function remember(key: string, entry: CacheEntry) {
  cache.set(key, entry);
  while (cache.size > LIMITS.maxCacheEntries) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * Cache key is per team and season page only, never per pair, so a team's pages are
 * fetched once and reused for every opponent.
 */
function pageKey(teamExternalId: number, ctx: SeasonContext): string {
  return `${teamExternalId}:${ctx.leagueId}:${ctx.seasonId}:${ctx.divisionId}`;
}

async function getPage(teamExternalId: number, ctx: SeasonContext, wantPrevious: boolean): Promise<PageData> {
  const key = pageKey(teamExternalId, ctx);
  const hit = cache.get(key);
  if (hit) {
    const age = Date.now() - hit.at;
    if (!hit.ok && age < LIMITS.failureTtlMs) throw new Error('recent failure');
    if (hit.ok && age < LIMITS.successTtlMs && (!wantPrevious || hit.value.previousSeasons)) return hit.value;
  }

  const running = inflightPage.get(key);
  if (running) return running;

  if (!takeFetchBudget()) throw new BusyError('fetch budget used up');

  const p = (async () => {
    try {
      const html = await scraperClient.fetchWithParams(ENDPOINTS.TEAM_PROFILE, {
        TeamId: teamExternalId,
        VenueId: 0,
        LeagueId: ctx.leagueId,
        SeasonId: ctx.seasonId,
        DivisionId: ctx.divisionId,
      });
      const value: PageData = { rows: parseTeamResults(html) };
      if (wantPrevious) {
        value.previousSeasons = parseTeamProfile(html, teamExternalId).previousSeasons.flatMap((s) =>
          s.leagueId && s.seasonId && s.divisionId
            ? [{ leagueId: s.leagueId, seasonId: s.seasonId, divisionId: s.divisionId, seasonName: s.seasonName, divisionName: s.divisionName }]
            : []
        );
      }
      remember(key, { at: Date.now(), ok: true, value });
      return value;
    } catch (err) {
      remember(key, { at: Date.now(), ok: false });
      throw err;
    } finally {
      inflightPage.delete(key);
    }
  })();
  inflightPage.set(key, p);
  return p;
}

export interface HeadToHeadResponse extends HeadToHeadResult {
  complete: boolean;
  failedSeasons: string[];
  /** True when the per-minute fetch limit stopped some pages from loading. */
  busy: boolean;
  pilotLeagueExternalIds: number[];
}

async function compute(
  teamExternalId: number,
  opponentExternalId: number,
  knownSeasons: SeasonContext[]
): Promise<HeadToHeadResponse> {
  const contexts = new Map<string, SeasonContext>();
  const add = (c: SeasonContext) => {
    if (PILOT_LEAGUE_EXTERNAL_IDS.includes(c.leagueId)) contexts.set(`${c.seasonId}:${c.divisionId}`, c);
  };
  knownSeasons.forEach(add);

  const failed: string[] = [];
  let busy = false;
  const seasons: SeasonResults[] = [];
  const done = new Set<string>();

  const readSeason = async (ctx: SeasonContext, wantPrevious: boolean) => {
    const label = `${ctx.seasonName} - ${ctx.divisionName}`;
    try {
      const page = await getPage(teamExternalId, ctx, wantPrevious);
      done.add(`${ctx.seasonId}:${ctx.divisionId}`);
      seasons.push({
        seasonId: ctx.seasonId,
        divisionId: ctx.divisionId,
        seasonName: ctx.seasonName,
        divisionName: ctx.divisionName,
        rows: page.rows,
      });
      return page;
    } catch (err) {
      if (err instanceof BusyError) busy = true;
      else logger.warn({ err, label }, 'Head-to-head: season page failed');
      failed.push(label);
      return null;
    }
  };

  // The first known season's page also lists the earlier seasons the team played.
  if (knownSeasons.length > 0) {
    const first = await readSeason(knownSeasons[0], true);
    first?.previousSeasons?.forEach(add);
  }

  const rest = [...contexts.values()].filter((c) => !done.has(`${c.seasonId}:${c.divisionId}`) && !failed.includes(`${c.seasonName} - ${c.divisionName}`));
  const wanted = rest.slice(0, Math.max(0, LIMITS.maxSeasonsPerRequest - seasons.length - failed.length));
  for (const ctx of wanted) await readSeason(ctx, false);

  const truncated = rest.length > wanted.length;
  return {
    ...buildHeadToHead(opponentExternalId, seasons),
    complete: failed.length === 0 && !truncated,
    failedSeasons: failed,
    busy,
    pilotLeagueExternalIds: PILOT_LEAGUE_EXTERNAL_IDS,
  };
}

/**
 * Read-through only: nothing is written to the database. Reads at most
 * LIMITS.maxSeasonsPerRequest season pages per team, one at a time, through the
 * rate-limited scraper client. Identical concurrent requests share one run.
 */
export function getHeadToHead(
  teamExternalId: number,
  opponentExternalId: number,
  knownSeasons: SeasonContext[]
): Promise<HeadToHeadResponse> {
  const key = `${teamExternalId}:${opponentExternalId}`;
  const running = inflightPair.get(key);
  if (running) return running;
  const p = compute(teamExternalId, opponentExternalId, knownSeasons).finally(() => inflightPair.delete(key));
  inflightPair.set(key, p);
  return p;
}

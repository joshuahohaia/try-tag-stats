import { ENDPOINTS } from '@trytag/shared';
import { scraperClient } from './client.js';
import { parseTeamProfile } from './parsers/team-profile.parser.js';
import { parseTeamResults } from './parsers/team-results.parser.js';
import { buildHeadToHead, type HeadToHeadResult, type SeasonResults } from './head-to-head.js';
import { logger } from '../utils/logger.js';

/** Pilot scope: only these Spawtz league ids are read. */
export const PILOT_LEAGUE_EXTERNAL_IDS = [747]; // Battersea Park Astro

const MAX_SEASONS = 12;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface SeasonContext {
  leagueId: number;
  seasonId: number;
  divisionId: number;
  seasonName: string;
  divisionName: string;
}

const cache = new Map<string, { at: number; value: SeasonResults }>();
const inflight = new Map<string, Promise<string>>();

async function fetchProfileHtml(teamExternalId: number, ctx: SeasonContext): Promise<string> {
  const key = `${teamExternalId}:${ctx.leagueId}:${ctx.seasonId}:${ctx.divisionId}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = scraperClient
    .fetchWithParams(ENDPOINTS.TEAM_PROFILE, {
      TeamId: teamExternalId,
      VenueId: 0,
      LeagueId: ctx.leagueId,
      SeasonId: ctx.seasonId,
      DivisionId: ctx.divisionId,
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export interface HeadToHeadResponse extends HeadToHeadResult {
  complete: boolean;
  failedSeasons: string[];
  pilotLeagueExternalIds: number[];
}

/**
 * Read-through only: nothing is written to the database. Seasons are limited to the
 * pilot league, fetched one at a time through the scraper's rate limiter, and cached
 * in memory.
 */
export async function getHeadToHead(
  teamExternalId: number,
  opponentExternalId: number,
  knownSeasons: SeasonContext[]
): Promise<HeadToHeadResponse> {
  const contexts = new Map<string, SeasonContext>();
  const add = (c: SeasonContext) => {
    if (!PILOT_LEAGUE_EXTERNAL_IDS.includes(c.leagueId)) return;
    contexts.set(`${c.seasonId}:${c.divisionId}`, c);
  };
  knownSeasons.forEach(add);

  const failed: string[] = [];

  // The profile lists earlier seasons the team played in, with their ids.
  if (knownSeasons.length > 0) {
    try {
      const first = knownSeasons[0];
      const html = await fetchProfileHtml(teamExternalId, first);
      for (const s of parseTeamProfile(html, teamExternalId).previousSeasons) {
        if (s.leagueId && s.seasonId && s.divisionId) {
          add({
            leagueId: s.leagueId,
            seasonId: s.seasonId,
            divisionId: s.divisionId,
            seasonName: s.seasonName,
            divisionName: s.divisionName,
          });
        }
      }
    } catch (err) {
      logger.warn({ err, teamExternalId }, 'Head-to-head: could not read previous seasons');
      failed.push('previous seasons list');
    }
  }

  const list = [...contexts.values()].slice(0, MAX_SEASONS);
  const seasons: SeasonResults[] = [];

  for (const ctx of list) {
    const label = `${ctx.seasonName} - ${ctx.divisionName}`;
    const key = `${teamExternalId}:${ctx.leagueId}:${ctx.seasonId}:${ctx.divisionId}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      seasons.push(hit.value);
      continue;
    }
    try {
      const html = await fetchProfileHtml(teamExternalId, ctx);
      const value: SeasonResults = {
        seasonId: ctx.seasonId,
        divisionId: ctx.divisionId,
        seasonName: ctx.seasonName,
        divisionName: ctx.divisionName,
        rows: parseTeamResults(html),
      };
      cache.set(key, { at: Date.now(), value });
      seasons.push(value);
    } catch (err) {
      logger.warn({ err, label }, 'Head-to-head: season fetch failed');
      failed.push(label);
    }
  }

  return {
    ...buildHeadToHead(opponentExternalId, seasons),
    complete: failed.length === 0 && contexts.size <= MAX_SEASONS,
    failedSeasons: failed,
    pilotLeagueExternalIds: PILOT_LEAGUE_EXTERNAL_IDS,
  };
}

import { ENDPOINTS } from '@trytag/shared';
import { scraperClient } from './client.js';
import { parsePhaseResults, type PhaseGame, type PhaseTableResults } from './parsers/phase-results.parser.js';
import { logger } from '../utils/logger.js';

/**
 * Played games of a later phase for one division. The Spawtz division standings page holds the
 * points tooltips and a Results table with the real scores, so one fetch per division serves every
 * team page of that division. Cached in memory.
 */
const SUCCESS_TTL_MS = 10 * 60 * 1000;
const FAILURE_TTL_MS = 2 * 60 * 1000;
const STALE_MAX_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 50;

type Entry = { at: number; ok: boolean; value: PhaseTableResults[] | null };
const cache = new Map<string, Entry>();
const lastGood = new Map<string, { at: number; value: PhaseTableResults[] }>();
const inflight = new Map<string, Promise<PhaseTableResults[] | null>>();

export interface TeamPhaseResult extends PhaseGame {
  divisionId: number | null;
  heading: string | null;
}

export function clearPhaseResultsCache(): void {
  cache.clear();
  lastGood.clear();
  inflight.clear();
}

async function load(leagueId: number, seasonId: number, phaseId: number, divisionId: number): Promise<PhaseTableResults[] | null> {
  const key = `${leagueId}:${seasonId}:${phaseId}:${divisionId}`;
  const hit = cache.get(key);
  if (hit && hit.ok && Date.now() - hit.at < SUCCESS_TTL_MS) return hit.value;
  const stale = () => {
    const g = lastGood.get(key);
    return g && Date.now() - g.at < STALE_MAX_MS ? g.value : null;
  };
  if (hit && !hit.ok && Date.now() - hit.at < FAILURE_TTL_MS) return stale();

  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      try {
        const html = await scraperClient.fetchWithParams(ENDPOINTS.STANDINGS, {
          VenueId: '0',
          LeagueId: leagueId,
          SeasonId: seasonId,
          DivisionId: divisionId,
          PhaseId: phaseId,
        });
        const value = parsePhaseResults(html);
        const at = Date.now();
        cache.set(key, { at, ok: true, value });
        lastGood.set(key, { at, value });
        while (lastGood.size > MAX_ENTRIES) {
          const oldest = lastGood.keys().next().value;
          if (oldest === undefined) break;
          lastGood.delete(oldest);
          cache.delete(oldest);
        }
        return value;
      } catch (err) {
        logger.warn({ leagueId, seasonId, phaseId, error: (err as Error).message }, 'Phase results fetch failed');
        cache.set(key, { at: Date.now(), ok: false, value: null });
        return stale();
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
  }
  return p;
}

/**
 * Verified played games of one team in one phase table, oldest first. Empty when the page could not
 * be read or the team's games do not add up to its standings row (never guessed).
 */
export async function getTeamPhaseResults(
  leagueId: number,
  seasonId: number,
  phaseId: number,
  divisionId: number,
  externalTeamId: number
): Promise<TeamPhaseResult[]> {
  const tables = await load(leagueId, seasonId, phaseId, divisionId);
  if (!tables) return [];
  const table = tables.find((t) => t.divisionId === divisionId);
  if (!table) return [];
  if (!table.verifiedTeamIds.includes(externalTeamId)) {
    logger.warn({ leagueId, seasonId, phaseId, divisionId, externalTeamId }, 'Phase games do not add up to standings; not shown');
    return [];
  }
  return table.games
    .filter((g) => g.homeTeamId === externalTeamId || g.awayTeamId === externalTeamId)
    .map((g) => ({ ...g, divisionId: table.divisionId, heading: table.heading }));
}

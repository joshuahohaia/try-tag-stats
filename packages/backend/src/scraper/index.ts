import { ENDPOINTS } from '@trytag/shared';
import type { TeamPositionHistory, TeamSeasonStats, TeamPreviousSeason, ScrapedPlayerAward, ScrapedFixture } from '@trytag/shared';
import { scraperClient } from './client.js';
import type { StandingsPhase } from './parsers/standings.parser.js';
import { pickCurrentSeasonId, shouldMarkUnseenInactive } from './season-utils.js';
import {
  parseLeagueList,
  parseStandings,
  parsePhases,
  parseFixtures,
  parseStatistics,
  parseTeamProfile,
} from './parsers/index.js';
import {
  regionRepository,
  leagueRepository,
  seasonRepository,
  divisionRepository,
  teamRepository,
  standingRepository,
  fixtureRepository,
  playerRepository,
  playerAwardRepository,
  syncRunRepository,
} from '../database/repositories/index.js';
import { getDatabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';

interface SyncResult {
  success: boolean;
  duration: number;
  itemsProcessed: {
    regions: number;
    leagues: number;
    seasons: number;
    divisions: number;
    teams: number;
    standings: number;
    fixtures: number;
    playerAwards: number;
  };
  errors: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const PROFILE_FRESH_MS = 20 * 60 * 1000;
const PROFILE_FAILURE_MS = 2 * 60 * 1000;
const PROFILE_STALE_MS = 6 * 60 * 60 * 1000;
const PROFILE_CACHE_MAX = 300;

type TeamProfileResult = {
  positionHistory: TeamPositionHistory[];
  seasonStats: TeamSeasonStats[];
  previousSeasons: TeamPreviousSeason[];
  playerAwards: ScrapedPlayerAward[];
  fixtureHistory: ScrapedFixture[];
  upcomingFixtures: ScrapedFixture[];
  /** Epoch ms when Spawtz was last read for this data. */
  fetchedAt?: number;
  /** True when Spawtz failed and this is an older copy. */
  stale?: boolean;
};

class ScraperOrchestrator {
  private errors: string[] = [];

  async runFullSync(): Promise<SyncResult> {
    const startTime = Date.now();
    // SQLite CURRENT_TIMESTAMP format (UTC, 'YYYY-MM-DD HH:MM:SS') so it compares with last_seen_at
    const syncStartedAt = new Date(startTime).toISOString().replace('T', ' ').slice(0, 19);
    this.errors = [];

    let jobId: number | null = null;
    try {
      jobId = await syncRunRepository.start();
    } catch (err) {
      logger.warn({ error: err }, 'Could not record sync start');
    }

    const result: SyncResult = {
      success: true,
      duration: 0,
      itemsProcessed: {
        regions: 0,
        leagues: 0,
        seasons: 0,
        divisions: 0,
        teams: 0,
        standings: 0,
        fixtures: 0,
        playerAwards: 0,
      },
      errors: [],
    };

    try {
      logger.info('Starting full sync...');

      // Step 1: Fetch and parse league list
      logger.info('Fetching league list...');
      const leagueListHtml = await scraperClient.fetch(ENDPOINTS.LEAGUE_LIST);
      const { items, regions, seasons } = parseLeagueList(leagueListHtml);

      logger.info({ itemCount: items.length }, 'Parsed league list');

      const activeBefore = await divisionRepository.countActive();
      const newestKnownSeasonBefore = await seasonRepository.maxExternalSeasonId();

      // Step 2: Save regions
      for (const regionName of regions) {
        try {
          await regionRepository.upsert(regionName, slugify(regionName));
          result.itemsProcessed.regions++;
        } catch (err) {
          this.logError(`Failed to save region ${regionName}`, err);
        }
      }

      // Step 3: Save seasons
      for (const [seasonId, seasonName] of seasons) {
        try {
          await seasonRepository.upsert({
            externalSeasonId: seasonId,
            name: seasonName,
          });
          result.itemsProcessed.seasons++;
        } catch (err) {
          this.logError(`Failed to save season ${seasonName}`, err);
        }
      }

      // Step 4: Save leagues and divisions, then sync division data
      const processedDivisions = new Set<string>();
      const processedPhaseLeagues = new Set<string>();
      const pendingPhases: Array<{ leagueDbId: number; seasonDbId: number; leagueId: number; seasonId: number; leagueName: string; phases: StandingsPhase[] }> = [];

      for (const item of items) {
        try {
          // Get or create region
          const region = await regionRepository.findBySlug(slugify(item.region));
          const regionId = region?.id;

          // Upsert league
          const league = await leagueRepository.upsert({
            externalLeagueId: item.leagueId,
            name: item.leagueName,
            regionId,
          });
          result.itemsProcessed.leagues++;

          // Get or create season
          let season = await seasonRepository.findByExternalId(item.seasonId);
          if (!season) {
            season = await seasonRepository.upsert({
              externalSeasonId: item.seasonId,
              name: item.seasonName,
            });
            result.itemsProcessed.seasons++;
          }

          // Upsert division
          const division = await divisionRepository.upsert({
            externalDivisionId: item.divisionId,
            leagueId: league.id,
            seasonId: season.id,
            name: item.divisionName,
          });
          result.itemsProcessed.divisions++;

          // Track processed divisions to avoid duplicate syncs
          const divKey = `${item.leagueId}-${item.seasonId}-${item.divisionId}`;
          if (processedDivisions.has(divKey)) continue;
          processedDivisions.add(divKey);

          // Sync division data (standings and fixtures)
          const phases = await this.syncDivisionData(division.id, item.leagueId, item.seasonId, item.divisionId, result);

          // Later phases (e.g. Cup and Plate) are not on the league list. Remember which
          // league and season offer extra phases; they are fetched after every first-phase
          // division has been stored, so a reused DivisionId can never overwrite one.
          const phaseKey = `${item.leagueId}-${item.seasonId}`;
          if (!processedPhaseLeagues.has(phaseKey)) {
            processedPhaseLeagues.add(phaseKey);
            const extra = phases.filter((p) => p.phaseId !== 0);
            if (extra.length > 0) {
              pendingPhases.push({ leagueDbId: league.id, seasonDbId: season.id, leagueId: item.leagueId, seasonId: item.seasonId, leagueName: item.leagueName, phases: extra });
            }
          }

        } catch (err) {
          this.logError(`Failed to process league item ${item.leagueName}`, err);
        }
      }

      // Step 5: later phases, one page per extra phase per league and season
      for (const job of pendingPhases) {
        for (const phase of job.phases) {
          try {
            const ids = await this.syncPhase(job.leagueDbId, job.seasonDbId, job.leagueId, job.seasonId, phase, result);
            for (const id of ids) processedDivisions.add(`${job.leagueId}-${job.seasonId}-${id}`);
          } catch (err) {
            this.logError(`Failed to sync phase ${phase.name} for league ${job.leagueName}`, err);
          }
        }
      }

      // Newest season on the live list is the current one
      const currentSeasonId = pickCurrentSeasonId(seasons.keys());
      if (currentSeasonId !== null) {
        await seasonRepository.setCurrentByExternalId(currentSeasonId);
      }

      // Hide (never delete) divisions missing from a complete, error-free sync
      if (
        shouldMarkUnseenInactive({
          hadErrors: this.errors.length > 0,
          seenDivisions: processedDivisions.size,
          previouslyActive: activeBefore,
          newestSeasonOnList: currentSeasonId,
          newestSeasonKnown: newestKnownSeasonBefore,
        })
      ) {
        const hidden = await divisionRepository.markUnseenInactive(syncStartedAt);
        logger.info({ hidden }, 'Marked divisions missing from the league list as inactive');
      } else {
        logger.warn('Skipped inactive marking: sync had errors or an unexpectedly small league list');
      }

      result.success = this.errors.length === 0;
      result.errors = this.errors;

    } catch (err) {
      this.logError('Full sync failed', err);
      result.success = false;
      result.errors = this.errors;
    }

    result.duration = Date.now() - startTime;
    logger.info({ result }, 'Full sync completed');

    if (jobId !== null) {
      try {
        const total = Object.values(result.itemsProcessed).reduce((a, b) => a + b, 0);
        await syncRunRepository.finish(jobId, result.success, total, result.errors.slice(0, 3).join(' | ') || undefined);
      } catch (err) {
        logger.warn({ error: err }, 'Could not record sync result');
      }
    }

    return result;
  }

  async syncDivisionData(
    divisionId: number,
    leagueId: number,
    seasonId: number,
    externalDivisionId: number,
    result: SyncResult
  ): Promise<StandingsPhase[]> {
    const params = {
      VenueId: '0',
      LeagueId: leagueId,
      SeasonId: seasonId,
      DivisionId: externalDivisionId,
    };
    let phases: StandingsPhase[] = [];

    // Sync standings
    try {
      logger.debug({ divisionId }, 'Fetching standings...');
      const standingsHtml = await scraperClient.fetchWithParams(ENDPOINTS.STANDINGS, params);
      const { standings } = parseStandings(standingsHtml);
      phases = parsePhases(standingsHtml);

      logger.info({ count: standings.length }, 'Standings parsed');

      await this.saveStandings(divisionId, standings, result);
      logger.info('Standings sync completed');

    } catch (err) {
      this.logError(`Failed to sync standings for division ${divisionId}`, err);
      throw err; // Re-throw for debugging
    }

    // Sync fixtures
    try {
      logger.debug({ divisionId }, 'Fetching fixtures...');
      const fixturesHtml = await scraperClient.fetchWithParams(ENDPOINTS.FIXTURES, params);
      const { fixtures } = parseFixtures(fixturesHtml);
      await this.saveFixtures(divisionId, fixtures, result);

    } catch (err) {
      this.logError(`Failed to sync fixtures for division ${divisionId}`, err);
    }

    // Sync statistics (Player Awards)
    try {
      logger.debug({ divisionId }, 'Fetching statistics...');
      const statsHtml = await scraperClient.fetchWithParams(ENDPOINTS.STATISTICS, params);
      const { playerAwards } = parseStatistics(statsHtml);

      const db = getDatabase();

      for (const award of playerAwards) {
        // Ensure team exists (if we have name, we can try to find/upsert)
        let teamId = 0;
        if (award.teamId) {
          const team = await teamRepository.upsert(award.teamId, award.teamName);
          teamId = team.id;
        } else if (award.teamName) {
          // Try to find by name
          const team = await teamRepository.findByName(award.teamName);
          if (team) {
            teamId = team.id;
          } else {
            logger.warn({ award }, 'Skipping award: Team not found by name');
            continue;
          }
        }

        // Ensure player exists
        const player = await playerRepository.upsert(award.playerName);

        // Link player to team/division
        await db.execute({
          sql: `
            INSERT OR IGNORE INTO player_teams (player_id, team_id, division_id)
            VALUES (?, ?, ?)
          `,
          args: [player.id, teamId, divisionId],
        });

        // Upsert award
        await playerAwardRepository.upsert({
          playerId: player.id,
          teamId: teamId,
          divisionId,
          fixtureId: null, // Scraper doesn't link to specific fixture yet
          awardType: award.awardType,
          awardCount: award.awardCount
        });

        if (result.itemsProcessed.playerAwards !== undefined) {
          result.itemsProcessed.playerAwards++;
        }
      }
    } catch (err) {
      this.logError(`Failed to sync statistics for division ${divisionId}`, err);
    }

    // Update last scraped timestamp
    await divisionRepository.updateLastScraped(divisionId);

    return phases;
  }

  private async saveStandings(
    divisionId: number,
    standings: import('@trytag/shared').ScrapedStandingRow[],
    result: SyncResult
  ): Promise<void> {
    for (const standing of standings) {
      logger.debug({ teamName: standing.teamName }, 'Processing standing');
      const team = await teamRepository.upsert(standing.teamId, standing.teamName);
      await teamRepository.linkToDivision(team.id, divisionId);
      result.itemsProcessed.teams++;

      await standingRepository.upsert({
        teamId: team.id,
        divisionId,
        position: standing.position,
        played: standing.played,
        wins: standing.wins,
        losses: standing.losses,
        draws: standing.draws,
        forfeitsFor: standing.forfeitsFor,
        forfeitsAgainst: standing.forfeitsAgainst,
        pointsFor: standing.pointsFor,
        pointsAgainst: standing.pointsAgainst,
        pointDifference: standing.pointDifference,
        bonusPoints: standing.bonusPoints,
        totalPoints: standing.totalPoints,
      });
      result.itemsProcessed.standings++;
    }
  }

  /** Stores parsed fixtures (and the teams they mention) for one division. */
  private async saveFixtures(divisionId: number, fixtures: ScrapedFixture[], result: SyncResult): Promise<void> {
    for (const fixture of fixtures) {
      // Ensure teams exist
      const homeTeam = await teamRepository.upsert(fixture.homeTeamId, fixture.homeTeamName);
      const awayTeam = await teamRepository.upsert(fixture.awayTeamId, fixture.awayTeamName);

      await fixtureRepository.upsert({
        externalFixtureId: fixture.fixtureId ?? null,
        divisionId,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        fixtureDate: fixture.date,
        fixtureTime: fixture.time,
        pitch: fixture.pitch,
        roundNumber: fixture.round ?? null,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        status: fixture.status,
        isForfeit: false,
      });
      result.itemsProcessed.fixtures++;
    }
  }

  /**
   * Standings for a later phase (e.g. Cup and Plate). One request returns every
   * table of the phase; each table becomes its own division, identified by the
   * DivisionId in its team links. A table without a clear id is skipped, never guessed.
   * Standings only: fixtures for these divisions are not fetched here.
   */
  private async syncPhase(
    leagueDbId: number,
    seasonDbId: number,
    leagueId: number,
    seasonId: number,
    phase: StandingsPhase,
    result: SyncResult
  ): Promise<number[]> {
    const html = await scraperClient.fetchWithParams(ENDPOINTS.STANDINGS, {
      VenueId: '0',
      LeagueId: leagueId,
      SeasonId: seasonId,
      PhaseId: phase.phaseId,
    });
    const { tables } = parseStandings(html);
    const seen: number[] = [];
    for (const table of tables) {
      if (table.divisionId === null || seen.includes(table.divisionId)) {
        logger.warn({ leagueId, seasonId, phase: phase.name, heading: table.heading }, 'Skipped phase table without a unique division id');
        continue;
      }
      // Fail-safe: if Spawtz reused this DivisionId for a division we already store under
      // another phase (or the first phase), leave that row alone instead of overwriting it.
      const existing = await divisionRepository.findByExternalId(table.divisionId, leagueDbId, seasonDbId);
      if (existing && (existing.phaseId ?? null) !== phase.phaseId) {
        logger.warn(
          { leagueId, seasonId, phase: phase.name, divisionId: table.divisionId, existingPhaseId: existing.phaseId ?? null },
          'Skipped phase table: DivisionId already stored under a different phase'
        );
        continue;
      }
      const division = await divisionRepository.upsert({
        externalDivisionId: table.divisionId,
        leagueId: leagueDbId,
        seasonId: seasonDbId,
        name: table.heading ?? `${phase.name} ${table.divisionId}`,
        phaseId: phase.phaseId,
        phaseName: phase.name,
      });
      result.itemsProcessed.divisions++;
      await this.saveStandings(division.id, table.standings, result);
      seen.push(table.divisionId);

      // The fixtures page only returns a phase's fixtures when PhaseId is sent together with the
      // division. Without it Spawtz answers with the first phase, which has no upcoming rows.
      try {
        const fixturesHtml = await scraperClient.fetchWithParams(ENDPOINTS.FIXTURES, {
          VenueId: '0',
          LeagueId: leagueId,
          SeasonId: seasonId,
          DivisionId: table.divisionId,
          PhaseId: phase.phaseId,
        });
        const { fixtures } = parseFixtures(fixturesHtml);
        await this.saveFixtures(division.id, fixtures, result);
      } catch (err) {
        this.logError(`Failed to sync fixtures for phase division ${table.divisionId}`, err);
      }
    }
    logger.info({ leagueId, seasonId, phase: phase.name, divisions: seen.length }, 'Phase standings synced');
    return seen;
  }

  async syncSingleDivision(externalLeagueId: number, externalSeasonId: number, externalDivisionId: number): Promise<void> {
    const league = await leagueRepository.findByExternalId(externalLeagueId);
    if (!league) {
      throw new Error(`League not found: ${externalLeagueId}`);
    }

    const season = await seasonRepository.findByExternalId(externalSeasonId);
    if (!season) {
      throw new Error(`Season not found: ${externalSeasonId}`);
    }

    const division = await divisionRepository.findByExternalId(externalDivisionId, league.id, season.id);
    if (!division) {
      throw new Error(`Division not found: ${externalDivisionId}`);
    }

    const result: SyncResult = {
      success: true,
      duration: 0,
      itemsProcessed: { regions: 0, leagues: 0, seasons: 0, divisions: 0, teams: 0, standings: 0, fixtures: 0, playerAwards: 0 },
      errors: [],
    };

    await this.syncDivisionData(division.id, externalLeagueId, externalSeasonId, externalDivisionId, result);
  }

  private logError(message: string, err: unknown): void {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, message);
    this.errors.push(`${message}: ${errorMessage}`);
  }

  private profileCache = new Map<string, { at: number; ok: boolean }>();
  private profileLastGood = new Map<string, TeamProfileResult & { fetchedAt: number }>();
  private profileInflight = new Map<string, Promise<TeamProfileResult | null>>();

  /**
   * Shared cache for live team page requests: fresh for 20 min. fetchedAt is when Spawtz was last read.
   * With allowStale, an older copy (up to 6 h) is returned when Spawtz fails, marked stale: true.
   * Without it a failed fetch returns null, so callers never show old data as current.
   */
  async fetchTeamProfile(
    externalTeamId: number,
    context?: { leagueId?: number; seasonId?: number; divisionId?: number },
    options: { allowStale?: boolean } = {}
  ): Promise<TeamProfileResult | null> {
    const key = [externalTeamId, context?.leagueId ?? 0, context?.seasonId ?? 0, context?.divisionId ?? 0].join(':');
    const hit = this.profileCache.get(key);
    const age = hit ? Date.now() - hit.at : Infinity;
    const good = this.profileLastGood.get(key);

    if (hit?.ok && good && age < PROFILE_FRESH_MS) return { ...good, stale: false };
    if (hit && !hit.ok && age < PROFILE_FAILURE_MS) return this.staleCopy(key, options);

    let p = this.profileInflight.get(key);
    if (!p) {
      p = this.fetchTeamProfileUncached(externalTeamId, context)
        .then((value) => {
          const at = Date.now();
          this.profileCache.set(key, { at, ok: !!value });
          if (!value) return null;
          const stamped = { ...value, fetchedAt: at, stale: false };
          this.profileLastGood.set(key, stamped);
          return stamped;
        })
        .finally(() => {
          this.profileInflight.delete(key);
          while (this.profileLastGood.size > PROFILE_CACHE_MAX) {
            const oldest = this.profileLastGood.keys().next().value;
            if (oldest === undefined) break;
            this.profileLastGood.delete(oldest);
            this.profileCache.delete(oldest);
          }
        });
      this.profileInflight.set(key, p);
    }
    return (await p) ?? this.staleCopy(key, options);
  }

  private staleCopy(key: string, options: { allowStale?: boolean }): TeamProfileResult | null {
    if (!options.allowStale) return null;
    const last = this.profileLastGood.get(key);
    if (!last || Date.now() - last.fetchedAt >= PROFILE_STALE_MS) return null;
    logger.warn({ key, ageMs: Date.now() - last.fetchedAt }, 'Spawtz fetch failed, serving older team profile marked stale');
    return { ...last, stale: true };
  }

  private async fetchTeamProfileUncached(
    externalTeamId: number,
    context?: {
      leagueId?: number;
      seasonId?: number;
      divisionId?: number;
    }
  ): Promise<{
    positionHistory: TeamPositionHistory[];
    seasonStats: TeamSeasonStats[];
    previousSeasons: TeamPreviousSeason[];
    playerAwards: ScrapedPlayerAward[];
    fixtureHistory: ScrapedFixture[];
    upcomingFixtures: ScrapedFixture[];
  } | null> {
    try {
      logger.info({ externalTeamId, context }, 'Fetching team profile from website...');

      // Build params - include context if available for fixtures to load
      const params: Record<string, number> = {
        TeamId: externalTeamId,
        VenueId: 0,
      };

      if (context?.leagueId) params.LeagueId = context.leagueId;
      if (context?.seasonId) params.SeasonId = context.seasonId;
      if (context?.divisionId) params.DivisionId = context.divisionId;

      const html = await scraperClient.fetchWithParams(ENDPOINTS.TEAM_PROFILE, params);

      const profile = parseTeamProfile(html, externalTeamId);

      logger.info({
        externalTeamId,
        positionHistoryCount: profile.positionHistory.length,
        seasonStatsCount: profile.seasonStats.length,
        previousSeasonsCount: profile.previousSeasons.length,
        playerAwardsCount: profile.playerAwards.length,
        fixtureHistoryCount: profile.fixtureHistory.length,
        upcomingFixturesCount: profile.upcomingFixtures.length,
      }, 'Team profile fetched successfully');

      return {
        positionHistory: profile.positionHistory,
        seasonStats: profile.seasonStats,
        previousSeasons: profile.previousSeasons,
        playerAwards: profile.playerAwards,
        fixtureHistory: profile.fixtureHistory,
        upcomingFixtures: profile.upcomingFixtures,
      };
    } catch (err) {
      this.logError(`Failed to fetch team profile for ${externalTeamId}`, err);
      return null;
    }
  }
}

export const scraperOrchestrator = new ScraperOrchestrator();

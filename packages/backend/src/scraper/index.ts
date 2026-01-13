import { ENDPOINTS } from '@trytag/shared';
import { scraperClient } from './client.js';
import {
  parseLeagueList,
  parseStandings,
  parseFixtures,
  parseStatistics,
} from './parsers/index.js';
import {
  regionRepository,
  leagueRepository,
  seasonRepository,
  divisionRepository,
  teamRepository,
  standingRepository,
  fixtureRepository,
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
  };
  errors: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

class ScraperOrchestrator {
  private errors: string[] = [];

  async runFullSync(): Promise<SyncResult> {
    const startTime = Date.now();
    this.errors = [];

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

      // Step 2: Save regions
      for (const regionName of regions) {
        try {
          regionRepository.upsert(regionName, slugify(regionName));
          result.itemsProcessed.regions++;
        } catch (err) {
          this.logError(`Failed to save region ${regionName}`, err);
        }
      }

      // Step 3: Save seasons
      for (const [seasonId, seasonName] of seasons) {
        try {
          seasonRepository.upsert({
            externalSeasonId: seasonId,
            name: seasonName,
            isCurrent: seasonName.toLowerCase().includes('winter 2025') || seasonName.toLowerCase().includes('spring 2026'),
          });
          result.itemsProcessed.seasons++;
        } catch (err) {
          this.logError(`Failed to save season ${seasonName}`, err);
        }
      }

      // Step 4: Save leagues and divisions, then sync division data
      const processedDivisions = new Set<string>();

      for (const item of items) {
        try {
          // Get or create region
          const region = regionRepository.findBySlug(slugify(item.region));
          const regionId = region?.id;

          // Upsert league
          const league = leagueRepository.upsert({
            externalLeagueId: item.leagueId,
            name: item.leagueName,
            regionId,
          });
          result.itemsProcessed.leagues++;

          // Get or create season
          let season = seasonRepository.findByExternalId(item.seasonId);
          if (!season) {
            season = seasonRepository.upsert({
              externalSeasonId: item.seasonId,
              name: item.seasonName,
            });
            result.itemsProcessed.seasons++;
          }

          // Upsert division
          const division = divisionRepository.upsert({
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
          await this.syncDivisionData(division.id, item.leagueId, item.seasonId, item.divisionId, result);

        } catch (err) {
          this.logError(`Failed to process league item ${item.leagueName}`, err);
        }
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

    return result;
  }

  async syncDivisionData(
    divisionId: number,
    leagueId: number,
    seasonId: number,
    externalDivisionId: number,
    result: SyncResult
  ): Promise<void> {
    const params = {
      VenueId: '0',
      LeagueId: leagueId,
      SeasonId: seasonId,
      DivisionId: externalDivisionId,
    };

    // Sync standings
    try {
      logger.debug({ divisionId }, 'Fetching standings...');
      const standingsHtml = await scraperClient.fetchWithParams(ENDPOINTS.STANDINGS, params);
      const { standings } = parseStandings(standingsHtml);

      const db = getDatabase();
      const transaction = db.transaction(() => {
        for (const standing of standings) {
          // Upsert team
          const team = teamRepository.upsert(standing.teamId, standing.teamName);
          teamRepository.linkToDivision(team.id, divisionId);
          result.itemsProcessed.teams++;

          // Upsert standing
          standingRepository.upsert({
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
      });
      transaction();

    } catch (err) {
      this.logError(`Failed to sync standings for division ${divisionId}`, err);
    }

    // Sync fixtures
    try {
      logger.debug({ divisionId }, 'Fetching fixtures...');
      const fixturesHtml = await scraperClient.fetchWithParams(ENDPOINTS.FIXTURES, params);
      const { fixtures } = parseFixtures(fixturesHtml);

      const db = getDatabase();
      const transaction = db.transaction(() => {
        for (const fixture of fixtures) {
          // Ensure teams exist
          const homeTeam = teamRepository.upsert(fixture.homeTeamId, fixture.homeTeamName);
          const awayTeam = teamRepository.upsert(fixture.awayTeamId, fixture.awayTeamName);

          // Upsert fixture
          fixtureRepository.upsert({
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
      });
      transaction();

    } catch (err) {
      this.logError(`Failed to sync fixtures for division ${divisionId}`, err);
    }

    // Update last scraped timestamp
    divisionRepository.updateLastScraped(divisionId);
  }

  async syncSingleDivision(leagueId: number, seasonId: number, divisionId: number): Promise<void> {
    const division = divisionRepository.findByExternalId(divisionId, leagueId, seasonId);
    if (!division) {
      throw new Error(`Division not found: ${divisionId}`);
    }

    const result: SyncResult = {
      success: true,
      duration: 0,
      itemsProcessed: { regions: 0, leagues: 0, seasons: 0, divisions: 0, teams: 0, standings: 0, fixtures: 0 },
      errors: [],
    };

    await this.syncDivisionData(division.id, leagueId, seasonId, divisionId, result);
  }

  private logError(message: string, err: unknown): void {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, message);
    this.errors.push(`${message}: ${errorMessage}`);
  }
}

export const scraperOrchestrator = new ScraperOrchestrator();

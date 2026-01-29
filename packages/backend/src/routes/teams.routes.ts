import { Router } from 'express';
import { logger } from '../utils/logger.js';
import {
  TeamPositionHistory,
  TeamSeasonStats,
  TeamPreviousSeason,
} from '@trytag/shared';
import {
  teamRepository,
  standingRepository,
  fixtureRepository,
  playerAwardRepository,
  divisionRepository,
  leagueRepository,
  seasonRepository,
} from '../database/repositories/index.js';
import { scraperOrchestrator } from '../scraper/index.js';

const router = Router();

// GET /api/v1/teams - Get all teams
router.get('/', async (_req, res) => {
  const teams = await teamRepository.findAll();
  res.json({
    success: true,
    data: teams,
    meta: { total: teams.length },
  });
});

// GET /api/v1/teams/batch - Get multiple teams by IDs
router.get('/batch', async (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'ids query parameter required' },
    });
    return;
  }

  const ids = idsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
  const teams = await teamRepository.findByIds(ids);

  res.json({
    success: true,
    data: teams,
    meta: { total: teams.length },
  });
});

// GET /api/v1/teams/:id - Get team profile
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Try to find by internal ID first, then fall back to external ID
    let team = await teamRepository.findById(id);
    if (!team) {
      team = await teamRepository.findByExternalId(id);
    }

    if (!team) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team not found' },
      });
      return;
    }

    const teamId = team.id; // Use internal ID for all lookups
    const standings = await standingRepository.findByTeam(teamId);
    let upcomingFixtures = await fixtureRepository.findUpcoming(teamId, 5);
    let recentFixtures = await fixtureRepository.findRecent(teamId, 10);
    const playerAwards = await playerAwardRepository.findByTeam(teamId);

    // Fetch live profile data from website (position history, stats, previous seasons, fixture history)
    let positionHistory: TeamPositionHistory[] = [];
    let seasonStats: TeamSeasonStats[] = [];
    let previousSeasons: TeamPreviousSeason[] = [];

    // Only fetch if we have an external team ID
    if (team.externalTeamId) {
      try {
        // Build context from first standing (for getting external IDs needed by Spawtz)
        let context: { leagueId?: number; seasonId?: number; divisionId?: number } | undefined;
        if (standings.length > 0) {
          const division = await divisionRepository.findById(standings[0].divisionId);
          if (division) {
            const league = await leagueRepository.findById(division.leagueId);
            const season = await seasonRepository.findById(division.seasonId);
            context = {
              leagueId: league?.externalLeagueId,
              seasonId: season?.externalSeasonId,
              divisionId: division.externalDivisionId,
            };
          }
        }
        const profileData = await scraperOrchestrator.fetchTeamProfile(team.externalTeamId, context);
        if (profileData) {
          positionHistory = profileData.positionHistory;
          seasonStats = profileData.seasonStats;
          previousSeasons = profileData.previousSeasons;

          // If any fixture history is found from the scraped profile, use it
          if (profileData.fixtureHistory && profileData.fixtureHistory.length > 0) {
            // Transform scraped fixtures to match FixtureWithTeams format
            const sortedFixtures = [...profileData.fixtureHistory].sort((a, b) => {
              const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
              if (dateCompare !== 0) return dateCompare;
              if (!a.time && !b.time) return 0;
              if (!a.time) return 1;
              if (!b.time) return -1;
              return b.time.localeCompare(a.time);
            });
            const transformedFixtures = [];
            for (let idx = 0; idx < sortedFixtures.length; idx++) {
              const f = sortedFixtures[idx];
              const opponentTeam = await teamRepository.findByExternalId(f.awayTeamId);
              const opponentId = opponentTeam?.id || f.awayTeamId;

              // Try to find matching fixture in database to get real ID
              const dbFixture = await fixtureRepository.findByTeamsAndDate(team.id, opponentId, f.date);

              transformedFixtures.push({
                id: dbFixture?.id ?? -idx - 1,
                externalFixtureId: dbFixture?.externalFixtureId ?? null,
                divisionId: dbFixture?.divisionId ?? 0,
                homeTeamId: team.id,
                awayTeamId: opponentId,
                fixtureDate: f.date,
                fixtureTime: f.time,
                pitch: f.pitch,
                roundNumber: dbFixture?.roundNumber ?? null,
                homeScore: f.homeScore,
                awayScore: f.awayScore,
                status: f.status,
                isForfeit: dbFixture?.isForfeit ?? false,
                homeTeam: {
                  id: team.id,
                  externalTeamId: team.externalTeamId,
                  name: team.name,
                },
                awayTeam: {
                  id: opponentId,
                  externalTeamId: f.awayTeamId,
                  name: opponentTeam?.name || f.awayTeamName,
                },
              });
            }
            recentFixtures = transformedFixtures;
          }

          // If any upcoming fixtures are found from the scraped profile, use them
          if (profileData.upcomingFixtures && profileData.upcomingFixtures.length > 0) {
            const sortedFixtures = [...profileData.upcomingFixtures].sort((a, b) => {
              const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
              if (dateCompare !== 0) return dateCompare;
              if (!a.time && !b.time) return 0;
              if (!a.time) return -1;
              if (!b.time) return 1;
              return a.time.localeCompare(b.time);
            });
            const transformedFixtures = [];
            for (let idx = 0; idx < sortedFixtures.length; idx++) {
              const f = sortedFixtures[idx];
              const opponentTeam = await teamRepository.findByExternalId(f.awayTeamId);
              const opponentId = opponentTeam?.id || f.awayTeamId;

              // Try to find matching fixture in database to get real ID
              const dbFixture = await fixtureRepository.findByTeamsAndDate(team.id, opponentId, f.date);

              transformedFixtures.push({
                id: dbFixture?.id ?? -idx - 1,
                externalFixtureId: dbFixture?.externalFixtureId ?? null,
                divisionId: dbFixture?.divisionId ?? 0,
                homeTeamId: team.id,
                awayTeamId: opponentId,
                fixtureDate: f.date,
                fixtureTime: f.time,
                pitch: f.pitch,
                roundNumber: dbFixture?.roundNumber ?? null,
                homeScore: f.homeScore,
                awayScore: f.awayScore,
                status: f.status,
                isForfeit: dbFixture?.isForfeit ?? false,
                homeTeam: {
                  id: team.id,
                  externalTeamId: team.externalTeamId,
                  name: team.name,
                },
                awayTeam: {
                  id: opponentId,
                  externalTeamId: f.awayTeamId,
                  name: opponentTeam?.name || f.awayTeamName,
                },
              });
            }
            upcomingFixtures = transformedFixtures;
          }
        }
      } catch (scraperError) {
        // Log but don't fail the request if scraper fails
        logger.error({ error: scraperError }, 'Failed to fetch team profile from scraper');
      }
    }

    res.json({
      success: true,
      data: {
        ...team,
        standings,
        upcomingFixtures,
        recentFixtures,
        playerAwards,
        positionHistory,
        seasonStats,
        previousSeasons,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching team profile');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch team profile' },
    });
  }
});

// GET /api/v1/teams/:id/standings - Get team standings across divisions
router.get('/:id/standings', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const standings = await standingRepository.findByTeam(id);

  res.json({
    success: true,
    data: standings,
    meta: { total: standings.length },
  });
});

// GET /api/v1/teams/:id/fixtures - Get team fixtures
router.get('/:id/fixtures', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const fixtures = await fixtureRepository.findByTeam(id);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/teams/:id/fixtures/upcoming - Get upcoming team fixtures
router.get('/:id/fixtures/upcoming', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const fixtures = await fixtureRepository.findUpcoming(id, limit);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/teams/:id/fixtures/results - Get team results
router.get('/:id/fixtures/results', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const fixtures = await fixtureRepository.findRecent(id, limit);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

export { router as teamsRouter };

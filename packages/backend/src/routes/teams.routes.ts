import { Router } from 'express';
import {
  teamRepository,
  standingRepository,
  fixtureRepository,
  playerAwardRepository,
} from '../database/repositories/index.js';
import { scraperOrchestrator } from '../scraper/index.js';

const router = Router();

// GET /api/v1/teams/batch - Get multiple teams by IDs
router.get('/batch', (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'ids query parameter required' },
    });
    return;
  }

  const ids = idsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
  const teams = teamRepository.findByIds(ids);

  res.json({
    success: true,
    data: teams,
    meta: { total: teams.length },
  });
});

// GET /api/v1/teams/:id - Get team profile
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  // Try to find by internal ID first, then fall back to external ID
  let team = teamRepository.findById(id);
  if (!team) {
    team = teamRepository.findByExternalId(id);
  }

  if (!team) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Team not found' },
    });
    return;
  }

  const teamId = team.id; // Use internal ID for all lookups
  const standings = standingRepository.findByTeam(teamId);
  const upcomingFixtures = fixtureRepository.findUpcoming(teamId, 5);
  let recentFixtures = fixtureRepository.findRecent(teamId, 10);
  const playerAwards = playerAwardRepository.findByTeam(teamId);

  // Fetch live profile data from website (position history, stats, previous seasons, fixture history)
  let positionHistory: any[] = [];
  let seasonStats: any[] = [];
  let previousSeasons: any[] = [];

  // Only fetch if we have an external team ID
  if (team.externalTeamId) {
    const profileData = await scraperOrchestrator.fetchTeamProfile(team.externalTeamId);
    if (profileData) {
      positionHistory = profileData.positionHistory;
      seasonStats = profileData.seasonStats;
      previousSeasons = profileData.previousSeasons;

      // If no recent fixtures from DB, use fixture history from scraped profile
      if (recentFixtures.length === 0 && profileData.fixtureHistory.length > 0) {
        // Transform scraped fixtures to match FixtureWithTeams format
        // The scraped fixtures have homeTeamId as the team we're viewing
        // We need to use the INTERNAL team.id so frontend comparisons work
        recentFixtures = profileData.fixtureHistory.map((f, idx) => {
          // Try to find the opponent team in DB by external ID
          const opponentTeam = teamRepository.findByExternalId(f.awayTeamId);

          return {
            id: -idx - 1, // Negative IDs to indicate these are from scraper
            externalFixtureId: null,
            divisionId: 0,
            homeTeamId: team.id, // Use internal ID
            awayTeamId: opponentTeam?.id || f.awayTeamId,
            fixtureDate: f.date,
            fixtureTime: f.time,
            pitch: f.pitch,
            roundNumber: null,
            homeScore: f.homeScore,
            awayScore: f.awayScore,
            status: f.status,
            isForfeit: false,
            homeTeam: {
              id: team.id, // Use internal ID so frontend comparison works
              externalTeamId: team.externalTeamId,
              name: team.name, // Use actual team name from DB
            },
            awayTeam: {
              id: opponentTeam?.id || f.awayTeamId,
              externalTeamId: f.awayTeamId,
              name: opponentTeam?.name || f.awayTeamName, // Use DB name if available
            },
          };
        });
      }
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
});

// GET /api/v1/teams/:id/standings - Get team standings across divisions
router.get('/:id/standings', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const standings = standingRepository.findByTeam(id);

  res.json({
    success: true,
    data: standings,
    meta: { total: standings.length },
  });
});

// GET /api/v1/teams/:id/fixtures - Get team fixtures
router.get('/:id/fixtures', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const fixtures = fixtureRepository.findByTeam(id);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/teams/:id/fixtures/upcoming - Get upcoming team fixtures
router.get('/:id/fixtures/upcoming', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const fixtures = fixtureRepository.findUpcoming(id, limit);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/teams/:id/fixtures/results - Get team results
router.get('/:id/fixtures/results', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const fixtures = fixtureRepository.findRecent(id, limit);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

export { router as teamsRouter };

import { Router } from 'express';
import { fixtureRepository, teamRepository } from '../database/repositories/index.js';
import { scraperOrchestrator } from '../scraper/index.js';
import type { FixtureWithTeams } from '@trytag/shared';

const router = Router();

// GET /api/v1/fixtures - List fixtures (upcoming or recent)
router.get('/', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const type = (req.query.type as string) || 'upcoming';
  const teamIdsParam = req.query.teamIds as string;

  let fixtures: FixtureWithTeams[] = [];

  if (teamIdsParam) {
    const teamIds = teamIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    if (type === 'recent') {
      fixtures = await fixtureRepository.findRecentByTeams(teamIds, limit);

      // Fallback to scraper if DB returns empty
      if (fixtures.length === 0 && teamIds.length > 0) {
        const allScrapedFixtures: FixtureWithTeams[] = [];

        for (const teamId of teamIds) {
          const team = await teamRepository.findById(teamId);
          if (!team?.externalTeamId) continue;

          const profileData = await scraperOrchestrator.fetchTeamProfile(team.externalTeamId);
          if (!profileData?.fixtureHistory?.length) continue;

          // Sort by date descending and filter completed fixtures
          const sortedFixtures = [...profileData.fixtureHistory]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .filter(f => f.status === 'completed');

          // Transform to FixtureWithTeams format
          for (const f of sortedFixtures) {
            const opponentTeam = await teamRepository.findByExternalId(f.awayTeamId);
            allScrapedFixtures.push({
              id: -(allScrapedFixtures.length + 1),
              externalFixtureId: null,
              divisionId: 0,
              homeTeamId: team.id,
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
                id: team.id,
                externalTeamId: team.externalTeamId,
                name: team.name,
              },
              awayTeam: {
                id: opponentTeam?.id || f.awayTeamId,
                externalTeamId: f.awayTeamId,
                name: opponentTeam?.name || f.awayTeamName,
              },
            });
          }
        }

        // Sort all scraped fixtures by date and limit
        fixtures = allScrapedFixtures
          .sort((a, b) => new Date(b.fixtureDate).getTime() - new Date(a.fixtureDate).getTime())
          .slice(0, limit);
      }
    } else {
      fixtures = await fixtureRepository.findUpcomingByTeams(teamIds, limit);
    }
  } else {
    // Global list
    if (type === 'recent') {
      fixtures = await fixtureRepository.findRecent(undefined, limit);
    } else {
      fixtures = await fixtureRepository.findUpcoming(undefined, limit);
    }
  }

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/fixtures/today - Get today's fixtures
router.get('/today', async (_req, res) => {
  const fixtures = await fixtureRepository.findUpcoming(undefined, 50);
  const today = new Date().toISOString().split('T')[0];
  const todayFixtures = fixtures.filter((f) => f.fixtureDate === today);

  res.json({
    success: true,
    data: todayFixtures,
    meta: { total: todayFixtures.length },
  });
});

// GET /api/v1/fixtures/week - Get this week's fixtures
router.get('/week', async (_req, res) => {
  const fixtures = await fixtureRepository.findUpcoming(undefined, 100);
  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const weekFixtures = fixtures.filter((f) => {
    const fixtureDate = new Date(f.fixtureDate);
    return fixtureDate >= today && fixtureDate <= weekFromNow;
  });

  res.json({
    success: true,
    data: weekFixtures,
    meta: { total: weekFixtures.length },
  });
});

export { router as fixturesRouter };

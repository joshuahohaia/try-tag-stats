import { Router } from 'express';
import { fixtureRepository } from '../database/repositories/index.js';

const router = Router();

// GET /api/v1/fixtures - List fixtures (upcoming or recent)
router.get('/', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const type = (req.query.type as string) || 'upcoming';
  const teamIdsParam = req.query.teamIds as string;

  let fixtures = [];

  if (teamIdsParam) {
    const teamIds = teamIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    
    if (type === 'recent') {
      fixtures = fixtureRepository.findRecentByTeams(teamIds, limit);
    } else {
      fixtures = fixtureRepository.findUpcomingByTeams(teamIds, limit);
    }
  } else {
    // Global list
    if (type === 'recent') {
      fixtures = fixtureRepository.findRecent(undefined, limit);
    } else {
      fixtures = fixtureRepository.findUpcoming(undefined, limit);
    }
  }

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/fixtures/today - Get today's fixtures
router.get('/today', (_req, res) => {
  const fixtures = fixtureRepository.findUpcoming(undefined, 50);
  const today = new Date().toISOString().split('T')[0];
  const todayFixtures = fixtures.filter((f) => f.fixtureDate === today);

  res.json({
    success: true,
    data: todayFixtures,
    meta: { total: todayFixtures.length },
  });
});

// GET /api/v1/fixtures/week - Get this week's fixtures
router.get('/week', (_req, res) => {
  const fixtures = fixtureRepository.findUpcoming(undefined, 100);
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

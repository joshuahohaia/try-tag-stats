import { Router } from 'express';
import { fixtureRepository } from '../database/repositories/index.js';

const router = Router();

// GET /api/v1/fixtures - List fixtures
router.get('/', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  // For now, return upcoming fixtures across all divisions
  const fixtures = fixtureRepository.findUpcoming(undefined, limit);

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

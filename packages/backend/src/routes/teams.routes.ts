import { Router } from 'express';
import {
  teamRepository,
  standingRepository,
  fixtureRepository,
} from '../database/repositories/index.js';

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
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const team = teamRepository.findById(id);

  if (!team) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Team not found' },
    });
    return;
  }

  const standings = standingRepository.findByTeam(id);
  const upcomingFixtures = fixtureRepository.findUpcoming(id, 5);
  const recentFixtures = fixtureRepository.findRecent(id, 5);

  res.json({
    success: true,
    data: {
      ...team,
      standings,
      upcomingFixtures,
      recentFixtures,
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

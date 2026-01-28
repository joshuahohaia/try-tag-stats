import { Router } from 'express';
import {
  divisionRepository,
  standingRepository,
  fixtureRepository,
  playerAwardRepository,
} from '../database/repositories/index.js';

const router = Router();

// GET /api/v1/divisions/:id - Get division details
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const division = await divisionRepository.findById(id);

  if (!division) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Division not found' },
    });
    return;
  }

  res.json({
    success: true,
    data: division,
  });
});

// GET /api/v1/divisions/:id/standings - Get standings table
router.get('/:id/standings', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const standings = await standingRepository.findByDivision(id);

  res.json({
    success: true,
    data: standings,
    meta: { total: standings.length },
  });
});

// GET /api/v1/divisions/:id/statistics - Get player statistics
router.get('/:id/statistics', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const stats = await playerAwardRepository.findByDivision(id);

  res.json({
    success: true,
    data: stats,
    meta: { total: stats.length },
  });
});

// GET /api/v1/divisions/standings/batch - Get standings for multiple divisions
router.get('/standings/batch', async (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'ids query parameter required' },
    });
    return;
  }
  const ids = idsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
  const standings = await standingRepository.findByDivisionIds(ids);
  res.json({
    success: true,
    data: standings,
    meta: { total: standings.length },
  });
});

// GET /api/v1/divisions/statistics/batch - Get statistics for multiple divisions
router.get('/statistics/batch', async (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'ids query parameter required' },
    });
    return;
  }
  const ids = idsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
  const stats = await playerAwardRepository.findByDivisionIds(ids);
  res.json({
    success: true,
    data: stats,
    meta: { total: stats.length },
  });
});

// GET /api/v1/divisions/:id/fixtures - Get all fixtures
router.get('/:id/fixtures', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const fixtures = await fixtureRepository.findByDivision(id);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/divisions/:id/fixtures/upcoming - Get upcoming fixtures
router.get('/:id/fixtures/upcoming', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  const fixtures = (await fixtureRepository.findByDivision(id)).filter((f) => f.status === 'scheduled');

  res.json({
    success: true,
    data: fixtures.slice(0, limit),
    meta: { total: fixtures.length },
  });
});

export { router as divisionsRouter };

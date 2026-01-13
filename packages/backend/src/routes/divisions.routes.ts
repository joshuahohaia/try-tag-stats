import { Router } from 'express';
import {
  divisionRepository,
  standingRepository,
  fixtureRepository,
} from '../database/repositories/index.js';

const router = Router();

// GET /api/v1/divisions/:id - Get division details
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const division = divisionRepository.findById(id);

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
router.get('/:id/standings', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const standings = standingRepository.findByDivision(id);

  res.json({
    success: true,
    data: standings,
    meta: { total: standings.length },
  });
});

// GET /api/v1/divisions/:id/fixtures - Get all fixtures
router.get('/:id/fixtures', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const fixtures = fixtureRepository.findByDivision(id);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/divisions/:id/fixtures/upcoming - Get upcoming fixtures
router.get('/:id/fixtures/upcoming', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  const fixtures = fixtureRepository.findByDivision(id).filter((f) => f.status === 'scheduled');

  res.json({
    success: true,
    data: fixtures.slice(0, limit),
    meta: { total: fixtures.length },
  });
});

export { router as divisionsRouter };

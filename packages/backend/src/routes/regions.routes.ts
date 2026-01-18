import { Router } from 'express';
import { regionRepository, leagueRepository } from '../database/repositories/index.js';

const router = Router();

// GET /api/v1/regions - List all regions
router.get('/', async (_req, res) => {
  const regions = await regionRepository.findAll();
  res.json({
    success: true,
    data: regions,
    meta: { total: regions.length },
  });
});

// GET /api/v1/regions/:slug - Get region with leagues
router.get('/:slug', async (req, res) => {
  const region = await regionRepository.findBySlug(req.params.slug);

  if (!region) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Region not found' },
    });
    return;
  }

  const leagues = await leagueRepository.findByRegion(region.id);

  res.json({
    success: true,
    data: { ...region, leagues },
  });
});

export { router as regionsRouter };

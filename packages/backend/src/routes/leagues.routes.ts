import { Router } from 'express';
import {
  leagueRepository,
  seasonRepository,
  divisionRepository,
} from '../database/repositories/index.js';

const router = Router();

// GET /api/v1/leagues/summary - List all leagues with summary data
router.get('/summary', async (req, res) => {
  const regionId = req.query.region ? parseInt(req.query.region as string, 10) : undefined;
  const leagues = await leagueRepository.findAllWithSummary(regionId);

  res.json({
    success: true,
    data: leagues,
    meta: { total: leagues.length },
  });
});

// GET /api/v1/leagues - List all leagues
router.get('/', async (req, res) => {
  const regionId = req.query.region ? parseInt(req.query.region as string, 10) : undefined;

  const leagues = regionId
    ? await leagueRepository.findByRegion(regionId)
    : await leagueRepository.findAll();

  res.json({
    success: true,
    data: leagues,
    meta: { total: leagues.length },
  });
});

// GET /api/v1/leagues/:id - Get league details
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const league = await leagueRepository.findById(id);

  if (!league) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'League not found' },
    });
    return;
  }

  res.json({
    success: true,
    data: league,
  });
});

// GET /api/v1/leagues/:id/seasons - Get seasons for a league
router.get('/:id/seasons', async (_req, res) => {
  const seasons = await seasonRepository.findAll();

  res.json({
    success: true,
    data: seasons,
    meta: { total: seasons.length },
  });
});

// GET /api/v1/leagues/:leagueId/seasons/:seasonId/divisions - Get divisions
router.get('/:leagueId/seasons/:seasonId/divisions', async (req, res) => {
  const leagueId = parseInt(req.params.leagueId, 10);
  const seasonId = parseInt(req.params.seasonId, 10);

  const divisions = await divisionRepository.findByLeagueAndSeason(leagueId, seasonId);

  res.json({
    success: true,
    data: divisions,
    meta: { total: divisions.length },
  });
});

export { router as leaguesRouter };

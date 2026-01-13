import { Router } from 'express';
import { scraperOrchestrator } from '../scraper/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Track sync status
let syncInProgress = false;
let lastSyncResult: {
  timestamp: string;
  success: boolean;
  duration: number;
  itemsProcessed: Record<string, number>;
  errors: string[];
} | null = null;

// POST /api/v1/admin/sync/full - Trigger full data sync
router.post('/sync/full', async (_req, res) => {
  if (syncInProgress) {
    res.status(409).json({
      success: false,
      error: { code: 'SYNC_IN_PROGRESS', message: 'A sync is already in progress' },
    });
    return;
  }

  syncInProgress = true;
  logger.info('Full sync triggered via API');

  // Run sync in background
  scraperOrchestrator
    .runFullSync()
    .then((result) => {
      lastSyncResult = {
        timestamp: new Date().toISOString(),
        success: result.success,
        duration: result.duration,
        itemsProcessed: result.itemsProcessed,
        errors: result.errors,
      };
    })
    .catch((err) => {
      logger.error({ error: err }, 'Sync failed');
      lastSyncResult = {
        timestamp: new Date().toISOString(),
        success: false,
        duration: 0,
        itemsProcessed: {},
        errors: [err instanceof Error ? err.message : String(err)],
      };
    })
    .finally(() => {
      syncInProgress = false;
    });

  res.json({
    success: true,
    data: { message: 'Sync started', status: 'running' },
  });
});

// POST /api/v1/admin/sync/division/:id - Sync specific division
router.post('/sync/division', async (req, res) => {
  const { leagueId, seasonId, divisionId } = req.body;

  if (!leagueId || !seasonId || !divisionId) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'leagueId, seasonId, and divisionId are required' },
    });
    return;
  }

  try {
    await scraperOrchestrator.syncSingleDivision(
      parseInt(leagueId, 10),
      parseInt(seasonId, 10),
      parseInt(divisionId, 10)
    );

    res.json({
      success: true,
      data: { message: 'Division sync completed' },
    });
  } catch (err) {
    logger.error({ error: err }, 'Division sync failed');
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_FAILED',
        message: err instanceof Error ? err.message : 'Sync failed',
      },
    });
  }
});

// GET /api/v1/admin/sync/status - Get last sync status
router.get('/sync/status', (_req, res) => {
  res.json({
    success: true,
    data: {
      syncInProgress,
      lastSync: lastSyncResult,
    },
  });
});

export { router as adminRouter };

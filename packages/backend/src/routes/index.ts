import { Router } from 'express';
import { regionsRouter } from './regions.routes.js';
import { leaguesRouter } from './leagues.routes.js';
import { divisionsRouter } from './divisions.routes.js';
import { teamsRouter } from './teams.routes.js';
import { fixturesRouter } from './fixtures.routes.js';
import { adminRouter } from './admin.routes.js';

const router = Router();

router.use('/regions', regionsRouter);
router.use('/leagues', leaguesRouter);
router.use('/divisions', divisionsRouter);
router.use('/teams', teamsRouter);
router.use('/fixtures', fixturesRouter);
router.use('/admin', adminRouter);

export { router as apiRouter };

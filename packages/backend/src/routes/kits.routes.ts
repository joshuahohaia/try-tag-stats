import { Router } from 'express';
import { teamKitRepository, teamRepository } from '../database/repositories/index.js';
import { createRateLimiter } from '../middleware/rate-limit.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

export function createKitsRouter(limit = { max: 20, windowMs: 10 * 60 * 1000, perTeam: 30, global: 200 }) {
  const router = Router();
  // Three layers. The per-IP one depends on req.ip being the real client, which depends on the
  // proxy setup in front of the app. The per-team and global caps do not depend on any header,
  // so a spoofed X-Forwarded-For cannot lift them.
  const perIp = createRateLimiter(limit.max, limit.windowMs);
  const perTeam = createRateLimiter(limit.perTeam, limit.windowMs, Date.now, (req) => `team:${req.params.teamId}`);
  const overall = createRateLimiter(limit.global, limit.windowMs, Date.now, () => 'all');
  const writeLimiter = [perIp, perTeam, overall];

  const bad = (res: import('express').Response, message: string) =>
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message } });

  // GET /api/v1/kits - all saved kits (teams without one use generated colours)
  router.get('/', async (_req, res) => {
    const kits = await teamKitRepository.findAll();
    res.json({ success: true, data: kits, meta: { total: kits.length } });
  });

  const conflict = (res: import('express').Response, current: unknown) =>
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'This kit was changed by someone else. Reload and try again.' },
      data: current,
    });

  // PUT /api/v1/kits/:teamId  { primary, secondary, expectedVersion: number | null }
  router.put('/:teamId', ...writeLimiter, async (req, res) => {
    const teamId = Number(req.params.teamId);
    if (!Number.isInteger(teamId) || teamId <= 0) return bad(res, 'Invalid team id');
    const { primary, secondary, expectedVersion } = req.body ?? {};
    if (typeof primary !== 'string' || !HEX.test(primary) || typeof secondary !== 'string' || !HEX.test(secondary)) {
      return bad(res, 'primary and secondary must be hex colours like #1a2b3c');
    }
    if (expectedVersion !== null && !(Number.isInteger(expectedVersion) && expectedVersion > 0)) {
      return bad(res, 'expectedVersion must be the version you last saw, or null if none');
    }
    if (!(await teamRepository.findById(teamId))) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } });
    }
    const result = await teamKitRepository.save(teamId, primary.toLowerCase(), secondary.toLowerCase(), expectedVersion);
    if (!result.ok) return conflict(res, result.current);
    res.json({ success: true, data: result.kit });
  });

  // DELETE /api/v1/kits/:teamId  { expectedVersion: number } - back to generated colours
  router.delete('/:teamId', ...writeLimiter, async (req, res) => {
    const teamId = Number(req.params.teamId);
    if (!Number.isInteger(teamId) || teamId <= 0) return bad(res, 'Invalid team id');
    const { expectedVersion } = req.body ?? {};
    if (!(Number.isInteger(expectedVersion) && expectedVersion > 0)) {
      return bad(res, 'expectedVersion must be the version you last saw');
    }
    const result = await teamKitRepository.reset(teamId, expectedVersion);
    if (!result.ok) return conflict(res, result.current);
    res.json({ success: true, data: null });
  });

  return router;
}

export const kitsRouter = createKitsRouter();

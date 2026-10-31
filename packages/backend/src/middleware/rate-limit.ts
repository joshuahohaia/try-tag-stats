import type { Request, Response, NextFunction } from 'express';

/**
 * Small in-memory fixed-window limiter (per client IP unless keyOf says otherwise). State lives in this process only
 * (resets on restart), which is enough to slow casual abuse on a single instance.
 */
export function createRateLimiter(
  max: number,
  windowMs: number,
  now: () => number = Date.now,
  keyOf: (req: Request) => string = (req) => req.ip || 'unknown'
) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const t = now();
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
    }
    const key = keyOf(req);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - t) / 1000)));
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many kit changes. Try again later.' },
      });
      return;
    }
    next();
  };
}

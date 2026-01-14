import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Generate a simple request ID
  const requestId = Math.random().toString(36).substring(2, 10);
  req.requestId = requestId;

  // Log incoming request
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.socket.remoteAddress,
  }, 'Incoming request');

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    }, 'Request completed');
  });

  next();
}

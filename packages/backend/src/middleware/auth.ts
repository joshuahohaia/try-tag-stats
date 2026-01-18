import { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';

export const verifyCronRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const cronSecret = req.headers['x-api-key'];

  if (!cronSecret || cronSecret !== config.cronSecret) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid API key' },
    });
  }

  next();
};

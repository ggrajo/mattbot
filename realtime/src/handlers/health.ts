import type { Request, Response } from 'express';

const startTime = Date.now();

export function healthHandler(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
}

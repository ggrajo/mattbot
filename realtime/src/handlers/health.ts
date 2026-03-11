import type { Request, Response } from "express";
import { getActiveSessionCount } from "./twilioMedia.js";

export function healthCheck(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    activeSessions: getActiveSessionCount(),
    uptime: process.uptime(),
  });
}

import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";

// ── Express type augmentation ─────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startHrTime: [number, number];
      userId?: string;
      schoolId?: string;
    }
  }
}

/**
 * Attach a request ID to every request.
 * Honours an incoming x-request-id header so traces propagate across services.
 */
export const requestIdMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers["x-request-id"];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
  req.requestId = id;
  req.startHrTime = process.hrtime();
  res.setHeader("x-request-id", id);
  next();
};

export function elapsedMs(start: [number, number]): number {
  const [s, ns] = process.hrtime(start);
  return Math.round(s * 1_000 + ns / 1_000_000);
}

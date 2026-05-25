import type { Request, Response, NextFunction, RequestHandler } from "express";
import { rootLogger } from "./logger";
import { elapsedMs } from "./requestContext";

// Routes that carry no useful diagnostic info — skip verbose logging
const SKIP_PATHS = new Set(["/api/health", "/api/health/details", "/"]);

/**
 * Structured request/response logger.
 * Logs one line per request on response finish with:
 *   requestId, method, route, module, userId, statusCode, durationMs
 */
export const requestLoggerMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.on("finish", () => {
    if (SKIP_PATHS.has(req.path)) return;

    const durationMs = elapsedMs(req.startHrTime ?? process.hrtime());
    const module = deriveModule(req.path);

    const log = rootLogger.child({
      requestId: req.requestId,
      module,
    });

    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    log[level]({
      method:     req.method,
      route:      req.path,
      statusCode: res.statusCode,
      durationMs,
      userId:     req.userId ?? null,
      schoolId:   req.schoolId ?? null,
      userAgent:  req.headers["user-agent"] ?? null,
      ip:         req.ip ?? null,
    }, `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`);
  });

  next();
};

function deriveModule(path: string): string {
  // "/api/finance/students" → "finance"
  return path.replace(/^\/api\//, "").split("/")[0] ?? "unknown";
}

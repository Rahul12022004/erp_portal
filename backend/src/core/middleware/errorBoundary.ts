/**
 * Module-level error boundary middleware.
 *
 * Wraps an Express Router so that any unhandled error from that module:
 *   1. Returns a structured JSON error (never crashes the process)
 *   2. Records the failure in the circuit breaker
 *   3. Fast-fails with 503 when the circuit is open
 *
 * Usage (moduleLoader wires this automatically):
 *   app.use(path, withModuleBoundary("finance", financeRouter))
 */

import type { Request, Response, NextFunction, Router, RequestHandler, ErrorRequestHandler } from "express";
import { recordSuccess, recordFailure, isCircuitOpen } from "../health/circuitBreaker";
import { createLogger } from "../observability/logger";
import { captureException } from "../observability/sentry";

const logger = createLogger("boundary");

/** Derive a short module name from its API path prefix. */
export function pathToModuleName(apiPath: string): string {
  // "/api/finance/students" → "finance"
  // "/api/salary-structures" → "salary-structures"
  return apiPath.replace(/^\/api\//, "").split("/")[0] ?? "unknown";
}

/**
 * Wraps a router with:
 *   - circuit-open fast-fail (503 before the router even runs)
 *   - success / failure recording
 *   - error catch (prevents unhandled errors from escaping to global handler)
 */
export function withModuleBoundary(moduleName: string, router: Router): (RequestHandler | ErrorRequestHandler)[] {
  const circuitGuard: RequestHandler = (_req, res, next) => {
    if (isCircuitOpen(moduleName)) {
      res.status(503).json({
        error: "service_unavailable",
        module: moduleName,
        message: `${moduleName} module is temporarily unavailable. Please try again shortly.`,
      });
      return;
    }
    next();
  };

  // Thin wrapper that marks a request success after the router chain runs
  const successRecorder: RequestHandler = (_req, _res, next) => {
    recordSuccess(moduleName);
    next();
  };

  // 4-arg error handler — catches anything thrown by the router
  const errorHandler: ErrorRequestHandler = (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    const reqWithId = req as Request & { requestId?: string; userId?: string };
    logger.error({
      requestId: reqWithId.requestId,
      module:    moduleName,
      path:      req.path,
      method:    req.method,
      userId:    reqWithId.userId,
      err:       message,
      stack:     process.env.NODE_ENV !== "production" ? stack : undefined,
    }, `[${moduleName}] unhandled route error`);

    captureException(err, {
      requestId: reqWithId.requestId,
      userId:    reqWithId.userId,
      module:    moduleName,
      extra:     { path: req.path, method: req.method },
    });

    recordFailure(moduleName, message);

    if (!res.headersSent) {
      res.status(500).json({
        error: "module_error",
        module: moduleName,
        message: "An internal error occurred. Other modules continue to function normally.",
        ...(process.env.NODE_ENV !== "production" && { detail: message }),
      });
    }
  };

  return [circuitGuard, router, successRecorder, errorHandler];
}

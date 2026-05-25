import * as Sentry from "@sentry/node";
import type { Express } from "express";

let _initialized = false;

export function initSentry(app: Express): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // Sentry disabled — no DSN configured
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release:     process.env.APP_VERSION ?? "unknown",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.mongooseIntegration(),
    ],
  });

  _initialized = true;
}

/**
 * Mount Sentry error handler — call AFTER all routes.
 * Sentry must be installed and initialized first.
 */
export function mountSentryErrorHandler(app: Express): void {
  if (!_initialized) return;
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Capture an exception manually with extra context.
 * Safe to call even when Sentry is not initialized.
 */
export function captureException(
  err: unknown,
  context?: { requestId?: string; userId?: string; module?: string; extra?: Record<string, unknown> },
): void {
  if (!_initialized) return;
  Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag("requestId", context.requestId);
    if (context?.userId)    scope.setUser({ id: context.userId });
    if (context?.module)    scope.setTag("module", context.module);
    if (context?.extra)     scope.setExtras(context.extra);
    Sentry.captureException(err);
  });
}

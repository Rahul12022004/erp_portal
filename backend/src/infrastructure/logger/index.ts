// Thin shim — all callers that imported from here continue to work.
// Real implementation lives in core/observability/logger.ts.
export { logger, createLogger, rootLogger } from "../../core/observability/logger";

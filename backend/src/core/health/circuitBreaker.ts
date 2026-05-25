/**
 * Per-module circuit breakers backed by opossum.
 *
 * Each module gets one CircuitBreaker instance.
 * Error boundaries call recordSuccess/recordFailure after every request.
 * When failure rate exceeds threshold → circuit opens → module marked "down".
 * After resetTimeout → circuit half-opens → module marked "degraded".
 * On first success in half-open → circuit closes → module marked "healthy".
 *
 * Thresholds (tunable via env):
 *   - 50 % failure rate over a 10-request window → open
 *   - 5  minimum requests before evaluation kicks in
 *   - 30 s until half-open attempt
 */

import CircuitBreaker from "opossum";
import { moduleHealth } from "./moduleHealth";
import { logger } from "../../infrastructure/logger";

const OPTIONS: CircuitBreaker.Options = {
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  timeout: 8000,
  resetTimeout: 30000,
};

// The canary function: resolves on success, rejects on failure.
type Outcome = "ok" | "fail";
const canary = async (outcome: Outcome): Promise<void> => {
  if (outcome === "fail") throw new Error("failure recorded");
};

const breakers = new Map<string, CircuitBreaker<[Outcome], void>>();

export function getCircuitBreaker(module: string): CircuitBreaker<[Outcome], void> {
  if (breakers.has(module)) return breakers.get(module)!;

  const cb = new CircuitBreaker<[Outcome], void>(canary, {
    ...OPTIONS,
    name: module,
  });

  cb.fallback(() => {
    // fallback fires when circuit is open — module is down, reject fast
  });

  cb.on("open", () => {
    moduleHealth.setStatus(module, "down", "Circuit breaker opened — too many failures");
    logger.error(`[circuit] ${module} OPEN`, { module });
  });

  cb.on("halfOpen", () => {
    moduleHealth.setStatus(module, "degraded");
    logger.warn(`[circuit] ${module} HALF-OPEN — probing`, { module });
  });

  cb.on("close", () => {
    moduleHealth.markHealthy(module);
    logger.info(`[circuit] ${module} CLOSED — recovered`, { module });
  });

  breakers.set(module, cb);
  return cb;
}

/** Call after a route handler completes successfully. */
export function recordSuccess(module: string): void {
  const cb = getCircuitBreaker(module);
  cb.fire("ok").catch(() => {
    // fallback fires when circuit is open — ok to ignore
  });
}

/** Call after a route handler throws an error. */
export function recordFailure(module: string, error?: string): void {
  const cb = getCircuitBreaker(module);
  cb.fire("fail").catch(() => {
    // expected — the canary throws on "fail", which is counted by opossum
  });
  // If circuit isn't open yet, still reflect the error in health registry
  if (moduleHealth.getStatus(module) === "healthy") {
    moduleHealth.setStatus(module, "degraded", error);
  }
}

/** True when circuit is open — module should return 503 immediately. */
export function isCircuitOpen(module: string): boolean {
  const cb = getCircuitBreaker(module);
  return cb.opened;
}

export function getStats(module: string): CircuitBreaker.Stats | undefined {
  return breakers.get(module)?.stats;
}

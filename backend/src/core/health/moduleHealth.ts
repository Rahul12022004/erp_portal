/**
 * Module health registry.
 *
 * Single source of truth for per-module operational status.
 * Updated by circuit breakers and error boundaries.
 * Queried by GET /api/health.
 */

import { logger } from "../../infrastructure/logger";

export type ModuleStatus = "healthy" | "degraded" | "down";

export interface ModuleHealthEntry {
  status: ModuleStatus;
  errorCount: number;
  lastErrorAt?: string;
  lastError?: string;
  updatedAt: string;
}

class ModuleHealthRegistry {
  private readonly state = new Map<string, ModuleHealthEntry>();

  setStatus(module: string, status: ModuleStatus, error?: string): void {
    const prev = this.state.get(module);
    const entry: ModuleHealthEntry = {
      status,
      errorCount: status === "healthy" ? 0 : ((prev?.errorCount ?? 0) + 1),
      updatedAt: new Date().toISOString(),
      ...(error && { lastError: error, lastErrorAt: new Date().toISOString() }),
    };

    if (prev?.status !== status) {
      logger.warn(`[health] ${module}: ${prev?.status ?? "unknown"} → ${status}`, {
        module,
        status,
        error,
      });
    }

    this.state.set(module, entry);
  }

  markHealthy(module: string): void {
    const prev = this.state.get(module);
    if (!prev || prev.status !== "healthy") {
      this.state.set(module, {
        status: "healthy",
        errorCount: 0,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  getStatus(module: string): ModuleStatus {
    return this.state.get(module)?.status ?? "healthy";
  }

  getEntry(module: string): ModuleHealthEntry {
    return (
      this.state.get(module) ?? {
        status: "healthy",
        errorCount: 0,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  /** Returns { finance: "healthy", attendance: "degraded", ... } */
  getSummary(): Record<string, ModuleStatus> {
    const out: Record<string, ModuleStatus> = {};
    for (const [name, entry] of this.state.entries()) {
      out[name] = entry.status;
    }
    return out;
  }

  /** Full entries with error details */
  getAll(): Record<string, ModuleHealthEntry> {
    const out: Record<string, ModuleHealthEntry> = {};
    for (const [name, entry] of this.state.entries()) {
      out[name] = entry;
    }
    return out;
  }

  isOperational(module: string): boolean {
    const s = this.getStatus(module);
    return s === "healthy" || s === "degraded";
  }
}

export const moduleHealth = new ModuleHealthRegistry();

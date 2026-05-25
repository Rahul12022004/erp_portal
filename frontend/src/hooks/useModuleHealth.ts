/**
 * Poll /api/health every 60 s and expose per-module status.
 *
 * Returns:
 *   modules  — { finance: "healthy", reports: "degraded", ... }
 *   isDown   — fn(moduleName) → true when "down"
 *   isDegraded — fn(moduleName) → true when "degraded" | "down"
 *   overallOk — true when all modules are "healthy"
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { API_URL } from "@/lib/api";

export type ModuleStatus = "healthy" | "degraded" | "down";

export interface ModuleHealthState {
  modules: Record<string, ModuleStatus>;
  overallOk: boolean;
  lastChecked: Date | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 60_000;

function isStatus(s: unknown): s is ModuleStatus {
  return s === "healthy" || s === "degraded" || s === "down";
}

export function useModuleHealth(): ModuleHealthState & {
  isDown: (module: string) => boolean;
  isDegraded: (module: string) => boolean;
  refetch: () => void;
} {
  const [state, setState] = useState<ModuleHealthState>({
    modules: {},
    overallOk: true,
    lastChecked: null,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await window.fetch(`${API_URL}/api/health`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        setState((prev) => ({ ...prev, error: `HTTP ${res.status}`, overallOk: false }));
        return;
      }

      const data = (await res.json()) as {
        status?: string;
        modules?: Record<string, unknown>;
      };

      const modules: Record<string, ModuleStatus> = {};
      for (const [name, val] of Object.entries(data.modules ?? {})) {
        modules[name] = isStatus(val) ? val : "healthy";
      }

      const overallOk = Object.values(modules).every((s) => s === "healthy");

      setState({
        modules,
        overallOk,
        lastChecked: new Date(),
        error: null,
      });
    } catch (err) {
      // Network error — don't mark modules down (backend might just be slow)
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Network error",
      }));
    }
  }, []);

  useEffect(() => {
    void fetch();
    intervalRef.current = setInterval(() => void fetch(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  const isDown = useCallback(
    (module: string) => state.modules[module] === "down",
    [state.modules]
  );

  const isDegraded = useCallback(
    (module: string) => {
      const s = state.modules[module];
      return s === "degraded" || s === "down";
    },
    [state.modules]
  );

  return { ...state, isDown, isDegraded, refetch: fetch };
}

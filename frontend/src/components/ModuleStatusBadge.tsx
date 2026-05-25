/**
 * Small inline badge showing a module's operational status.
 *
 * Usage:
 *   <ModuleStatusBadge module="finance" modules={modules} />
 *
 * Shows nothing when "healthy" (no visual noise in normal state).
 */

import type { ModuleStatus } from "@/hooks/useModuleHealth";

interface Props {
  module: string;
  modules: Record<string, ModuleStatus>;
}

export function ModuleStatusBadge({ module, modules }: Props) {
  const status = modules[module];

  if (!status || status === "healthy") return null;

  return status === "down" ? (
    <span
      title="This module is currently unavailable"
      className="inline-flex items-center gap-1 rounded-full bg-red-950/60 border border-red-700/40
                 px-2 py-0.5 text-xs font-medium text-red-300"
    >
      🔴 unavailable
    </span>
  ) : (
    <span
      title="This module may experience issues"
      className="inline-flex items-center gap-1 rounded-full bg-amber-950/60 border border-amber-700/40
                 px-2 py-0.5 text-xs font-medium text-amber-300"
    >
      🟡 degraded
    </span>
  );
}

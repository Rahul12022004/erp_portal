/**
 * Shows a compact banner when one or more modules are degraded or down.
 * Sits at the top of the layout — non-blocking, dismissible per session.
 */

import { useState } from "react";
import type { ModuleStatus } from "@/hooks/useModuleHealth";

interface Props {
  modules: Record<string, ModuleStatus>;
}

export function DegradedBanner({ modules }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const degraded = Object.entries(modules).filter(([, s]) => s === "degraded");
  const down = Object.entries(modules).filter(([, s]) => s === "down");

  if (dismissed || (degraded.length === 0 && down.length === 0)) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-4 py-2 text-sm
                 bg-amber-950/80 border-b border-amber-700/50 text-amber-200"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {down.length > 0 && (
          <span className="font-semibold text-red-300">
            🔴 Unavailable:{" "}
            {down.map(([name]) => (
              <span key={name} className="capitalize">{name}</span>
            )).reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]), [])}
          </span>
        )}
        {degraded.length > 0 && (
          <span className="text-amber-300">
            🟡 Degraded:{" "}
            {degraded.map(([name]) => (
              <span key={name} className="capitalize">{name}</span>
            )).reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]), [])}
          </span>
        )}
        <span className="text-slate-400">— other modules unaffected</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-2 shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

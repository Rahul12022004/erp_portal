/**
 * Skeleton shown while a lazy module chunk is loading.
 * Matches the rough layout of a module page to avoid jarring jumps.
 */

export function ModuleFallback() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 rounded-md bg-slate-800/60" />
      <div className="h-4 w-72 rounded bg-slate-800/40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-800/40" />
        ))}
      </div>
    </div>
  );
}

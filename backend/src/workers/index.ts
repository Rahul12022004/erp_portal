// Workers disabled — Redis not available. Jobs run inline via enqueue.ts.
export function startWorkers(): void {
  console.log("[workers] running in inline mode (no Redis)");
}

export async function stopWorkers(): Promise<void> {}

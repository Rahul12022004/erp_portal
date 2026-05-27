// No-op job logger — Redis not available
export function startJobLogger(): void {}

export async function sendToDlq(
  _queueName: string,
  _jobId: string,
  _jobName: string,
  _data: unknown,
  failedReason: string,
): Promise<void> {
  console.error("[DLQ] (no-op) job permanently failed:", failedReason);
}

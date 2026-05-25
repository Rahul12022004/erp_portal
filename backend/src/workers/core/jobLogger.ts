import { QueueEvents } from "bullmq";
import { createRedisConnection } from "./redis";
import { dlqQueue } from "./queues";

const QUEUE_NAMES = ["erp:reports", "erp:notifications", "erp:exports", "erp:imports"] as const;

type QueueName = (typeof QUEUE_NAMES)[number];

const TAG: Record<QueueName, string> = {
  "erp:reports":       "[reports]",
  "erp:notifications": "[notify]",
  "erp:exports":       "[exports]",
  "erp:imports":       "[imports]",
};

export function startJobLogger(): void {
  for (const name of QUEUE_NAMES) {
    const events = new QueueEvents(name, { connection: createRedisConnection() });
    const tag = TAG[name];

    events.on("active",    ({ jobId }) => console.log(`${tag} job ${jobId} active`));
    events.on("progress",  ({ jobId, data }) => console.log(`${tag} job ${jobId} progress ${JSON.stringify(data)}`));
    events.on("completed", ({ jobId, returnvalue }) => {
      console.log(`${tag} job ${jobId} completed`, returnvalue ? JSON.parse(returnvalue as string) : "");
    });
    events.on("failed", async ({ jobId, failedReason, prev }) => {
      console.error(`${tag} job ${jobId} failed (prev=${prev}): ${failedReason}`);
    });
    events.on("stalled", ({ jobId }) => {
      console.warn(`${tag} job ${jobId} stalled — worker may have crashed`);
    });
    events.on("error", (err) => {
      console.error(`${tag} QueueEvents error:`, err);
    });
  }
}

// Forward a permanently-failed job to the DLQ.
// Call this from each Worker's `failed` event after all retries are exhausted.
export async function sendToDlq(
  queueName: string,
  jobId: string,
  jobName: string,
  data: unknown,
  failedReason: string,
): Promise<void> {
  try {
    await dlqQueue.add("dlq", {
      originalQueue: queueName,
      originalJobId: jobId,
      originalName: jobName,
      data,
      failedReason,
      failedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[DLQ] failed to enqueue dead letter:", err);
  }
}

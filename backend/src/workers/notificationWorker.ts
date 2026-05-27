import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "./core/redis";
import { sendToDlq } from "./core/jobLogger";
import { handleNotificationJob } from "./handlers/notificationHandler";
import type { NotificationJobData } from "./core/types";

const QUEUE = "erp-notifications";
const CONCURRENCY = 5; // higher concurrency for IO-bound email sending

export function createNotificationWorker(): Worker<NotificationJobData> {
  const worker = new Worker<NotificationJobData>(
    QUEUE,
    async (job: Job<NotificationJobData>) => {
      console.log(`[notify] processing job ${job.id} type=${job.data.type}`);
      return handleNotificationJob(job);
    },
    {
      connection: createRedisConnection(),
      concurrency: CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[notify] job ${job.id} done`);
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 5);
    console.error(`[notify] job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
    if (isLastAttempt) {
      await sendToDlq(QUEUE, job.id ?? "unknown", job.name, job.data, err.message);
    }
  });

  worker.on("error", (err) => {
    console.error("[notify] worker error:", err.message);
  });

  return worker;
}

import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "./core/redis";
import { sendToDlq } from "./core/jobLogger";
import { handleImportJob } from "./handlers/importHandler";
import type { ImportJobData } from "./core/types";

const QUEUE = "erp-imports";
const CONCURRENCY = 1; // imports hit MongoDB hard — keep serial per instance

export function createImportWorker(): Worker<ImportJobData> {
  const worker = new Worker<ImportJobData>(
    QUEUE,
    async (job: Job<ImportJobData>) => {
      console.log(`[imports] processing job ${job.id} type=${job.data.type} batch=${job.data.batchId}`);
      return handleImportJob(job);
    },
    {
      connection: createRedisConnection(),
      concurrency: CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[imports] job ${job.id} done`);
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
    console.error(`[imports] job ${job.id} failed: ${err.message}`);
    if (isLastAttempt) {
      await sendToDlq(QUEUE, job.id ?? "unknown", job.name, job.data, err.message);
    }
  });

  worker.on("error", (err) => {
    console.error("[imports] worker error:", err.message);
  });

  return worker;
}

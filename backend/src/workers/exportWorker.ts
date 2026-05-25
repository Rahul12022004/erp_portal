import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "./core/redis";
import { sendToDlq } from "./core/jobLogger";
import { handleExportJob } from "./handlers/exportHandler";
import type { ExportJobData } from "./core/types";

const QUEUE = "erp:exports";
const CONCURRENCY = 3;

export function createExportWorker(): Worker<ExportJobData> {
  const worker = new Worker<ExportJobData>(
    QUEUE,
    async (job: Job<ExportJobData>) => {
      console.log(`[exports] processing job ${job.id} type=${job.data.type}`);
      return handleExportJob(job);
    },
    {
      connection: createRedisConnection(),
      concurrency: CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[exports] job ${job.id} done`);
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 2);
    console.error(`[exports] job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
    if (isLastAttempt) {
      await sendToDlq(QUEUE, job.id ?? "unknown", job.name, job.data, err.message);
    }
  });

  worker.on("error", (err) => {
    console.error("[exports] worker error:", err.message);
  });

  return worker;
}

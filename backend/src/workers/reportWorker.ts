import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "./core/redis";
import { sendToDlq } from "./core/jobLogger";
import { handleReportJob } from "./handlers/reportHandler";
import type { ReportJobData } from "./core/types";

const QUEUE = "erp:reports";
const CONCURRENCY = 2;

export function createReportWorker(): Worker<ReportJobData> {
  const worker = new Worker<ReportJobData>(
    QUEUE,
    async (job: Job<ReportJobData>) => {
      console.log(`[reports] processing job ${job.id} type=${job.data.type}`);
      return handleReportJob(job);
    },
    {
      connection: createRedisConnection(),
      concurrency: CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[reports] job ${job.id} done`);
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3);
    console.error(`[reports] job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
    if (isLastAttempt) {
      await sendToDlq(QUEUE, job.id ?? "unknown", job.name, job.data, err.message);
    }
  });

  worker.on("error", (err) => {
    console.error("[reports] worker error:", err.message);
  });

  return worker;
}

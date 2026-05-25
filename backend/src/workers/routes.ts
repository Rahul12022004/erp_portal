/**
 * /api/jobs — enqueue endpoints and job status polling.
 *
 * POST /api/jobs/report        { type, schoolId, ... }  → { jobId, queue, status: "queued" }
 * POST /api/jobs/notification  { type, ... }            → { jobId, queue, status: "queued" }
 * POST /api/jobs/export        { type, schoolId, ... }  → { jobId, queue, status: "queued" }
 * POST /api/jobs/import        { type, schoolId, batchId, ... } → { jobId, queue, status: "queued" }
 * GET  /api/jobs/status/:queue/:jobId                   → { jobId, state, progress, result?, failedReason? }
 */

import { Router } from "express";
import { Queue } from "bullmq";
import { enqueueReport, enqueueNotification, enqueueExport, enqueueImport } from "./enqueue";
import { createRedisConnection } from "./core/redis";

export const jobsRouter = Router();

// ── Enqueue endpoints ─────────────────────────────────────────────────────────

jobsRouter.post("/report", async (req, res, next) => {
  try {
    const result = await enqueueReport(req.body);
    res.status(202).json(result);
  } catch (err) { next(err); }
});

jobsRouter.post("/notification", async (req, res, next) => {
  try {
    const result = await enqueueNotification(req.body);
    res.status(202).json(result);
  } catch (err) { next(err); }
});

jobsRouter.post("/export", async (req, res, next) => {
  try {
    const result = await enqueueExport(req.body);
    res.status(202).json(result);
  } catch (err) { next(err); }
});

jobsRouter.post("/import", async (req, res, next) => {
  try {
    const result = await enqueueImport(req.body);
    res.status(202).json(result);
  } catch (err) { next(err); }
});

// ── Job status polling ────────────────────────────────────────────────────────

const ALLOWED_QUEUES = new Set(["erp:reports", "erp:notifications", "erp:exports", "erp:imports", "erp:dlq"]);

jobsRouter.get("/status/:queueName/:jobId", async (req, res, next) => {
  try {
    const { queueName, jobId } = req.params;
    if (!ALLOWED_QUEUES.has(queueName)) {
      res.status(400).json({ error: `Unknown queue: ${queueName}` });
      return;
    }

    const queue = new Queue(queueName, { connection: createRedisConnection() });
    const job = await queue.getJob(jobId);
    await queue.close();

    if (!job) {
      res.status(404).json({ error: `Job ${jobId} not found in ${queueName}` });
      return;
    }

    const state = await job.getState();
    const progress = job.progress;

    res.json({
      jobId: job.id,
      queue:  queueName,
      name:   job.name,
      state,
      progress,
      attemptsMade: job.attemptsMade,
      createdAt:    new Date(job.timestamp).toISOString(),
      processedAt:  job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedAt:   job.finishedOn  ? new Date(job.finishedOn).toISOString()  : null,
      result:       job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    });
  } catch (err) { next(err); }
});

// ── DLQ drain (admin) ─────────────────────────────────────────────────────────

jobsRouter.get("/dlq", async (req, res, next) => {
  try {
    const queue = new Queue("erp:dlq", { connection: createRedisConnection() });
    const jobs = await queue.getJobs(["completed", "failed", "waiting"], 0, 99);
    await queue.close();

    res.json({
      count: jobs.length,
      jobs: jobs.map((j) => ({
        id:        j.id,
        data:      j.data,
        createdAt: new Date(j.timestamp).toISOString(),
      })),
    });
  } catch (err) { next(err); }
});

/**
 * /api/jobs — enqueue endpoints (inline execution) + stub status routes.
 *
 * POST /api/jobs/report        → 202 { jobId, queue, status: "queued" }
 * POST /api/jobs/notification  → 202 { jobId, queue, status: "queued" }
 * POST /api/jobs/export        → 202 { jobId, queue, status: "queued" }
 * POST /api/jobs/import        → 202 { jobId, queue, status: "queued" }
 * GET  /api/jobs/status/:q/:id → 503 (Redis not available)
 * GET  /api/jobs/dlq           → 503 (Redis not available)
 */

import { Router } from "express";
import { enqueueReport, enqueueNotification, enqueueExport, enqueueImport } from "./enqueue";

export const jobsRouter = Router();

jobsRouter.post("/report", async (req, res, next) => {
  try { res.status(202).json(await enqueueReport(req.body)); } catch (err) { next(err); }
});

jobsRouter.post("/notification", async (req, res, next) => {
  try { res.status(202).json(await enqueueNotification(req.body)); } catch (err) { next(err); }
});

jobsRouter.post("/export", async (req, res, next) => {
  try { res.status(202).json(await enqueueExport(req.body)); } catch (err) { next(err); }
});

jobsRouter.post("/import", async (req, res, next) => {
  try { res.status(202).json(await enqueueImport(req.body)); } catch (err) { next(err); }
});

const redisUnavailable = (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) =>
  res.status(503).json({ error: "Job status tracking requires Redis — not available in this environment" });

jobsRouter.get("/status/:queueName/:jobId", redisUnavailable);
jobsRouter.get("/dlq", redisUnavailable);

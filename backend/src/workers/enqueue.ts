/**
 * Public API for enqueueing background jobs.
 * Routes call these functions and return immediately with { jobId, queue, status }.
 */

import { reportQueue, notificationQueue, exportQueue, importQueue } from "./core/queues";
import type { ReportJobData, NotificationJobData, ExportJobData, ImportJobData } from "./core/types";

export type EnqueueResult = {
  jobId: string;
  queue: string;
  status: "queued";
};

export async function enqueueReport(data: ReportJobData): Promise<EnqueueResult> {
  const job = await reportQueue.add(data.type, data);
  return { jobId: job.id!, queue: "erp:reports", status: "queued" };
}

export async function enqueueNotification(data: NotificationJobData): Promise<EnqueueResult> {
  const job = await notificationQueue.add(data.type, data);
  return { jobId: job.id!, queue: "erp:notifications", status: "queued" };
}

export async function enqueueExport(data: ExportJobData): Promise<EnqueueResult> {
  const job = await exportQueue.add(data.type, data);
  return { jobId: job.id!, queue: "erp:exports", status: "queued" };
}

export async function enqueueImport(data: ImportJobData): Promise<EnqueueResult> {
  const job = await importQueue.add(data.type, data);
  return { jobId: job.id!, queue: "erp:imports", status: "queued" };
}

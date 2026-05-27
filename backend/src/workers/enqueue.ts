/**
 * Inline job runner — no Redis. Handlers run in-process via setImmediate.
 * Drop-in replacement for the BullMQ enqueue API.
 */

import { handleReportJob }       from "./handlers/reportHandler";
import { handleNotificationJob } from "./handlers/notificationHandler";
import { handleExportJob }       from "./handlers/exportHandler";
import { handleImportJob }       from "./handlers/importHandler";
import type { ReportJobData, NotificationJobData, ExportJobData, ImportJobData } from "./core/types";

export type EnqueueResult = { jobId: string; queue: string; status: "queued" };

function fakeJob<T>(data: T, id: string) {
  return { id, data } as import("bullmq").Job<T>;
}

function runAsync<T>(
  queue: string,
  data: T,
  handler: (job: import("bullmq").Job<T>) => Promise<unknown>,
): EnqueueResult {
  const jobId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  setImmediate(async () => {
    try {
      await handler(fakeJob(data, jobId));
    } catch (err) {
      console.error(`[${queue}] inline job ${jobId} failed:`, err);
    }
  });
  return { jobId, queue, status: "queued" };
}

export async function enqueueReport(data: ReportJobData): Promise<EnqueueResult> {
  return runAsync("erp-reports", data, handleReportJob);
}

export async function enqueueNotification(data: NotificationJobData): Promise<EnqueueResult> {
  return runAsync("erp-notifications", data, handleNotificationJob);
}

export async function enqueueExport(data: ExportJobData): Promise<EnqueueResult> {
  return runAsync("erp-exports", data, handleExportJob);
}

export async function enqueueImport(data: ImportJobData): Promise<EnqueueResult> {
  return runAsync("erp-imports", data, handleImportJob);
}

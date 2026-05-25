import type { Worker } from "bullmq";
import { createReportWorker } from "./reportWorker";
import { createNotificationWorker } from "./notificationWorker";
import { createExportWorker } from "./exportWorker";
import { createImportWorker } from "./importWorker";
import { startJobLogger } from "./core/jobLogger";

let workers: Worker[] = [];

export function startWorkers(): void {
  if (workers.length > 0) return; // already started

  // QueueEvents listeners — log every transition to stdout
  startJobLogger();

  workers = [
    createReportWorker(),
    createNotificationWorker(),
    createExportWorker(),
    createImportWorker(),
  ];

  console.log(`[workers] started ${workers.length} workers (reports, notifications, exports, imports)`);
}

export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
  console.log("[workers] all workers stopped");
}

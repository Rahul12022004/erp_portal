import { Queue, type DefaultJobOptions } from "bullmq";
import { createRedisConnection } from "./redis";
import type { ReportJobData, NotificationJobData, ExportJobData, ImportJobData, DlqJobData } from "./types";

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 100 },
};

export const reportQueue = new Queue<ReportJobData>("erp:reports", {
  connection: createRedisConnection(),
  defaultJobOptions,
});

export const notificationQueue = new Queue<NotificationJobData>("erp:notifications", {
  connection: createRedisConnection(),
  defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});

export const exportQueue = new Queue<ExportJobData>("erp:exports", {
  connection: createRedisConnection(),
  defaultJobOptions: { ...defaultJobOptions, attempts: 2 },
});

export const importQueue = new Queue<ImportJobData>("erp:imports", {
  connection: createRedisConnection(),
  defaultJobOptions: { ...defaultJobOptions, attempts: 1 }, // imports are not idempotent by default
});

// Dead-letter queue — failed jobs from all queues land here for inspection / replay
export const dlqQueue = new Queue<DlqJobData>("erp:dlq", {
  connection: createRedisConnection(),
  defaultJobOptions: { attempts: 1, removeOnComplete: { count: 500 }, removeOnFail: false },
});

export const ALL_QUEUES = [reportQueue, notificationQueue, exportQueue, importQueue] as const;

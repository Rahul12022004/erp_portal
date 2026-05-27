// Queue stubs — no Redis, no BullMQ connections
import type { ReportJobData, NotificationJobData, ExportJobData, ImportJobData, DlqJobData } from "./types";

type StubQueue<T> = { add: (_name: string, _data: T) => Promise<{ id: string }> };

const stubQueue = <T>(): StubQueue<T> => ({
  add: async (_name, _data) => ({ id: `local-${Date.now()}` }),
});

export const reportQueue       = stubQueue<ReportJobData>();
export const notificationQueue = stubQueue<NotificationJobData>();
export const exportQueue       = stubQueue<ExportJobData>();
export const importQueue       = stubQueue<ImportJobData>();
export const dlqQueue          = stubQueue<DlqJobData>();

// ── Report queue ──────────────────────────────────────────────────────────────

export type ReportJobData =
  | { type: "FEE_REPORT"; schoolId: string; academicYear: string; classId?: string; requestedBy: string }
  | { type: "ATTENDANCE_REPORT"; schoolId: string; fromDate: string; toDate: string; classId?: string; requestedBy: string }
  | { type: "EXAM_REPORT"; schoolId: string; examId: string; requestedBy: string }
  | { type: "PAYROLL_REPORT"; schoolId: string; month: string; requestedBy: string };

// ── Notification queue ────────────────────────────────────────────────────────

export type NotificationJobData =
  | { type: "EMAIL"; to: string; subject: string; html: string; schoolId: string }
  | { type: "BULK_EMAIL"; recipients: string[]; subject: string; html: string; schoolId: string }
  | { type: "TRIGGER_EVENT"; eventType: string; schoolId: string; payload: Record<string, unknown> };

// ── Export queue ──────────────────────────────────────────────────────────────

export type ExportJobData =
  | { type: "EXCEL_STUDENTS"; schoolId: string; classId?: string; academicYear?: string; requestedBy: string }
  | { type: "EXCEL_FEES"; schoolId: string; academicYear?: string; classId?: string; requestedBy: string }
  | { type: "EXCEL_ATTENDANCE"; schoolId: string; classId?: string; fromDate: string; toDate: string; requestedBy: string }
  | { type: "EXCEL_MARKS"; schoolId: string; examId: string; requestedBy: string };

// ── Import queue ──────────────────────────────────────────────────────────────

export type ImportJobData =
  | { type: "STUDENTS"; schoolId: string; batchId: string; requestedBy: string }
  | { type: "FEE_BULK"; schoolId: string; batchId: string; requestedBy: string };

// ── Dead-letter queue ─────────────────────────────────────────────────────────

export type DlqJobData = {
  originalQueue: string;
  originalJobId: string;
  originalName: string;
  data: unknown;
  failedReason: string;
  failedAt: string;
};

// ── Shared result shape ───────────────────────────────────────────────────────

export type JobResult = {
  success: boolean;
  message?: string;
  rowsProcessed?: number;
  recipientCount?: number;
  outputKey?: string; // storage key for generated file
};

import { ApiError } from '$lib/types';

// ─── Go envelope ──────────────────────────────────────────────────────────────
// The Go backend always responds with { success, data }. The api client returns
// the raw JSON body, so callers unwrap .data here.
export interface GoEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Unwrap Go's { success, data } envelope. Throws ApiError on success:false. */
export function unwrapGo<T>(json: GoEnvelope<T>): T {
  if (json && json.success === false) {
    throw new ApiError(400, json.error ?? json.message ?? 'API error');
  }
  return json?.data as T;
}

// Pull a plain array out of an envelope, tolerating `data: [...]` or a bare array.
function toArray(json: unknown): Record<string, unknown>[] {
  const data = (json as GoEnvelope<unknown>)?.data ?? json;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

// ─── Frontend models (shared with the school dashboard) ─────────────────────────
export type ClassData = { name: string; students: number };
export type FinanceData = { month: string; fees: number; expense: number; profit: number };
export type NotificationItem = { id?: string; title: string; desc: string; time: string; author?: string };
export type ExamItem = {
  _id: string; title: string; examType: string; className: string;
  subject: string; examDate: string; startTime: string; endTime: string;
};
export type LeaveApplication = {
  _id: string; title: string; description: string;
  leaveType: 'Paid' | 'Unpaid' | 'Emergency';
  fileName?: string; fileData?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  teacherId?: { _id: string; name: string; email: string; position: string };
};

// ─── Normalizers (Go camelCase JSON → typed models) ─────────────────────────────

/** GET /api/classes?schoolId= → ClassData[] */
export function normalizeClasses(json: unknown): ClassData[] {
  return toArray(json).map((c) => {
    const section = String(c.section ?? '');
    return {
      name: String(c.name ?? '') + (section ? `-${section}` : ''),
      students: Number(c.studentCount ?? 0),
    };
  });
}

/** GET /api/announcements?schoolId= → NotificationItem[] */
export function normalizeAnnouncements(json: unknown): NotificationItem[] {
  return toArray(json).map((a) => ({
    id: String(a._id ?? ''),
    title: String(a.title ?? ''),
    desc: String(a.message ?? ''),
    time: a.createdAt ? new Date(String(a.createdAt)).toLocaleDateString('en-IN') : '',
    author: String(a.author ?? ''),
  }));
}

/** GET /api/analytics/fee/trend?schoolId= → FinanceData[] */
export function normalizeFeeTrend(json: unknown): FinanceData[] {
  return toArray(json).map((r) => {
    const collected = Number(r.collected ?? 0);
    const pending = Number(r.pending ?? 0);
    return {
      month: String(r._id ?? ''),
      fees: collected + pending,
      expense: pending,
      profit: collected,
    };
  });
}

/** GET /api/exams/school/:schoolId → ExamItem[] */
export function normalizeExams(json: unknown): ExamItem[] {
  return toArray(json).map((e) => ({
    _id: String(e._id ?? ''),
    title: String(e.title ?? ''),
    examType: String(e.examType ?? ''),
    className: String(e.className ?? ''),
    subject: String(e.subject ?? ''),
    examDate: String(e.examDate ?? ''),
    startTime: String(e.startTime ?? ''),
    endTime: String(e.endTime ?? ''),
  }));
}

/** GET /api/leaves/school/:schoolId → LeaveApplication[]
 *  TODO(go-migration): Go returns teacherId as a bare string ID, not a populated
 *  object. Until the backend populates teacher details, teacherId is left
 *  undefined so the UI falls back to "Unknown". */
export function normalizeLeaves(json: unknown): LeaveApplication[] {
  return toArray(json).map((l) => ({
    _id: String(l._id ?? ''),
    title: String(l.title ?? ''),
    description: String(l.description ?? ''),
    leaveType: String(l.leaveType ?? 'Paid') as LeaveApplication['leaveType'],
    status: String(l.status ?? 'Pending') as LeaveApplication['status'],
    fileName: l.fileName ? String(l.fileName) : undefined,
    fileData: l.fileData ? String(l.fileData) : undefined,
    createdAt: String(l.createdAt ?? ''),
    teacherId: undefined,
  }));
}

import mongoose from "mongoose";
import AuditLog, { type AuditAction } from "./AuditLog";
import { createLogger } from "../logger";

const log = createLogger("audit");

export interface RecordAuditOptions {
  requestId: string;
  module: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  schoolId?: string;
  userId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  statusCode: number;
  durationMs: number;
}

/**
 * Persist an audit log entry. Fire-and-forget — never throws.
 * Failures are logged but do not affect the response.
 */
export function recordAudit(opts: RecordAuditOptions): void {
  setImmediate(() => {
    AuditLog.create({
      ...opts,
      schoolId: opts.schoolId ? new mongoose.Types.ObjectId(opts.schoolId) : undefined,
    }).catch((err: unknown) => {
      log.error({ err, requestId: opts.requestId }, "Failed to write audit log");
    });
  });
}

/**
 * Query audit history for an entity — useful for a "History" panel in the UI.
 */
export async function getEntityHistory(
  entityType: string,
  entityId: string,
  limit = 50,
) {
  return AuditLog.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Query recent audit log for a school — used by admin dashboards.
 */
export async function getSchoolAuditLog(
  schoolId: string,
  opts: { module?: string; action?: string; limit?: number; offset?: number } = {},
) {
  const filter: Record<string, unknown> = { schoolId: new mongoose.Types.ObjectId(schoolId) };
  if (opts.module) filter["module"] = opts.module;
  if (opts.action) filter["action"] = opts.action;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(opts.offset ?? 0)
      .limit(opts.limit ?? 50)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { items, total };
}

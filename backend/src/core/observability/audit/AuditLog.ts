import mongoose from "mongoose";

export type AuditAction =
  // Finance
  | "FEE_PAYMENT_RECORDED"
  | "FEE_STRUCTURE_CREATED"
  | "FEE_STRUCTURE_UPDATED"
  | "FEE_STRUCTURE_DELETED"
  | "TRANSPORT_STATUS_CHANGED"
  // Students
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "STUDENT_DELETED"
  // Academics
  | "ATTENDANCE_RECORDED"
  | "ATTENDANCE_EDITED"
  | "MARK_SUBMITTED"
  | "MARK_MODIFIED"
  // HR / Payroll
  | "PAYROLL_CREATED"
  | "PAYROLL_UPDATED"
  | "PAYROLL_DELETED"
  // Auth
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  // Generic
  | string;

const auditLogSchema = new mongoose.Schema(
  {
    requestId:  { type: String, required: true, index: true },
    module:     { type: String, required: true, index: true },
    action:     { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId:   { type: String, index: true },
    schoolId:   { type: mongoose.Schema.Types.ObjectId, ref: "School", index: true },
    userId:     { type: String, index: true },
    before:     { type: mongoose.Schema.Types.Mixed },
    after:      { type: mongoose.Schema.Types.Mixed },
    ip:         { type: String },
    userAgent:  { type: String },
    statusCode: { type: Number, required: true },
    durationMs: { type: Number, required: true },
  },
  {
    timestamps: true,
    collection: "audit_logs",
  },
);

auditLogSchema.index({ schoolId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

// TTL: auto-delete after 2 years in production
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 },
);

export interface AuditLogDoc {
  requestId: string;
  module: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  schoolId?: mongoose.Types.ObjectId;
  userId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  statusCode: number;
  durationMs: number;
  createdAt: Date;
}

export default mongoose.model<AuditLogDoc>("AuditLog", auditLogSchema);

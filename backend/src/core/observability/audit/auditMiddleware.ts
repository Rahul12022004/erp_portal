import type { Request, Response, NextFunction, RequestHandler } from "express";
import { recordAudit, type RecordAuditOptions } from "./auditService";
import { elapsedMs } from "../requestContext";
import type { AuditAction } from "./AuditLog";

interface AuditMiddlewareOpts {
  module: string;
  action: AuditAction;
  entityType: string;
  /** Extract entityId from req — defaults to req.params.id */
  getEntityId?: (req: Request) => string | undefined;
  /** Extract before-state — call DB here if you need it */
  getBefore?: (req: Request) => Promise<Record<string, unknown> | undefined>;
  /** Scrub sensitive fields from the request body before logging */
  scrubFields?: string[];
}

const DEFAULT_SCRUB = ["password", "token", "secret", "pin", "cvv", "card"];

function scrubBody(
  body: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const scrubSet = new Set([...DEFAULT_SCRUB, ...fields].map((f) => f.toLowerCase()));
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, scrubSet.has(k.toLowerCase()) ? "[REDACTED]" : v]),
  );
}

/**
 * Express middleware that writes an audit log entry on every response finish.
 *
 * Usage:
 *   router.post("/payments", withAuditLog({ module: "finance", action: "FEE_PAYMENT_RECORDED", entityType: "StudentFeePayment" }), handler)
 */
export function withAuditLog(opts: AuditMiddlewareOpts): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Capture before-state async if needed, without blocking the request
    const beforePromise = opts.getBefore ? opts.getBefore(req).catch(() => undefined) : Promise.resolve(undefined);

    res.on("finish", () => {
      void beforePromise.then((before) => {
        const entityId =
          opts.getEntityId?.(req) ??
          (req.params.id as string | undefined) ??
          (req.params.studentId as string | undefined) ??
          (req.body?.id as string | undefined);

        const after = req.body && typeof req.body === "object"
          ? scrubBody(req.body as Record<string, unknown>, opts.scrubFields ?? [])
          : undefined;

        const entry: RecordAuditOptions = {
          requestId:  req.requestId ?? "unknown",
          module:     opts.module,
          action:     opts.action,
          entityType: opts.entityType,
          entityId,
          schoolId:   req.schoolId ?? (req.body?.schoolId as string | undefined),
          userId:     req.userId,
          before,
          after,
          ip:         req.ip ?? undefined,
          userAgent:  req.headers["user-agent"] ?? undefined,
          statusCode: res.statusCode,
          durationMs: elapsedMs(req.startHrTime ?? process.hrtime()),
        };

        recordAudit(entry);
      });
    });

    next();
  };
}

// ── Pre-built audit middleware for key operations ─────────────────────────────

export const auditFeePayment = withAuditLog({
  module:     "finance",
  action:     "FEE_PAYMENT_RECORDED",
  entityType: "StudentFeePayment",
  getEntityId: (req) => req.body?.student_fee_assignment_id as string | undefined,
});

export const auditFeeStructureCreate = withAuditLog({
  module:     "finance",
  action:     "FEE_STRUCTURE_CREATED",
  entityType: "ClassFeeStructure",
});

export const auditFeeStructureUpdate = withAuditLog({
  module:     "finance",
  action:     "FEE_STRUCTURE_UPDATED",
  entityType: "ClassFeeStructure",
  getEntityId: (req) => req.params["id"] as string | undefined,
});

export const auditFeeStructureDelete = withAuditLog({
  module:     "finance",
  action:     "FEE_STRUCTURE_DELETED",
  entityType: "ClassFeeStructure",
  getEntityId: (req) => req.params["id"] as string | undefined,
});

export const auditTransportStatusChange = withAuditLog({
  module:     "finance",
  action:     "TRANSPORT_STATUS_CHANGED",
  entityType: "Student",
  getEntityId: (req) => req.params["studentId"] as string | undefined,
});

export const auditStudentDeletion = withAuditLog({
  module:     "students",
  action:     "STUDENT_DELETED",
  entityType: "Student",
  getEntityId: (req) => req.params["id"] as string | undefined,
});

export const auditStudentUpdate = withAuditLog({
  module:     "students",
  action:     "STUDENT_UPDATED",
  entityType: "Student",
  getEntityId: (req) => req.params["id"] as string | undefined,
});

export const auditAttendanceRecord = withAuditLog({
  module:     "academics",
  action:     "ATTENDANCE_RECORDED",
  entityType: "Attendance",
});

export const auditAttendanceEdit = withAuditLog({
  module:     "academics",
  action:     "ATTENDANCE_EDITED",
  entityType: "Attendance",
});

export const auditMarkSubmit = withAuditLog({
  module:     "academics",
  action:     "MARK_SUBMITTED",
  entityType: "Mark",
});

export const auditMarkModification = withAuditLog({
  module:     "academics",
  action:     "MARK_MODIFIED",
  entityType: "Mark",
});

export const auditPayrollUpdate = withAuditLog({
  module:     "hr",
  action:     "PAYROLL_UPDATED",
  entityType: "Payroll",
});

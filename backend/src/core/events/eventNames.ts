/**
 * Canonical event names for the ERP domain.
 *
 * Convention: <domain>.<subdomain?>.<action>
 *   - all lowercase, dot-separated
 *   - use past tense for actions that already happened
 *   - wildcard listeners can subscribe to e.g. "fee.*" or "student.*"
 */
export const EVENTS = {
  // ── Student ─────────────────────────────────────────────
  STUDENT_ENROLLED:          "student.enrolled",
  STUDENT_TRANSFERRED:       "student.transferred",
  STUDENT_TRANSPORT_UPDATED: "student.transport.updated",
  STUDENT_DELETED:           "student.deleted",

  // ── Admissions ──────────────────────────────────────────
  ADMISSION_CREATED:         "admission.created",
  ADMISSION_CONFIRMED:       "admission.confirmed",
  ADMISSION_REJECTED:        "admission.rejected",

  // ── Fee / Finance ────────────────────────────────────────
  FEE_STRUCTURE_CREATED:     "fee.structure.created",
  FEE_ASSIGNED:              "fee.assigned",
  FEE_PAYMENT_COMPLETED:     "fee.payment.completed",
  FEE_PAYMENT_FAILED:        "fee.payment.failed",
  FEE_OVERDUE:               "fee.overdue",

  // ── Attendance ───────────────────────────────────────────
  ATTENDANCE_MARKED:         "attendance.marked",
  ATTENDANCE_ABSENT:         "attendance.absent",
  ATTENDANCE_LATE:           "attendance.late",

  // ── Exams ────────────────────────────────────────────────
  EXAM_CREATED:              "exam.created",
  EXAM_RESULT_PUBLISHED:     "exam.result.published",

  // ── Payroll ──────────────────────────────────────────────
  PAYROLL_GENERATED:         "payroll.generated",
  PAYROLL_DISBURSED:         "payroll.disbursed",

  // ── School ───────────────────────────────────────────────
  SCHOOL_CREATED:            "school.created",
  SCHOOL_DELETED:            "school.deleted",

  // ── Notifications (outbound) ─────────────────────────────
  NOTIFICATION_SEND:         "notification.send",

  // ── Analytics ────────────────────────────────────────────
  ANALYTICS_TRACK:           "analytics.track",
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

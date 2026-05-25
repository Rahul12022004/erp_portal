/**
 * Notifications event subscribers.
 *
 * Reacts to domain events and dispatches messages via the communication
 * trigger engine. Zero direct imports from other business modules.
 * All data arrives inside event payloads.
 *
 * Before (tight coupling):
 *   financeService.recordPayment() → notificationService.sendReceipt(studentId, amount)
 *   attendanceService.mark()      → notificationService.sendAlert(studentId)
 *
 * After (decoupled):
 *   notifications subscribes to events — callers never know it exists.
 */

import { eventBus, EVENTS } from "../../../core/events";
import { fireEvent } from "../../communication/services/triggerEngine";
import type {
  FeePaymentCompletedEvent,
  FeeOverdueEvent,
  AttendanceAbsentEvent,
  AttendanceLateEvent,
  AdmissionConfirmedEvent,
  ExamResultPublishedEvent,
} from "../../../core/events";
import { logger } from "../../../infrastructure/logger";

// ── fee.payment.completed → send receipt ─────────────────────────────────────

eventBus.subscribe<FeePaymentCompletedEvent>(
  EVENTS.FEE_PAYMENT_COMPLETED,
  async (payload) => {
    await fireEvent({
      eventType: "FEE_PAYMENT_RECEIVED",
      schoolId: payload.schoolId,
      payload: {
        studentName: payload.studentName,
        amount: payload.amount,
        receiptNo: payload.receiptNo,
        date: payload.paymentDate,
        email: payload.parentEmail ?? "",
        phone: payload.parentPhone ?? "",
      },
    });
    logger.info("[notifications] receipt dispatched", {
      studentId: payload.studentId,
      receiptNo: payload.receiptNo,
    });
  },
  { maxRetries: 3, timeoutMs: 10000 }
);

// ── fee.overdue → overdue reminder ────────────────────────────────────────────

eventBus.subscribe<FeeOverdueEvent>(
  EVENTS.FEE_OVERDUE,
  async (payload) => {
    await fireEvent({
      eventType: "FEE_OVERDUE",
      schoolId: payload.schoolId,
      payload: {
        studentName: payload.studentName,
        amount: payload.dueAmount,
        dueDate: payload.dueDate,
        email: payload.parentEmail ?? "",
        phone: payload.parentPhone ?? "",
      },
    });
  },
  { maxRetries: 2, timeoutMs: 8000 }
);

// ── attendance.absent → parent alert ─────────────────────────────────────────

eventBus.subscribe<AttendanceAbsentEvent>(
  EVENTS.ATTENDANCE_ABSENT,
  async (payload) => {
    await fireEvent({
      eventType: "ATTENDANCE_ABSENT",
      schoolId: payload.schoolId,
      payload: {
        studentName: payload.studentName,
        class: payload.className,
        date: payload.date,
        phone: payload.parentPhone ?? "",
        email: payload.parentEmail ?? "",
      },
    });
  },
  { maxRetries: 2, timeoutMs: 8000 }
);

// ── attendance.late → parent alert ────────────────────────────────────────────

eventBus.subscribe<AttendanceLateEvent>(
  EVENTS.ATTENDANCE_LATE,
  async (payload) => {
    await fireEvent({
      eventType: "ATTENDANCE_LATE",
      schoolId: payload.schoolId,
      payload: {
        studentName: payload.studentName,
        date: payload.date,
        time: payload.time,
        phone: payload.parentPhone ?? "",
        email: payload.parentEmail ?? "",
      },
    });
  },
  { maxRetries: 2, timeoutMs: 8000 }
);

// ── admission.confirmed → welcome message ────────────────────────────────────

eventBus.subscribe<AdmissionConfirmedEvent>(
  EVENTS.ADMISSION_CONFIRMED,
  async (payload) => {
    await fireEvent({
      eventType: "ADMISSION_CONFIRMED",
      schoolId: payload.schoolId,
      payload: {
        studentName: payload.studentName,
        parentName: payload.parentName,
        academicYear: payload.academicYear,
        email: payload.parentEmail ?? "",
        phone: payload.parentPhone ?? "",
      },
    });
  },
  { maxRetries: 2, timeoutMs: 8000 }
);

// ── exam.result.published → results notification ─────────────────────────────

eventBus.subscribe<ExamResultPublishedEvent>(
  EVENTS.EXAM_RESULT_PUBLISHED,
  async (payload) => {
    await fireEvent({
      eventType: "RESULT_PUBLISHED",
      schoolId: payload.schoolId,
      payload: {
        examName: payload.examName,
        classId: payload.classId,
      },
    });
  },
  { maxRetries: 2, timeoutMs: 8000 }
);

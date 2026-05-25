/**
 * Analytics event subscribers.
 *
 * Tracks domain events into metrics/audit without coupling to any
 * business module's internals. All data arrives via event payloads.
 *
 * Before (tight coupling):
 *   attendanceService.mark()      → analyticsService.recordAttendance(...)
 *   financeService.recordPayment() → analyticsService.recordRevenue(...)
 *
 * After (decoupled):
 *   analytics subscribes to events — business modules emit and forget.
 */

import { eventBus, EVENTS } from "../../../core/events";
import type {
  AttendanceMarkedEvent,
  FeePaymentCompletedEvent,
  ExamResultPublishedEvent,
  PayrollGeneratedEvent,
  AdmissionConfirmedEvent,
} from "../../../core/events";
import { logger } from "../../../infrastructure/logger";

// ── attendance.marked → daily stats ──────────────────────────────────────────

eventBus.subscribe<AttendanceMarkedEvent>(
  EVENTS.ATTENDANCE_MARKED,
  async (payload) => {
    const { schoolId, classId, date, presentCount, absentCount, totalStudents } = payload;
    const attendanceRate =
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    logger.info("[analytics] attendance.marked", {
      schoolId, classId, date, attendanceRate, presentCount, absentCount,
    });
    // Wire to your time-series store here (InfluxDB, MongoDB time-series, etc.)
  },
  { maxRetries: 1, timeoutMs: 5000 }
);

// ── fee.payment.completed → revenue tracking ──────────────────────────────────

eventBus.subscribe<FeePaymentCompletedEvent>(
  EVENTS.FEE_PAYMENT_COMPLETED,
  async (payload) => {
    logger.info("[analytics] fee.payment.completed", {
      schoolId: payload.schoolId,
      amount: payload.amount,
      paymentMode: payload.paymentMode,
      date: payload.paymentDate,
    });
    // Aggregate into monthly revenue dashboard
  },
  { maxRetries: 1, timeoutMs: 5000 }
);

// ── exam.result.published → academic performance ─────────────────────────────

eventBus.subscribe<ExamResultPublishedEvent>(
  EVENTS.EXAM_RESULT_PUBLISHED,
  async (payload) => {
    logger.info("[analytics] exam.result.published", {
      schoolId: payload.schoolId,
      examId: payload.examId,
      classId: payload.classId,
    });
  },
  { maxRetries: 1, timeoutMs: 5000 }
);

// ── payroll.generated → HR cost tracking ─────────────────────────────────────

eventBus.subscribe<PayrollGeneratedEvent>(
  EVENTS.PAYROLL_GENERATED,
  async (payload) => {
    logger.info("[analytics] payroll.generated", {
      schoolId: payload.schoolId,
      month: payload.month,
      year: payload.year,
      totalAmount: payload.totalAmount,
      staffCount: payload.staffCount,
    });
  },
  { maxRetries: 1, timeoutMs: 5000 }
);

// ── admission.confirmed → enrolment tracking ─────────────────────────────────

eventBus.subscribe<AdmissionConfirmedEvent>(
  EVENTS.ADMISSION_CONFIRMED,
  async (payload) => {
    logger.info("[analytics] admission.confirmed", {
      schoolId: payload.schoolId,
      classId: payload.classId,
      academicYear: payload.academicYear,
    });
  },
  { maxRetries: 1, timeoutMs: 5000 }
);

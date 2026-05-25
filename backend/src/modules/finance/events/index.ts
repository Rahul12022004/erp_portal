import { eventBus, EVENTS, createEvent } from "../../../core/events";
import type { FeePaymentCompletedEvent, FeeOverdueEvent } from "../../../core/events";
import ClassFeeStructure from "../models/ClassFeeStructure";
import Finance from "../models/Finance";
import InvestorLedger from "../models/InvestorLedger";
import SalaryRole from "../models/SalaryRole";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import StudentFeePayment from "../models/StudentFeePayment";
import { financeService } from "../services/financeService";
import {
  deleteStudentFinanceArtifacts,
  syncLegacyStudentFeeRecord,
} from "../services/studentFeeSyncService";

// ── Legacy payload types (kept for backward compat with existing subscribers) ──

type SchoolDeletedPayload = {
  schoolId: string;
};

type StudentUpsertedPayload = {
  studentId: string;
  schoolId: string;
  admissionCompleted?: boolean;
  transportActiveOverride?: boolean;
};

type StudentTransportStatusChangedPayload = {
  studentId: string;
  schoolId: string;
  transportActive: boolean;
};

type StudentDeletedPayload = {
  studentId: string;
  schoolId: string;
};

// ── Subscribers ───────────────────────────────────────────────────────────────

eventBus.subscribe<SchoolDeletedPayload>(EVENTS.SCHOOL_DELETED, async ({ schoolId }) => {
  await Promise.all([
    ClassFeeStructure.deleteMany({ school_id: schoolId }),
    Finance.deleteMany({ schoolId }),
    InvestorLedger.deleteMany({ schoolId }),
    SalaryRole.deleteMany({ schoolId }),
    StudentFeeAssignment.deleteMany({ school_id: schoolId }),
    StudentFeePayment.deleteMany({ school_id: schoolId }),
  ]);
});

eventBus.subscribe<StudentUpsertedPayload>("student.upserted", async (payload) => {
  if (payload.admissionCompleted === false) {
    return;
  }

  await Promise.all([
    syncLegacyStudentFeeRecord({
      studentId: payload.studentId,
      schoolId: payload.schoolId,
      transportActiveOverride: payload.transportActiveOverride,
    }),
    financeService.recalculateStudentTransportAssignments(payload.schoolId, payload.studentId),
  ]);
});

eventBus.subscribe<StudentTransportStatusChangedPayload>(
  "student.transport-status.changed",
  async ({ schoolId, studentId, transportActive }) => {
    await Promise.all([
      syncLegacyStudentFeeRecord({
        studentId,
        schoolId,
        transportActiveOverride: transportActive,
      }),
      financeService.recalculateStudentTransportAssignments(schoolId, studentId),
    ]);
  }
);

eventBus.subscribe<StudentDeletedPayload>("student.deleted", async ({ schoolId, studentId }) => {
  await Promise.all([
    deleteStudentFinanceArtifacts(studentId, schoolId),
    StudentFeeAssignment.deleteMany({
      school_id: schoolId,
      student_id: studentId,
    }),
    StudentFeePayment.deleteMany({
      school_id: schoolId,
      student_id: studentId,
    }),
  ]);
});

// ── Publishers ────────────────────────────────────────────────────────────────

/**
 * Publish after financeService.recordPayment() succeeds.
 * Notifications module sends receipt; analytics tracks revenue.
 *
 * Before (tight coupling in financeRoutes):
 *   const result = await financeService.recordPayment(...)
 *   await notificationService.sendReceipt(studentId, receiptNo, amount)  // ← direct call
 *
 * After (decoupled):
 *   const result = await financeService.recordPayment(...)
 *   publishFeePaymentCompleted({ ...result, parentEmail, parentPhone })
 */
export function publishFeePaymentCompleted(data: {
  schoolId: string;
  paymentId: string;
  studentId: string;
  studentName: string;
  assignmentId: string;
  amount: number;
  receiptNo: string;
  paymentMode: string;
  paymentDate: string;
  parentEmail?: string;
  parentPhone?: string;
}): void {
  const payload = createEvent<FeePaymentCompletedEvent>(
    { schoolId: data.schoolId },
    {
      paymentId: data.paymentId,
      studentId: data.studentId,
      studentName: data.studentName,
      assignmentId: data.assignmentId,
      amount: data.amount,
      receiptNo: data.receiptNo,
      paymentMode: data.paymentMode,
      paymentDate: data.paymentDate,
      parentEmail: data.parentEmail,
      parentPhone: data.parentPhone,
    }
  );
  eventBus.publish(EVENTS.FEE_PAYMENT_COMPLETED, payload);
}

/**
 * Publish when a fee is detected as overdue (e.g. in a scheduled job).
 * Notifications module sends parent reminder.
 */
export function publishFeeOverdue(data: {
  schoolId: string;
  studentId: string;
  studentName: string;
  assignmentId: string;
  dueAmount: number;
  dueDate: string;
  parentEmail?: string;
  parentPhone?: string;
}): void {
  const payload = createEvent<FeeOverdueEvent>(
    { schoolId: data.schoolId },
    {
      studentId: data.studentId,
      studentName: data.studentName,
      assignmentId: data.assignmentId,
      dueAmount: data.dueAmount,
      dueDate: data.dueDate,
      parentEmail: data.parentEmail,
      parentPhone: data.parentPhone,
    }
  );
  eventBus.publish(EVENTS.FEE_OVERDUE, payload);
}

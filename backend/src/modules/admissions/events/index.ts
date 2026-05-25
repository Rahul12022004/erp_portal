/**
 * Admissions → Finance, Notifications
 *
 * Previously (tight coupling):
 *   admissionsService.confirm(id) {
 *     await financeService.syncAssignments(...)   // ← direct cross-module call
 *     await notificationService.sendWelcome(...)  // ← direct cross-module call
 *   }
 *
 * Now (event-driven):
 *   admissionsService.confirm(id) {
 *     publishAdmissionConfirmed(payload)
 *     // finance and notifications react independently — admissions knows nothing about them
 *   }
 */

import { eventBus, EVENTS, createEvent } from "../../../core/events";
import type { AdmissionConfirmedEvent, AdmissionRejectedEvent } from "../../../core/events";

// ── Publishers ────────────────────────────────────────────────────────────────

/**
 * Call from your admissions service after persisting the confirmed record.
 * Returns immediately — finance and notifications react via event bus.
 */
export function publishAdmissionConfirmed(data: {
  schoolId: string;
  admissionId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  academicYear: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
}): void {
  const payload = createEvent<AdmissionConfirmedEvent>(
    { schoolId: data.schoolId },
    {
      admissionId: data.admissionId,
      studentId: data.studentId,
      studentName: data.studentName,
      classId: data.classId,
      className: data.className,
      academicYear: data.academicYear,
      parentName: data.parentName,
      parentEmail: data.parentEmail,
      parentPhone: data.parentPhone,
    }
  );
  eventBus.publish(EVENTS.ADMISSION_CONFIRMED, payload);
}

export function publishAdmissionRejected(data: {
  schoolId: string;
  admissionId: string;
  studentName: string;
  reason?: string;
  parentEmail?: string;
}): void {
  const payload = createEvent<AdmissionRejectedEvent>(
    { schoolId: data.schoolId },
    {
      admissionId: data.admissionId,
      studentName: data.studentName,
      reason: data.reason,
      parentEmail: data.parentEmail,
    }
  );
  eventBus.publish(EVENTS.ADMISSION_REJECTED, payload);
}

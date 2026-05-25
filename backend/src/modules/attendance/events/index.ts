/**
 * Attendance event subscribers & publishers.
 *
 * Publishers (notify other domains):
 *   attendance.marked   → analytics tracks daily stats
 *   attendance.absent   → notifications sends parent alert
 *   attendance.late     → notifications sends parent alert
 *
 * Subscribers:
 *   school.deleted      → clean up records (existing)
 */

import { eventBus, EVENTS, createEvent } from "../../../core/events";
import type {
  AttendanceMarkedEvent,
  AttendanceAbsentEvent,
  AttendanceLateEvent,
} from "../../../core/events";

// ── Publishers ────────────────────────────────────────────────────────────────

/**
 * Call after saving a class attendance session.
 * Analytics picks this up to track trends without any direct import.
 *
 * Before (tight coupling):
 *   // inside attendanceController:
 *   await analyticsService.recordDailyAttendance(classId, date, stats)
 *
 * After (decoupled):
 *   publishAttendanceMarked({ classId, date, ... })
 *   // analytics reacts via event bus
 */
export function publishAttendanceMarked(data: {
  schoolId: string;
  classId: string;
  date: string;
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  absentStudentIds: string[];
}): void {
  const payload = createEvent<AttendanceMarkedEvent>(
    { schoolId: data.schoolId },
    {
      classId: data.classId,
      date: data.date,
      presentCount: data.presentCount,
      absentCount: data.absentCount,
      totalStudents: data.totalStudents,
      absentStudentIds: data.absentStudentIds,
    }
  );
  eventBus.publish(EVENTS.ATTENDANCE_MARKED, payload);
}

/**
 * Call for each absent student after saving attendance.
 * Notifications module sends parent alert.
 */
export function publishAttendanceAbsent(data: {
  schoolId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  date: string;
  parentPhone?: string;
  parentEmail?: string;
}): void {
  const payload = createEvent<AttendanceAbsentEvent>(
    { schoolId: data.schoolId },
    {
      studentId: data.studentId,
      studentName: data.studentName,
      classId: data.classId,
      className: data.className,
      date: data.date,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
    }
  );
  eventBus.publish(EVENTS.ATTENDANCE_ABSENT, payload);
}

export function publishAttendanceLate(data: {
  schoolId: string;
  studentId: string;
  studentName: string;
  classId: string;
  date: string;
  time: string;
  parentPhone?: string;
  parentEmail?: string;
}): void {
  const payload = createEvent<AttendanceLateEvent>(
    { schoolId: data.schoolId },
    {
      studentId: data.studentId,
      studentName: data.studentName,
      classId: data.classId,
      date: data.date,
      time: data.time,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
    }
  );
  eventBus.publish(EVENTS.ATTENDANCE_LATE, payload);
}

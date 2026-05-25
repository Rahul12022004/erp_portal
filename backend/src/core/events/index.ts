export { eventBus } from "./eventBus";
export { createEvent } from "./createEvent";
export type {
  TypedHandler,
  LooseHandler,
  SubscribeOptions,
  DeadLetterEntry,
} from "./eventBus";

export { EVENTS } from "./eventNames";
export type { EventName } from "./eventNames";

export type {
  BaseEvent,
  DomainEventMap,
  PayloadOf,
  // Student
  StudentEnrolledEvent,
  StudentTransportUpdatedEvent,
  StudentDeletedEvent,
  // Admissions
  AdmissionCreatedEvent,
  AdmissionConfirmedEvent,
  AdmissionRejectedEvent,
  // Fee
  FeeStructureCreatedEvent,
  FeeAssignedEvent,
  FeePaymentCompletedEvent,
  FeePaymentFailedEvent,
  FeeOverdueEvent,
  // Attendance
  AttendanceMarkedEvent,
  AttendanceAbsentEvent,
  AttendanceLateEvent,
  // Exam
  ExamCreatedEvent,
  ExamResultPublishedEvent,
  // Payroll
  PayrollGeneratedEvent,
  PayrollDisbursedEvent,
  // School
  SchoolCreatedEvent,
  SchoolDeletedEvent,
  // Cross-cutting
  NotificationSendEvent,
  AnalyticsTrackEvent,
} from "./domainEvents";

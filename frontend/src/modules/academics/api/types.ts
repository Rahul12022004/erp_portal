// Shared TypeScript types for the Academics module

export interface ClassItem {
  _id: string;
  name: string;
  section?: string;
  stream?: string;
  academicYear?: string;
  classCode?: string;
  meetLink?: string;
  classTeacher?: { _id: string; name: string; email: string; position: string } | null;
  assignedTeachers?: { _id: string; name: string; email: string; position: string }[];
  studentCount?: number;
}

export interface Subject {
  _id: string;
  schoolId: string;
  classId: string;
  name: string;
  code: string;
  description: string;
  teacherId?: { _id: string; name: string; department?: string } | null;
  isActive: boolean;
  createdAt: string;
}

export interface Assignment {
  _id: string;
  schoolId: string;
  classId: string;
  className: string;
  subject: string;
  title: string;
  instructions: string;
  dueDate: string | null;
  totalPoints: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  teacherId: { _id: string; name: string } | string;
  submissionsTotal: number;
  submissionsGraded: number;
  createdAt: string;
}

export interface AssignmentSubmission {
  _id: string;
  assignmentId: string;
  studentId: { _id: string; name: string; rollNumber: string; classSection?: string };
  content: string;
  status: "SUBMITTED" | "GRADED" | "RETURNED";
  submittedAt: string;
  gradePoints: number | null;
  gradeComment: string;
}

export interface StudyMaterial {
  _id: string;
  schoolId: string;
  classId: string;
  subjectId?: { _id: string; name: string } | null;
  teacherId: { _id: string; name: string } | string;
  title: string;
  description: string;
  type: "FILE" | "LINK" | "VIDEO" | "DOCUMENT" | "OTHER";
  url: string;
  fileName: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

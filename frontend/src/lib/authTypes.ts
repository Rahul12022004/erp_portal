export type UserRole = "super-admin" | "school-admin" | "teacher";

export interface TeacherPermissions {
  modules: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const DEFAULT_TEACHER_MODULES = [
  "dashboard", "students", "attendance", "assignments", "marks",
  "exams", "digital-classroom", "timetable", "communication", "leave",
];

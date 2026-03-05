import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "super-admin" | "school-admin" | "teacher";

export interface TeacherPermissions {
  modules: string[];
}

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  teacherPermissions: TeacherPermissions;
  setTeacherPermissions: (perms: TeacherPermissions) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const DEFAULT_TEACHER_MODULES = [
  "dashboard", "students", "attendance", "assignments", "marks",
  "exams", "digital-classroom", "timetable", "communication"
];

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("super-admin");
  const [teacherPermissions, setTeacherPermissions] = useState<TeacherPermissions>({
    modules: DEFAULT_TEACHER_MODULES,
  });

  return (
    <RoleContext.Provider value={{ role, setRole, teacherPermissions, setTeacherPermissions }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

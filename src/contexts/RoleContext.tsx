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
  "exams", "digital-classroom", "timetable", "communication","leave"
];

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roleState, setRoleState] = useState<UserRole>(() => {
    if (typeof window === "undefined") {
      return "super-admin";
    }

    const savedRole = localStorage.getItem("role") as UserRole | null;
    return savedRole || "super-admin";
  });
  const [teacherPermissions, setTeacherPermissions] = useState<TeacherPermissions>({
    modules: DEFAULT_TEACHER_MODULES,
  });

  const setRole = (nextRole: UserRole) => {
    setRoleState(nextRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("role", nextRole);
    }
  };

  return (
    <RoleContext.Provider value={{ role: roleState, setRole, teacherPermissions, setTeacherPermissions }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

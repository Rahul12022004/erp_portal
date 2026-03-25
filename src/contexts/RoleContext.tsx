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

export const DEFAULT_TEACHER_MODULES = [
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
  const [teacherPermissionsState, setTeacherPermissionsState] = useState<TeacherPermissions>(() => {
    if (typeof window === "undefined") {
      return { modules: DEFAULT_TEACHER_MODULES };
    }

    const savedPermissions = localStorage.getItem("teacherPermissions");
    if (!savedPermissions) {
      return { modules: DEFAULT_TEACHER_MODULES };
    }

    try {
      const parsed = JSON.parse(savedPermissions);
      if (Array.isArray(parsed?.modules) && parsed.modules.length > 0) {
        return { modules: parsed.modules };
      }
    } catch {
      // Ignore invalid localStorage value and fallback.
    }

    return { modules: DEFAULT_TEACHER_MODULES };
  });

  const setTeacherPermissions = (perms: TeacherPermissions) => {
    const nextPermissions = {
      modules: Array.isArray(perms?.modules) && perms.modules.length > 0
        ? perms.modules
        : DEFAULT_TEACHER_MODULES,
    };

    setTeacherPermissionsState(nextPermissions);
    if (typeof window !== "undefined") {
      localStorage.setItem("teacherPermissions", JSON.stringify(nextPermissions));
    }
  };

  const setRole = (nextRole: UserRole) => {
    setRoleState(nextRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("role", nextRole);
    }
  };

  return (
    <RoleContext.Provider value={{ role: roleState, setRole, teacherPermissions: teacherPermissionsState, setTeacherPermissions }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

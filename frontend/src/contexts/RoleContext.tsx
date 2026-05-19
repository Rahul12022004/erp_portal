import { createContext, useContext, useState, ReactNode } from "react";
import { clearStoredSessions, persistRoleUser, readAuthToken } from "@/lib/auth";

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

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  teacherPermissions: TeacherPermissions;
  setTeacherPermissions: (perms: TeacherPermissions) => void;
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const DEFAULT_TEACHER_MODULES = [
  "dashboard", "students", "attendance", "assignments", "marks",
  "exams", "digital-classroom", "timetable", "communication","leave"
];

function isUserRole(value: string | null): value is UserRole {
  return value === "super-admin" || value === "school-admin" || value === "teacher";
}

function readInitialUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const savedUser = localStorage.getItem("user");
  if (!savedUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(savedUser) as User | null;
    if (parsed && isUserRole(parsed.role)) {
      const token = readAuthToken();
      if (!token) {
        clearStoredSessions();
        return null;
      }
      return parsed;
    }
  } catch {
    // Ignore invalid localStorage value and fallback.
  }

  localStorage.removeItem("user");
  return null;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const initialUser = readInitialUser();

  const [roleState, setRoleState] = useState<UserRole>(() => {
    if (typeof window === "undefined") {
      return "super-admin";
    }

    if (initialUser?.role) {
      return initialUser.role;
    }

    const savedRole = localStorage.getItem("role");
    if (isUserRole(savedRole)) {
      return savedRole;
    }

    if (savedRole) {
      localStorage.removeItem("role");
    }

    return "super-admin";
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

  const [userState, setUserState] = useState<User | null>(initialUser);

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

  const login = (user: User) => {
    setUserState(user);
    setRole(user.role);
    if (typeof window !== "undefined") {
      persistRoleUser(user);
    }
  };

  const logout = () => {
    setUserState(null);
    setRoleState("super-admin");
    setTeacherPermissionsState({ modules: DEFAULT_TEACHER_MODULES });
    if (typeof window !== "undefined") {
      clearStoredSessions();
      window.dispatchEvent(new Event("school-session-updated"));
    }
  };

  return (
    <RoleContext.Provider 
      value={{ 
        role: roleState, 
        setRole, 
        teacherPermissions: teacherPermissionsState, 
        setTeacherPermissions,
        isAuthenticated: !!userState,
        user: userState,
        login,
        logout
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

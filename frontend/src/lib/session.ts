import type { TeacherPermissions, User } from "@/contexts/RoleContext";

export type SchoolAdminSession = {
  _id?: string;
  token?: string;
  modules?: string[];
  adminInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
    password?: string;
    status?: string;
  };
  schoolInfo?: {
    name?: string;
    logo?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    location?: unknown;
  };
  systemInfo?: {
    schoolType?: string;
    subscriptionPlan?: string;
    subscriptionEndDate?: string;
  };
};

export type TeacherSession = {
  _id?: string;
  name?: string;
  email?: string;
};

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error(`session: failed to write key "${key}"`);
  }
}

export const session = {
  getAuthToken(): string {
    try { return localStorage.getItem("authToken") || ""; } catch { return ""; }
  },
  setAuthToken(token: string): void {
    try { localStorage.setItem("authToken", token); } catch {}
  },

  getSchool(): SchoolAdminSession | null {
    return safeRead<SchoolAdminSession>("school");
  },
  setSchool(data: SchoolAdminSession): void {
    safeWrite("school", data);
    window.dispatchEvent(new Event("school-session-updated"));
  },

  getTeacher(): TeacherSession | null {
    return safeRead<TeacherSession>("teacher");
  },
  setTeacher(data: TeacherSession): void {
    safeWrite("teacher", data);
  },

  getRole(): string | null {
    try { return localStorage.getItem("role"); } catch { return null; }
  },
  setRole(role: string): void {
    try { localStorage.setItem("role", role); } catch {}
  },

  getUser(): User | null {
    return safeRead<User>("user");
  },
  setUser(user: User): void {
    safeWrite("user", user);
  },

  getTeacherPermissions(): TeacherPermissions | null {
    return safeRead<TeacherPermissions>("teacherPermissions");
  },
  setTeacherPermissions(perms: TeacherPermissions): void {
    safeWrite("teacherPermissions", perms);
  },

  clearAll(): void {
    const keys = ["authToken", "user", "role", "teacher", "school", "teacherPermissions"];
    keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
  },
};

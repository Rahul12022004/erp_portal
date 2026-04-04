import type { TeacherPermissions, User } from "@/contexts/RoleContext";
import { API_URL } from "@/lib/api";

type SchoolAdminSession = {
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
  };
  systemInfo?: {
    schoolType?: string;
    subscriptionPlan?: string;
    subscriptionEndDate?: string;
  };
};

function readJsonStorage<T>(key: string): T | null {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

type TeacherSessionResponse = {
  token?: string;
  teacher: {
    _id?: string;
    name?: string;
    email?: string;
  };
  school: {
    _id?: string;
    modules?: string[];
    adminInfo?: {
      name?: string;
      email?: string;
    };
    schoolInfo?: {
      name?: string;
      logo?: string;
    };
  };
};

type SuperAdminSessionResponse = {
  success: boolean;
  token?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: "super-admin";
  };
};

export function clearStoredSessions() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("teacher");
  localStorage.removeItem("school");
  localStorage.removeItem("teacherPermissions");
}

export function persistTeacherPermissions(teacherPermissions: TeacherPermissions) {
  localStorage.setItem("teacherPermissions", JSON.stringify(teacherPermissions));
}

export function persistRoleUser(user: User) {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("role", user.role);
}

export function persistAuthToken(token: string) {
  localStorage.setItem("authToken", token);
}

export function readAuthToken() {
  return localStorage.getItem("authToken") || "";
}

export function persistSchoolAdminSession(session: SchoolAdminSession, user: User) {
  clearStoredSessions();
  if (session.token) {
    persistAuthToken(session.token);
  }
  persistRoleUser(user);
  localStorage.setItem("school", JSON.stringify(session));
  window.dispatchEvent(new Event("school-session-updated"));
}

export function persistTeacherSession(
  session: TeacherSessionResponse,
  user: User,
  teacherPermissions: TeacherPermissions,
) {
  clearStoredSessions();
  if (session.token) {
    persistAuthToken(session.token);
  }
  persistRoleUser(user);
  localStorage.setItem("teacher", JSON.stringify(session.teacher));
  localStorage.setItem("school", JSON.stringify(session.school));
  persistTeacherPermissions(teacherPermissions);
  window.dispatchEvent(new Event("school-session-updated"));
}

export async function loginSchoolAdmin(email: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/api/schools/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({ message: "Invalid server response" }));

    if (!response.ok) {
      throw new Error(data.message || `School admin login failed (${response.status})`);
    }

    return data as SchoolAdminSession;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to connect to backend. Please check your network and backend server."
    );
  }
}

export async function loginTeacher(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Teacher login failed");
  }

  return data as TeacherSessionResponse;
}

export async function loginSuperAdmin(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/schools/super-admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({ message: "Invalid server response" }));

  if (!response.ok) {
    throw new Error((data as { message?: string }).message || "Super admin login failed");
  }

  return data as SuperAdminSessionResponse;
}

export function readStoredSchoolSession() {
  return readJsonStorage<SchoolAdminSession>("school");
}

export function readStoredTeacherSession() {
  return readJsonStorage<TeacherSessionResponse["teacher"]>("teacher");
}

export function readStoredRoleUser() {
  return readJsonStorage<User>("user");
}

export function readStoredTeacherPermissions() {
  const stored = readJsonStorage<TeacherPermissions>("teacherPermissions");

  if (Array.isArray(stored?.modules) && stored.modules.length > 0) {
    return stored;
  }

  return { modules: [] };
}

import type { TeacherPermissions, User } from "@/contexts/RoleContext";
import { API_URL } from "@/lib/api";

type SchoolAdminSession = {
  _id?: string;
  modules?: string[];
  adminInfo?: {
    name?: string;
    email?: string;
    password?: string;
  };
  schoolInfo?: {
    name?: string;
    logo?: string;
  };
};

type TeacherSessionResponse = {
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

export function clearStoredSessions() {
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

export function persistSchoolAdminSession(session: SchoolAdminSession, user: User) {
  clearStoredSessions();
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

export async function loginTeacher(name: string, email: string) {
  const response = await fetch(`${API_URL}/api/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Teacher login failed");
  }

  return data as TeacherSessionResponse;
}
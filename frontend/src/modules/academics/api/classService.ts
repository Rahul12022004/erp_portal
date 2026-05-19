import type { ClassItem, ApiResponse } from "./types";

export async function getClasses(schoolId: string): Promise<ClassItem[]> {
  const res = await fetch(`/api/classes?schoolId=${schoolId}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data ?? []);
}

export async function getClassById(id: string): Promise<ClassItem> {
  const res = await fetch(`/api/classes/detail/${id}`);
  const data: ApiResponse<ClassItem> = await res.json();
  if (!data.success) throw new Error(data.message ?? "Failed to fetch class");
  return data.data;
}

export async function assignTeacher(classId: string, teacherId: string): Promise<ClassItem> {
  const res = await fetch(`/api/classes/${classId}/assign-teacher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacherId }),
  });
  const data: ApiResponse<ClassItem> = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to assign teacher");
  return data.data;
}

export async function generateCode(classId: string): Promise<ClassItem> {
  const res = await fetch(`/api/classes/${classId}/generate-code`, { method: "POST" });
  const data: ApiResponse<ClassItem> = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to generate code");
  return data.data;
}

export async function joinByCode(code: string, studentId: string): Promise<{ className: string; classId: string }> {
  const res = await fetch("/api/classes/join-by-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, studentId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to join class");
  return data.data;
}

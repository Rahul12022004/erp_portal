import type { Subject, ApiResponse } from "./types";

export async function getSubjects(schoolId: string, classId: string): Promise<Subject[]> {
  const res = await fetch(`/api/subjects?schoolId=${schoolId}&classId=${classId}`);
  const data: ApiResponse<Subject[]> = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch subjects");
  return data.data ?? [];
}

export async function createSubject(payload: {
  schoolId: string; classId: string; name: string;
  code?: string; description?: string; teacherId?: string;
}): Promise<Subject> {
  const res = await fetch("/api/subjects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: ApiResponse<Subject> = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to create subject");
  return data.data;
}

export async function updateSubject(id: string, payload: Partial<Subject>): Promise<Subject> {
  const res = await fetch(`/api/subjects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: ApiResponse<Subject> = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to update subject");
  return data.data;
}

export async function deleteSubject(id: string): Promise<void> {
  const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete subject");
}

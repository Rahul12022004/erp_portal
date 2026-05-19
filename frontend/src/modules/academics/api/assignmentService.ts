import type { Assignment, AssignmentSubmission, ApiResponse } from "./types";

export async function getAssignments(schoolId: string, classId: string): Promise<Assignment[]> {
  const res = await fetch(`/api/assignments?schoolId=${schoolId}&classId=${classId}`);
  const data: ApiResponse<Assignment[]> = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch assignments");
  return data.data ?? [];
}

export async function createAssignment(payload: {
  schoolId: string; classId: string; className: string; subject?: string;
  title: string; instructions?: string; dueDate?: string;
  totalPoints?: number; status?: string; teacherId: string;
}): Promise<Assignment> {
  const res = await fetch("/api/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: ApiResponse<Assignment> = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to create assignment");
  return data.data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await fetch(`/api/assignments/${id}`, { method: "DELETE" });
}

export async function getSubmissions(assignmentId: string): Promise<{ submissions: AssignmentSubmission[]; pending: { student: { _id: string; name: string; rollNumber: string }; status: string }[] }> {
  const res = await fetch(`/api/assignments/${assignmentId}/submissions`);
  const data = await res.json();
  return data.data ?? { submissions: [], pending: [] };
}

export async function gradeSubmission(assignmentId: string, submissionId: string, payload: {
  gradePoints: number; gradeComment?: string; gradedBy?: string;
}): Promise<AssignmentSubmission> {
  const res = await fetch(`/api/assignments/${assignmentId}/grade/${submissionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: ApiResponse<AssignmentSubmission> = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to grade");
  return data.data;
}

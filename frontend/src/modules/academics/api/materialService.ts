import type { StudyMaterial, ApiResponse } from "./types";

export async function getMaterials(schoolId: string, classId: string, subjectId?: string): Promise<StudyMaterial[]> {
  let url = `/api/materials?schoolId=${schoolId}&classId=${classId}`;
  if (subjectId) url += `&subjectId=${subjectId}`;
  const res = await fetch(url);
  const data: ApiResponse<StudyMaterial[]> = await res.json();
  return data.data ?? [];
}

export async function createMaterial(payload: {
  schoolId: string; classId: string; teacherId: string; title: string;
  description?: string; type?: string; url?: string; fileName?: string; subjectId?: string;
}): Promise<StudyMaterial> {
  const res = await fetch("/api/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: ApiResponse<StudyMaterial> = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to add material");
  return data.data;
}

export async function deleteMaterial(id: string): Promise<void> {
  await fetch(`/api/materials/${id}`, { method: "DELETE" });
}

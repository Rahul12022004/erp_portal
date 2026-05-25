import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { academicsKeys } from "../queryKeys";
import { getClasses, getClassById } from "../api/classService";
import { getSubjects } from "../api/subjectService";
import { getAssignments } from "../api/assignmentService";
import { getMaterials } from "../api/materialService";
import { useSchoolId } from "@shared/hooks/useSchoolId";

export function useClasses() {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: academicsKeys.classes(schoolId),
    queryFn: () => getClasses(schoolId),
    enabled: Boolean(schoolId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useClass(classId: string) {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: academicsKeys.class(schoolId, classId),
    queryFn: () => getClassById(classId),
    enabled: Boolean(schoolId) && Boolean(classId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubjects(classId: string) {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: academicsKeys.subjects(schoolId, classId),
    queryFn: () => getSubjects(schoolId, classId),
    enabled: Boolean(schoolId) && Boolean(classId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignments(classId: string) {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: academicsKeys.assignments(schoolId, classId),
    queryFn: () => getAssignments(schoolId, classId),
    enabled: Boolean(schoolId) && Boolean(classId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMaterials(classId: string) {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: academicsKeys.materials(schoolId, classId),
    queryFn: () => getMaterials(schoolId, classId),
    enabled: Boolean(schoolId) && Boolean(classId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidateAcademics() {
  const schoolId = useSchoolId();
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: academicsKeys.classes(schoolId) });
}

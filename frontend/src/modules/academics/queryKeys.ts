export const academicsKeys = {
  all: ["academics"] as const,

  classes: (schoolId: string) =>
    [...academicsKeys.all, "classes", schoolId] as const,

  class: (schoolId: string, classId: string) =>
    [...academicsKeys.all, "class", schoolId, classId] as const,

  subjects: (schoolId: string, classId: string) =>
    [...academicsKeys.all, "subjects", schoolId, classId] as const,

  assignments: (schoolId: string, classId: string) =>
    [...academicsKeys.all, "assignments", schoolId, classId] as const,

  materials: (schoolId: string, classId: string) =>
    [...academicsKeys.all, "materials", schoolId, classId] as const,
} as const;

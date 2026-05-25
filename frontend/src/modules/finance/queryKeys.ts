/**
 * Finance module query key factory.
 * All useQuery / useMutation calls in this module must use these keys.
 * Enables precise cache invalidation without affecting other modules.
 */
export const financeKeys = {
  all: ["finance"] as const,

  summary: (schoolId: string) =>
    [...financeKeys.all, "summary", schoolId] as const,

  feeStructures: (schoolId: string) =>
    [...financeKeys.all, "feeStructures", schoolId] as const,

  feeStructure: (schoolId: string, structureId: string) =>
    [...financeKeys.all, "feeStructure", schoolId, structureId] as const,

  students: (schoolId: string, filters: Record<string, unknown> = {}) =>
    [...financeKeys.all, "students", schoolId, filters] as const,

  paymentHistory: (schoolId: string, studentId: string) =>
    [...financeKeys.all, "paymentHistory", schoolId, studentId] as const,

  expenses: (schoolId: string) =>
    [...financeKeys.all, "expenses", schoolId] as const,
} as const;

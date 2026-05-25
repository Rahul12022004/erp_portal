/**
 * Finance module TanStack Query hooks.
 *
 * All data fetching for finance goes through here.
 * Components call these hooks — never fetch directly.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeKeys } from "../queryKeys";
import {
  getDashboardSummary,
  getClassFeeStructureList,
  getStudentFeeSummaryPage,
  saveClassFeeStructure,
  recordPayment,
  updateStudentTransportStatus,
  getAvailableYears,
} from "../api/financeClient";
import { useSchoolId } from "@shared/hooks/useSchoolId";

// ── Dashboard summary ─────────────────────────────────────────────────────────

export function useFinanceSummary(academicYear?: string) {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: financeKeys.summary(schoolId),
    queryFn: () => getDashboardSummary(schoolId, academicYear),
    enabled: Boolean(schoolId),
    staleTime: 2 * 60 * 1000,
  });
}

// ── Available academic years ──────────────────────────────────────────────────

export function useFinanceYears() {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: [...financeKeys.all, "years", schoolId] as const,
    queryFn: () => getAvailableYears(schoolId),
    enabled: Boolean(schoolId),
    staleTime: 10 * 60 * 1000,
  });
}

// ── Class fee structures ──────────────────────────────────────────────────────

export function useFeeStructures() {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: financeKeys.feeStructures(schoolId),
    queryFn: () => getClassFeeStructureList(schoolId),
    enabled: Boolean(schoolId),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Student fee summaries (paginated) ─────────────────────────────────────────

type StudentFeeFilters = {
  page?: number;
  limit?: number;
  classId?: string;
  className?: string;
  academicYear?: string;
  search?: string;
};

export function useStudentFeeSummaries(filters: StudentFeeFilters = {}) {
  const schoolId = useSchoolId();
  return useQuery({
    queryKey: financeKeys.students(schoolId, filters),
    queryFn: () => getStudentFeeSummaryPage(schoolId, filters),
    enabled: Boolean(schoolId),
    placeholderData: (prev) => prev, // keep previous page data while loading next
  });
}

// ── Save fee structure mutation ───────────────────────────────────────────────

export function useSaveFeeStructure() {
  const schoolId = useSchoolId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof saveClassFeeStructure>[1]) =>
      saveClassFeeStructure(schoolId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeKeys.feeStructures(schoolId) });
      void qc.invalidateQueries({ queryKey: financeKeys.students(schoolId) });
    },
  });
}

// ── Record payment mutation ───────────────────────────────────────────────────

export function useRecordPayment() {
  const schoolId = useSchoolId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof recordPayment>[1]) =>
      recordPayment(schoolId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

// ── Update transport status mutation ─────────────────────────────────────────

export function useUpdateTransportStatus() {
  const schoolId = useSchoolId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      status,
    }: {
      studentId: string;
      status: "ACTIVE" | "INACTIVE" | "NO_TRANSPORT";
    }) => updateStudentTransportStatus(schoolId, studentId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeKeys.students(schoolId) });
    },
  });
}

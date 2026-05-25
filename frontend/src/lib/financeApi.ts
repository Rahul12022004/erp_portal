import { API_URL } from "@/lib/api";
import type {
  ClassFeeStructureRecord,
  FinanceDashboardSummary,
  SchoolClass,
  StudentAssignment,
  StudentSummaryResponse,
} from "@/lib/financeTypes";

const API_BASE = `${API_URL}/api`;

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

const requestJson = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  const payload = await response.json().catch(() => null) as T | { message?: string } | null;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload
      ? String(payload.message || "Request failed")
      : "Request failed";
    throw new Error(message);
  }

  return payload as T;
};

export const saveClassFeeStructure = async (
  schoolId: string,
  data: {
    class_id: string;
    section_id?: string;
    academic_year: string;
    academic_fee: number;
    default_transport_fee: number;
    other_fee?: number;
    due_date: string;
    created_by?: string;
  }
) => {
  return requestJson<ApiEnvelope<{ assignedCount?: number }>>(`${API_BASE}/finance/class-fee-structures`, {
    method: "POST",
    body: JSON.stringify({
      schoolId,
      ...data,
    }),
  });
};

export const updateClassFeeStructure = async (
  id: string,
  schoolId: string,
  data: {
    academic_fee?: number;
    default_transport_fee?: number;
    other_fee?: number;
    due_date?: string;
    late_fee_type?: string;
    late_fee_amount?: number;
    late_fee_grace_days?: number;
    late_fee_description?: string;
  }
) => {
  return requestJson<ApiEnvelope<unknown>>(`${API_BASE}/finance/class-fee-structures/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      schoolId,
      ...data,
    }),
  });
};

export const getClassFeeStructureList = async (
  schoolId: string
): Promise<ClassFeeStructureRecord[]> => {
  const res = await requestJson<ApiEnvelope<ClassFeeStructureRecord[]>>(
    `${API_BASE}/finance/class-fee-structures?schoolId=${encodeURIComponent(schoolId)}`
  );
  return Array.isArray(res?.data) ? res.data : [];
};

export const getSchoolClasses = async (schoolId: string): Promise<SchoolClass[]> => {
  const params = new URLSearchParams({ includeOptions: "true", page: "1", limit: "1" });
  const res = await requestJson<{ data?: { classes?: SchoolClass[] } }>(
    `${API_BASE}/finance/${encodeURIComponent(schoolId)}/students/summary?${params.toString()}`
  );
  return Array.isArray(res?.data?.classes) ? (res.data.classes as SchoolClass[]) : [];
};

export const getAvailableYears = async (schoolId: string): Promise<string[]> => {
  const data = await requestJson<{ years?: string[] }>(
    `${API_BASE}/finance/${encodeURIComponent(schoolId)}/available-years`
  );
  return Array.isArray(data?.years) ? data.years : [];
};

export const getDashboardSummary = async (
  schoolId: string,
  academicYear?: string
): Promise<FinanceDashboardSummary> => {
  const params = new URLSearchParams();
  if (academicYear) params.set("academicYear", academicYear);
  const qs = params.toString();
  return requestJson<FinanceDashboardSummary>(
    `${API_BASE}/finance/${encodeURIComponent(schoolId)}/dashboard-summary${qs ? `?${qs}` : ""}`
  );
};

export const getAllStudentAssignments = async (
  schoolId: string,
  academicYear?: string
): Promise<StudentAssignment[]> => {
  const params = new URLSearchParams({ schoolId });
  if (academicYear) params.set("academic_year", academicYear);
  const res = await requestJson<ApiEnvelope<StudentAssignment[]>>(
    `${API_BASE}/finance/student-fee-assignments?${params.toString()}`
  );
  return Array.isArray(res?.data) ? res.data : [];
};

export const getStudentFeeSummaryPage = async (
  schoolId: string,
  filters: {
    page?: number;
    limit?: number;
    classId?: string;
    className?: string;
    academicYear?: string;
    search?: string;
  }
): Promise<StudentSummaryResponse> => {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 20),
  });
  if (filters.classId) params.set("classId", filters.classId);
  if (filters.className) params.set("className", filters.className);
  if (filters.academicYear) params.set("academicYear", filters.academicYear);
  if (filters.search) params.set("search", filters.search);
  const res = await requestJson<{ success: boolean; data: StudentSummaryResponse }>(
    `${API_BASE}/finance/${encodeURIComponent(schoolId)}/students/summary?${params.toString()}`
  );
  return res.data;
};

export const recordPayment = async (
  schoolId: string,
  data: {
    student_fee_assignment_id: string;
    payment_date: string;
    payment_amount: number;
    payment_mode: "cash" | "upi" | "card" | "cheque" | "bank_transfer";
    reference_no?: string;
    remarks?: string;
    created_by?: string;
  }
) => {
  return requestJson<ApiEnvelope<{ receipt_no?: string; assignment?: unknown }>>(`${API_BASE}/finance/student-fee-payments`, {
    method: "POST",
    body: JSON.stringify({
      schoolId,
      ...data,
    }),
  });
};

/**
 * Frontend Integration Examples for Finance Module
 * Shows how to interact with the new finance backend APIs
 */

import { API_URL } from "@/lib/api";

const API_BASE = `${API_URL}/api`;

type PaymentMode = "cash" | "upi" | "card" | "cheque" | "bank_transfer";

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

type ClassFeeStructureSaveResponse = {
  assignedCount?: number;
};

type StudentFeeAssignmentApiRecord = {
  _id: string;
  student_id: {
    _id: string;
    name: string;
    roll_no?: string;
    registration_no?: string;
  };
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  due_date: string;
  fee_status: string;
  academic_fee: number;
  transport_fee: number;
  other_fee: number;
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

// ============================
// 1. CLASS FEE STRUCTURE ENDPOINTS
// ============================

/**
 * Save a common class fee structure
 * This will auto-assign fees to all active students in that class
 */
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
  return requestJson<ApiEnvelope<ClassFeeStructureSaveResponse>>(`${API_BASE}/finance/class-fee-structures`, {
    method: "POST",
    body: JSON.stringify({
      schoolId,
      ...data,
    }),
  });
};

/**
 * Get all class fee structures with stats
 */
export const getClassFeeStructures = async (schoolId: string) => {
  return requestJson<ApiEnvelope<unknown>>(
    `${API_BASE}/finance/class-fee-structures?schoolId=${encodeURIComponent(schoolId)}`
  );
};

/**
 * Update a class fee structure
 * This will resync all student assignments
 */
export const updateClassFeeStructure = async (
  id: string,
  schoolId: string,
  data: {
    academic_fee?: number;
    default_transport_fee?: number;
    other_fee?: number;
    due_date?: string;
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

// ============================
// 2. STUDENT FEE ASSIGNMENTS
// ============================

/**
 * Get student fee assignments for a class
 * Used to show the "Record Student Payments" table
 */
export const getStudentFeeAssignments = async (
  schoolId: string,
  filters: {
    class_id?: string;
    section_id?: string;
    academic_year?: string;
    search?: string;
  }
) => {
  const params = new URLSearchParams({ schoolId });
  if (filters.class_id) params.append("class_id", filters.class_id);
  if (filters.section_id) params.append("section_id", filters.section_id);
  if (filters.academic_year) params.append("academic_year", filters.academic_year);
  if (filters.search) params.append("search", filters.search);

  return requestJson<ApiEnvelope<StudentFeeAssignmentApiRecord[]>>(
    `${API_BASE}/finance/student-fee-assignments?${params.toString()}`
  );
};

/**
 * Get a specific student fee assignment with payment history
 */
export const getStudentFeeAssignment = async (
  assignmentId: string
) => {
  return requestJson<ApiEnvelope<unknown>>(
    `${API_BASE}/finance/student-fee-assignments/${assignmentId}`
  );
};

// ============================
// 3. STUDENT PAYMENTS
// ============================

/**
 * Record a student payment
 * Call this when admin clicks "Record Payment" and submits the form
 */
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

/**
 * Get payment history for a student
 */
export const getStudentPaymentHistory = async (
  schoolId: string,
  studentId: string
) => {
  return requestJson<ApiEnvelope<unknown>>(
    `${API_BASE}/finance/student-fee-payments/${studentId}?schoolId=${encodeURIComponent(schoolId)}`
  );
};

// ============================
// 4. TRANSPORT STATUS
// ============================

/**
 * Update student transport status
 * This automatically recalculates all their pending fee assignments
 */
export const updateStudentTransportStatus = async (
  schoolId: string,
  studentId: string,
  transport_status: "ACTIVE" | "INACTIVE" | "NO_TRANSPORT"
) => {
  return requestJson<ApiEnvelope<unknown>>(`${API_BASE}/finance/students/${studentId}/transport-status`, {
    method: "PATCH",
    body: JSON.stringify({
      schoolId,
      transport_status,
    }),
  });
};

// ============================
// 5. DASHBOARD/SUMMARY
// ============================

/**
 * Get fee collection summary for a class
 * Shows total fees, collected, pending, collection %
 */
export const getClassFeeSummary = async (
  schoolId: string,
  classId: string,
  academicYear: string
) => {
  return requestJson<ApiEnvelope<unknown>>(
    `${API_BASE}/finance/class/${classId}/summary?schoolId=${encodeURIComponent(schoolId)}&academic_year=${encodeURIComponent(academicYear)}`
  );
};

// ============================
// INTEGRATION EXAMPLES FOR UI COMPONENTS
// ============================

/**
 * Example: Common Class Fee Structure Form Component
 *
 * Usage in your FinanceModule.tsx:
 */
export const exampleClassFeeStructureHandler = async (
  schoolId: string,
  formValues: {
    classId: string;
    sectionId?: string;
    academicYear: string;
    academicFee: number;
    transportFee: number;
    otherFee?: number;
    dueDate: string;
  },
  userId?: string
) => {
  try {
    const result = await saveClassFeeStructure(schoolId, {
      class_id: formValues.classId,
      section_id: formValues.sectionId,
      academic_year: formValues.academicYear,
      academic_fee: formValues.academicFee,
      default_transport_fee: formValues.transportFee,
      other_fee: formValues.otherFee,
      due_date: formValues.dueDate,
      created_by: userId,
    });

    // Show success message to user
    console.log(`✅ Class fee structure saved!`);
    console.log(`📊 ${result.data.assignedCount} students have been assigned fees`);

    return result;
  } catch (error) {
    console.error("❌ Failed to save class fee structure:", error);
    throw error;
  }
};

/**
 * Example: Record Payment Modal Handler
 *
 * Usage in RecordPaymentModal component:
 */
export const exampleRecordPaymentHandler = async (
  schoolId: string,
  assignmentId: string,
  formValues: {
    paymentDate: string;
    paymentAmount: number;
    paymentMode: PaymentMode;
    referenceNo?: string;
    remarks?: string;
  },
  userId?: string
) => {
  try {
    const result = await recordPayment(schoolId, {
      student_fee_assignment_id: assignmentId,
      payment_date: formValues.paymentDate,
      payment_amount: formValues.paymentAmount,
      payment_mode: formValues.paymentMode,
      reference_no: formValues.referenceNo,
      remarks: formValues.remarks,
      created_by: userId,
    });

    console.log(`✅ Payment recorded! Receipt: ${result.data.receipt_no}`);

    // Return updated assignment to refresh UI
    return result.data.assignment;
  } catch (error) {
    console.error("❌ Failed to record payment:", error);
    throw error;
  }
};

/**
 * Example: Student Fee Assignment Table Data Fetching
 *
 * Usage in RecordStudentPayments component:
 */
export const exampleFetchStudentFees = async (
  schoolId: string,
  classId: string,
  academicYear: string,
  searchQuery?: string
) => {
  try {
    const result = await getStudentFeeAssignments(schoolId, {
      class_id: classId,
      academic_year: academicYear,
      search: searchQuery,
    });

    // Transform for table display
    const tableData = result.data.map((assignment: StudentFeeAssignmentApiRecord) => ({
      id: assignment._id,
      studentId: assignment.student_id._id,
      studentName: assignment.student_id.name,
      rollNo: assignment.student_id.roll_no,
      registrationNo: assignment.student_id.registration_no,
      totalFee: assignment.total_fee,
      paidAmount: assignment.paid_amount,
      pendingAmount: assignment.due_amount,
      dueDate: assignment.due_date,
      feeStatus: assignment.fee_status,
      feeBreakdown: {
        academicFee: assignment.academic_fee,
        transportFee: assignment.transport_fee,
        otherFee: assignment.other_fee,
      },
    }));

    return tableData;
  } catch (error) {
    console.error("❌ Failed to fetch student fees:", error);
    throw error;
  }
};

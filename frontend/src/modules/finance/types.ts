export type FeeStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
export type PaymentMode = "cash" | "upi" | "card" | "cheque" | "bank_transfer";

export type OverviewFeeSummary = {
  totalStudents: number;
  totalFeeAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  overdueCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
};

export type FinanceDashboardSummary = {
  fee: OverviewFeeSummary;
};

export type StudentAssignment = {
  _id: string;
  student_id: {
    _id: string;
    name: string;
    class: string;
    class_id: string | null;
    roll_no?: string;
    registration_no?: string;
    section_id?: string | null;
  };
  academic_year: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  due_date: string;
  fee_status: FeeStatus;
  academic_fee: number;
  transport_fee: number;
  other_fee: number;
};

export type ClassFeeSummaryRow = {
  classId: string;
  className: string;
  totalFee: number;
  collected: number;
  pending: number;
  totalStudents: number;
  collectionPct: number;
};

export type LateFeeType = "none" | "fixed" | "daily" | "percentage";

export type ClassFeeStructureRecord = {
  _id: string;
  school_id: string;
  class_id: string;
  section_id: string | null;
  academic_year: string;
  academic_fee: number;
  default_transport_fee: number;
  other_fee: number;
  fee_breakdown: Array<{ label: string; amount: number }>;
  due_date: string;
  is_active: boolean;
  late_fee_type: LateFeeType;
  late_fee_amount: number;
  late_fee_grace_days: number;
  late_fee_description: string;
  created_at?: string;
  updated_at?: string;
  assignedCount: number;
  paidCount: number;
  pendingCount: number;
};

export type SchoolClass = {
  _id: string;
  name: string;
  section?: string | null;
  academicYear?: string | null;
  studentCount?: number;
};

export type StudentFeeSummaryItem = {
  financeId: string | null;
  student: {
    _id: string;
    name: string;
    class: string;
    classId?: string;
    email?: string;
    rollNumber?: string;
    needsTransport?: boolean;
  };
  studentId: string;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  currentDueAmount: number;
  olderPendingAmount: number;
  status: "pending" | "partial" | "paid" | "overdue";
  dueDate: string | null;
  academicYear: string | null;
  feeComponents: Array<{ label: string; amount: number }>;
  latestReceipt: null;
  outstandingAssignments: Array<{
    assignmentId: string;
    academicYear: string;
    dueAmount: number;
    dueDate: string | null;
    status: string;
  }>;
};

export type StudentSummaryMetrics = {
  totalStudents: number;
  currentTotalFee: number;
  currentPaidAmount: number;
  currentPendingAmount: number;
  olderPendingAmount: number;
  outstandingBalance: number;
  paidStudentsCount: number;
  dueStudentsCount: number;
  pendingCount: number;
  partialCount: number;
  paidCount: number;
  overdueCount: number;
};

export type StudentSummaryPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type StudentSummaryResponse = {
  items: StudentFeeSummaryItem[];
  metrics: StudentSummaryMetrics;
  pagination: StudentSummaryPagination;
};

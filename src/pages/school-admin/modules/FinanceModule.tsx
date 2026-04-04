import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ArrowRight, BarChart3, Briefcase, Building, CalendarDays, ChevronDown, ChevronUp, CirclePlus, Download, FileText, FileUp, IndianRupee, Info, Mail, Package, PiggyBank, Plus, Printer, Search, ShieldCheck, Trash2, Wallet, Wrench, LayoutDashboard, type LucideIcon } from "lucide-react";
import SchoolFinanceDashboard from "@/components/finance/SchoolFinanceDashboard";
import Pagination from "@mui/material/Pagination";
import { Illustration } from "@/components/shared-assets/illustrations";
import { API_URL } from "@/lib/api";
import Select, { type SingleValue, type StylesConfig } from "react-select";

const STUDENT_RECORDS_PAGE_SIZE = 10;

type Student = {
  _id: string;
  name: string;
  class: string;
  classId?: string;
  email?: string;
  rollNumber?: string;
  needsTransport?: boolean;
};

type SchoolClass = {
  _id: string;
  name: string;
  section?: string | null;
  academicYear?: string | null;
  studentCount?: number;
};

type Staff = {
  _id: string;
  name: string;
  position: string;
  department?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  image?: string;
  photo?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
};

type FeeComponent = {
  label: string;
  amount: number;
};

type ClassFeeStructure = {
  _id?: string;
  classId?: string;
  className: string;
  section?: string | null;
  academicYear?: string;
  amount?: number;
  transportFee?: number;
  academicFee?: number;
  defaultTransportFee?: number;
  otherFee?: number;
  dueDate?: string;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  feeComponents?: FeeComponent[];
  assignedStudentsCount?: number;
  totalAssignedStudents?: number;
  classLabel?: string;
};

type ClassOption = {
  label: string;
  value: string;
  classId?: string;
  className?: string;
  section?: string | null;
};

type EditableFeeComponent = {
  id: string;
  label: string;
  amount: string;
};

type PaymentReceipt = {
  receiptNumber: string;
  transactionId: string;
  paymentDate: string;
  amountPaid: number;
  paymentType?: "upi" | "card" | "cash" | "cheque";
  sentToEmail?: boolean;
  createdAt?: string;
};

type StudentFeeSummary = {
  financeId?: string | null;
  student?: Student;
  studentId?: string;
  totalFee: number;
  totalAssignedAmount?: number;
  paidAmount: number;
  totalPaidAmount?: number;
  remainingAmount: number;
  pendingBalance?: number;
  currentDueAmount?: number;
  olderPendingAmount?: number;
  status: "pending" | "partial" | "paid" | "overdue";
  paymentStatus?: "pending" | "partial" | "paid" | "overdue";
  dueDate?: string | null;
  effectiveDueDate?: string | null;
  academicYear?: string | null;
  feeComponents?: FeeComponent[];
  latestReceipt?: PaymentReceipt | null;
  paymentHistory?: PaymentReceipt[];
  isOverdue?: boolean;
  extensionGranted?: boolean;
  extensionGrantedAt?: string | null;
  extensionExpiresAt?: string | null;
  extensionGrantedBy?: string | null;
  extensionReason?: string | null;
  extensionEligible?: boolean;
};

type StaffSalarySummary = {
  financeId?: string | null;
  staff?: Staff;
  staffId?: Staff;
  salary: number;
  paidAmount: number;
  status: "pending" | "partial" | "paid" | "overdue";
  paymentDate?: string | null;
  academicYear?: string | null;
};

type SalaryReportRecord = {
  financeId?: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  status: "pending" | "partial" | "paid" | "overdue";
  paymentDate?: string | null;
  academicYear?: string | null;
  description?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  paymentHistory?: PaymentReceipt[];
};

type SalaryReportResponse = {
  staff: Staff;
  totals: {
    salary: number;
    paid: number;
    due: number;
  };
  records: SalaryReportRecord[];
};

type SalaryFormState = {
  mode: "set" | "pay";
  financeId: string | null;
  staffId: string;
  staffName: string;
  amount: string;
  paidAmount: string;
  paymentDate: string;
  academicYear: string;
  description: string;
};

type FeeFormState = {
  financeId: string | null;
  studentId: string;
  studentName: string;
  assignmentId: string | null;
  feeComponents: EditableFeeComponent[];
  paymentAmount: string;
  paymentType: "upi" | "card" | "cash" | "cheque";
  currentPaidAmount: number;
  currentDueAmount: number;
  dueDate: string;
  paymentDate: string;
  academicYear: string;
  description: string;
  selectedMonthIndexes: number[];
};

type LateFeeFormState = {
  assignmentId: string;
  studentName: string;
  lateFeeAmount: string;
  reason: string;
  isSubmitting: boolean;
};

type ClassFeeStructureFormState = {
  structureName: string;
  classId: string;
  className: string;
  section: string;
  amount: string;
  transportFee: string;
  academicYear: string;
  dueDate: string;
  enableLateFee: boolean;
  lateFeeType: "fixed" | "per_day" | "percentage";
  lateFeeValue: string;
  gracePeriodDays: string;
  feeBreakdown: Array<{ label: string; amount: string; category: string }>;
};

type ClassFeeStructureDraft = {
  id: string;
  title: string;
  updatedAt: string;
  form: ClassFeeStructureFormState;
};

type StudentFeeAssignmentStudent = {
  _id: string;
  name: string;
  rollNumber?: string;
  registrationNo?: string;
  class?: string;
  classId?: string;
  sectionId?: string | null;
  academicYear?: string;
  transportStatus?: string;
  transportRouteId?: string | null;
  status?: string;
  email?: string;
  needsTransport?: boolean;
};

type StudentFeeAssignment = {
  _id: string;
  student?: StudentFeeAssignmentStudent;
  studentId?: StudentFeeAssignmentStudent | string;
  classFeeStructureId?: string;
  classFeeStructure?: ClassFeeStructure | null;
  academicYear?: string;
  academicFee?: number;
  transportFee?: number;
  otherFee?: number;
  discountAmount?: number;
  totalFee?: number;
  paidAmount?: number;
  dueAmount?: number;
  feeStatus?: "pending" | "partial" | "paid" | "overdue";
  dueDate?: string;
  lastPaymentDate?: string | null;
  latestReceipt?: PaymentReceipt | null;
  paymentHistory?: PaymentReceipt[];
};

type FinancePhaseAction = "fee-structure" | "record-payment" | "salary" | "investor-ledger" | "expense" | "banking" | "school-investment" | "asset";

type InvestorLedgerAccount = {
  _id: string;
  investorName: string;
  investorType: "investor" | "trustee" | "other";
  contact?: string;
  description?: string;
  status?: "Active" | "Inactive";
  totalInvested: number;
  totalRepaid: number;
  balanceToRepay: number;
  transactions: Array<{
    _id?: string;
    type: "investment" | "repayment";
    amount: number;
    date: string;
    note?: string;
  }>;
  createdAt?: string;
};

type InvestmentCategory =
  | "Building"
  | "Vehicle"
  | "Lab Equipment"
  | "ICT Equipment"
  | "Furniture"
  | "Sports Equipment"
  | "Electrical Equipment"
  | "Other";

type InvestmentFundingSource = "School Fund" | "Donation" | "Grant" | "CSR" | "Loan" | "Other";
type InvestmentDepreciationMethod = "Straight Line" | "Written Down Value" | "Units of Production" | "None";
type InvestmentStatus = "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Active" | "Under Maintenance" | "Disposed";

type InvestmentStatusTimelineItem = {
  status: InvestmentStatus;
  date: string;
  by: string;
  remarks: string;
};

type InvestmentRecord = {
  id: string;
  investmentTitle: string;
  investmentCategory: InvestmentCategory;
  assetType: string;
  academicYear: string;
  branch: string;
  purchaseDate: string;
  vendor: string;
  invoiceNumber: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  fundingSource: InvestmentFundingSource;
  paymentMethod: string;
  assetId: string;
  serialNumber: string;
  location: string;
  department: string;
  custodian: string;
  warrantyExpiryDate: string;
  insuranceDetails: string;
  usefulLife: string;
  depreciationMethod: InvestmentDepreciationMethod;
  notes: string;
  status: InvestmentStatus;
  approvalDate: string;
  approvedBy: string;
  approvalRemarks: string;
  statusTimeline: InvestmentStatusTimelineItem[];
  budgetedAmount: number;
  actualPurchaseAmount: number;
  taxGst: number;
  additionalCharges: number;
  depreciationStartDate: string;
  accumulatedDepreciation: number;
  currentBookValue: number;
  residualValue: number;
  maintenanceContractEnabled: boolean;
  nextServiceDate: string;
  maintenanceVendor: string;
  serviceNotes: string;
  disposalDate: string;
  disposalValue: number;
  transferHistory: string;
  documents: {
    invoice: string[];
    quotation: string[];
    warranty: string[];
    approval: string[];
    assetImage: string[];
  };
  createdAt: string;
};

type InvestmentFormState = Omit<InvestmentRecord, "id" | "createdAt">;

const investmentCategoryOptions: InvestmentCategory[] = [
  "Building",
  "Vehicle",
  "Lab Equipment",
  "ICT Equipment",
  "Furniture",
  "Sports Equipment",
  "Electrical Equipment",
  "Other",
];

const investmentFundingSourceOptions: InvestmentFundingSource[] = ["School Fund", "Donation", "Grant", "CSR", "Loan", "Other"];
const investmentDepreciationOptions: InvestmentDepreciationMethod[] = ["Straight Line", "Written Down Value", "Units of Production", "None"];
const investmentStatusOptions: InvestmentStatus[] = ["Draft", "Pending Approval", "Approved", "Rejected", "Active", "Under Maintenance", "Disposed"];

const makeDefaultInvestmentForm = (): InvestmentFormState => ({
  investmentTitle: "",
  investmentCategory: "Building",
  assetType: "",
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  branch: "",
  purchaseDate: "",
  vendor: "",
  invoiceNumber: "",
  quantity: 1,
  unitCost: 0,
  totalAmount: 0,
  fundingSource: "School Fund",
  paymentMethod: "",
  assetId: "",
  serialNumber: "",
  location: "",
  department: "",
  custodian: "",
  warrantyExpiryDate: "",
  insuranceDetails: "",
  usefulLife: "",
  depreciationMethod: "Straight Line",
  notes: "",
  status: "Draft",
  approvalDate: "",
  approvedBy: "",
  approvalRemarks: "",
  statusTimeline: [],
  budgetedAmount: 0,
  actualPurchaseAmount: 0,
  taxGst: 0,
  additionalCharges: 0,
  depreciationStartDate: "",
  accumulatedDepreciation: 0,
  currentBookValue: 0,
  residualValue: 0,
  maintenanceContractEnabled: false,
  nextServiceDate: "",
  maintenanceVendor: "",
  serviceNotes: "",
  disposalDate: "",
  disposalValue: 0,
  transferHistory: "",
  documents: {
    invoice: [],
    quotation: [],
    warranty: [],
    approval: [],
    assetImage: [],
  },
});
  const CLASS_STRUCTURE_NAME_STORAGE_KEY = "financeClassStructureNames";
  const CLASS_STRUCTURE_DRAFT_STORAGE_KEY = "financeClassStructureDraft";

type FinanceActionCard = {
  id: FinancePhaseAction;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  phase: "Phase 1" | "Phase 2";
  targetTab: "student" | "staff";
  targetSectionId?: string;
  accentClassName: string;
};

const financePhaseActions: FinanceActionCard[] = [
  {
    id: "fee-structure",
    title: "Create Fee Structure",
    description: "Open the class-wise fee builder and set the shared structure for each class.",
    cta: "Open fee builder",
    icon: Plus,
    phase: "Phase 1",
    targetTab: "student",
    targetSectionId: "finance-fee-structure-section",
    accentClassName: "from-amber-100 via-orange-50 to-white text-amber-900 border-amber-200",
  },
  {
    id: "record-payment",
    title: "Record Payment Fees",
    description: "Jump straight to the student payment workspace and capture fee collections.",
    cta: "Open payments",
    icon: Wallet,
    phase: "Phase 1",
    targetTab: "student",
    targetSectionId: "finance-record-payment-section",
    accentClassName: "from-emerald-100 via-teal-50 to-white text-emerald-900 border-emerald-200",
  },
  {
    id: "salary",
    title: "Salary",
    description: "Switch to staff finance and manage salary setup and salary payment flows.",
    cta: "Open salary desk",
    icon: Briefcase,
    phase: "Phase 1",
    targetTab: "staff",
    targetSectionId: "finance-salary-section",
    accentClassName: "from-blue-100 via-sky-50 to-white text-blue-900 border-blue-200",
  },
  {
    id: "investor-ledger",
    title: "Investor Ledger",
    description: "Track investor/trustee funding, repayments, and pending balances in one financial ledger.",
    cta: "Open investor ledger",
    icon: FileText,
    phase: "Phase 1",
    targetTab: "staff",
    targetSectionId: "finance-investor-ledger-section",
    accentClassName: "from-cyan-100 via-sky-50 to-white text-cyan-900 border-cyan-200",
  },
  {
    id: "expense",
    title: "Expense",
    description: "Reserve the next workspace for operational expenses, purchases, and outgoing cash.",
    cta: "Preview expense area",
    icon: FileText,
    phase: "Phase 2",
    targetTab: "student",
    targetSectionId: "finance-phase-placeholder",
    accentClassName: "from-rose-100 via-orange-50 to-white text-rose-900 border-rose-200",
  },
  {
    id: "banking",
    title: "Banking Details",
    description: "Prepare a dedicated banking section for accounts, references, and settlement details.",
    cta: "Preview banking area",
    icon: Building,
    phase: "Phase 2",
    targetTab: "student",
    targetSectionId: "finance-phase-placeholder",
    accentClassName: "from-violet-100 via-fuchsia-50 to-white text-violet-900 border-violet-200",
  },
  {
    id: "school-investment",
    title: "School Investment Module",
    description: "Track school investment inflows, allocations, and returns for long-term planning.",
    cta: "Preview investment area",
    icon: PiggyBank,
    phase: "Phase 2",
    targetTab: "staff",
    targetSectionId: "finance-phase-placeholder",
    accentClassName: "from-lime-100 via-emerald-50 to-white text-emerald-900 border-emerald-200",
  },
  {
    id: "asset",
    title: "Asset Module",
    description: "Manage asset register, depreciation tracking, and lifecycle status from one workspace.",
    cta: "Preview asset area",
    icon: Package,
    phase: "Phase 2",
    targetTab: "staff",
    targetSectionId: "finance-phase-placeholder",
    accentClassName: "from-indigo-100 via-blue-50 to-white text-indigo-900 border-indigo-200",
  },
];

const financeActionPanelThemes: Record<FinancePhaseAction, {
  pageClassName: string;
  shellClassName: string;
  badgeClassName: string;
}> = {
  "fee-structure": {
    pageClassName: "bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_38%)]",
    shellClassName: "border-[#ead9bf] bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_30%),linear-gradient(135deg,#fffaf0_0%,#fff5e6_45%,#ffffff_100%)] shadow-[0_24px_60px_rgba(148,87,18,0.08)]",
    badgeClassName: "border-amber-300/70 text-amber-800",
  },
  "record-payment": {
    pageClassName: "bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_40%)]",
    shellClassName: "border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_30%),linear-gradient(135deg,#ecfdf5_0%,#f0fdfa_45%,#ffffff_100%)] shadow-[0_24px_60px_rgba(5,150,105,0.12)]",
    badgeClassName: "border-emerald-300/70 text-emerald-800",
  },
  salary: {
    pageClassName: "bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_40%)]",
    shellClassName: "border-blue-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_30%),linear-gradient(135deg,#eff6ff_0%,#eef2ff_45%,#ffffff_100%)] shadow-[0_24px_60px_rgba(37,99,235,0.12)]",
    badgeClassName: "border-blue-300/70 text-blue-800",
  },
  "investor-ledger": {
    pageClassName: "bg-[linear-gradient(180deg,#ecfeff_0%,#ffffff_40%)]",
    shellClassName: "border-cyan-200 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.2),_transparent_30%),linear-gradient(135deg,#ecfeff_0%,#e0f2fe_45%,#ffffff_100%)] shadow-[0_24px_60px_rgba(8,145,178,0.12)]",
    badgeClassName: "border-cyan-300/70 text-cyan-800",
  },
  expense: {
    pageClassName: "bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_40%)]",
    shellClassName: "border-rose-200 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.18),_transparent_30%),linear-gradient(135deg,#fff1f2_0%,#fff7ed_45%,#ffffff_100%)] shadow-[0_24px_60px_rgba(225,29,72,0.12)]",
    badgeClassName: "border-rose-300/70 text-rose-800",
  },
  banking: {
    pageClassName: "bg-[linear-gradient(180deg,#f5f3ff_0%,#ffffff_40%)]",
    shellClassName: "border-violet-200 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_30%),linear-gradient(135deg,#f5f3ff_0%,#fdf4ff_45%,#ffffff_100%)] shadow-[0_24px_60px_rgba(109,40,217,0.12)]",
    badgeClassName: "border-violet-300/70 text-violet-800",
  },
  "school-investment": {
    pageClassName: "bg-[linear-gradient(180deg,#f7fee7_0%,#ffffff_40%)]",
    shellClassName: "border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.2),_transparent_30%),linear-gradient(135deg,#f7fee7_0%,#ecfdf5_45%,#ffffff_100%)] shadow-[0_24px_60px_rgba(22,163,74,0.12)]",
    badgeClassName: "border-emerald-300/70 text-emerald-800",
  },
  asset: {
    pageClassName: "bg-[linear-gradient(180deg,#eef2ff_0%,#ffffff_40%)]",
    shellClassName: "border-indigo-200 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.2),_transparent_30%),linear-gradient(135deg,#eef2ff_0%,#eff6ff_45%,#ffffff_100%)] shadow-[0_24px_60px_rgba(79,70,229,0.12)]",
    badgeClassName: "border-indigo-300/70 text-indigo-800",
  },
};

type StudentLedgerImportCanonicalField =
  | "studentName"
  | "className"
  | "section"
  | "totalPaid"
  | "grandDue"
  | "totalFee"
  | "fatherName"
  | "mobileNo";

type StudentLedgerImportHeaderMappingEntry = {
  header: string;
  columnIndex: number;
  confidence: number;
  reason: string;
};

type StudentLedgerImportMatchedRow = {
  rowNumber: number;
  studentName: string;
  className: string;
  section: string;
  totalPaid: number;
  grandDue: number;
  totalFee: number;
  fatherName: string;
  mobileNo: string;
  matchedStudentId: string;
  matchedStudentName: string;
  matchSource: "deterministic" | "ai";
  matchConfidence: number;
  pendingAmount: number;
  derivedDue: number;
  grandDueMatches: boolean;
  matchReason: string;
};

type StudentLedgerImportSkippedRow = {
  rowNumber: number;
  studentName: string;
  className: string;
  section: string;
  totalPaid: number;
  grandDue: number;
  totalFee: number;
  fatherName: string;
  mobileNo: string;
  reason: string;
  candidateCount: number;
  candidateNames: string[];
  matchConfidence: number | null;
};

type StudentLedgerImportMismatchRow = {
  rowNumber: number;
  studentName: string;
  matchedStudentName: string;
  grandDue: number;
  derivedDue: number;
  reason: string;
};

type StudentLedgerImportPreview = {
  sheetName: string;
  totalRows: number;
  headerMapping: Partial<Record<StudentLedgerImportCanonicalField, StudentLedgerImportHeaderMappingEntry | null>>;
  mappingConfidence: number;
  ignoredColumns: Array<{ index: number; header: string }>;
  matchedRows: StudentLedgerImportMatchedRow[];
  skippedRows: StudentLedgerImportSkippedRow[];
  mismatchRows: StudentLedgerImportMismatchRow[];
};

type StudentLedgerImportResult = {
  totalRows: number;
  importedCount: number;
  unmatchedCount: number;
  unmatchedRows: Array<{ rowNumber: number; ledgerName: string; reason: string }>;
  ambiguousCount: number;
  ambiguousRows: Array<{ rowNumber: number; ledgerName: string; reason: string }>;
  mismatchCount: number;
  mismatchRows: Array<{ rowNumber: number; ledgerName: string; reason: string }>;
  failureCount: number;
  failures: Array<{ rowNumber: number; ledgerName: string; reason: string }>;
};

const studentLedgerImportFieldLabels: Record<StudentLedgerImportCanonicalField, string> = {
  studentName: "Student Name",
  className: "Class",
  section: "Section",
  totalPaid: "Total Paid",
  grandDue: "Grand Due",
  totalFee: "Total Fee",
  fatherName: "Father Name",
  mobileNo: "Mobile No",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const INSTALLMENT_MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const roundCurrency = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getInstallmentPlan = (totalFee: number) => {
  const safeTotal = roundCurrency(Math.max(Number(totalFee || 0), 0));
  if (safeTotal <= 0) {
    return Array.from({ length: 12 }, () => 0);
  }

  // Keep cents-accurate installments so all 12 months always add up to total fee.
  const baseInstallment = Math.floor((safeTotal / 12) * 100) / 100;
  const installments = Array.from({ length: 12 }, () => roundCurrency(baseInstallment));
  let remainingCents = Math.round((safeTotal - baseInstallment * 12) * 100);

  for (let index = 11; index >= 0 && remainingCents > 0; index -= 1) {
    installments[index] = roundCurrency(installments[index] + 0.01);
    remainingCents -= 1;
  }

  return installments;
};

const getPaidMonthsCount = (installmentPlan: number[], paidAmount: number) => {
  let remainingPaid = roundCurrency(Math.max(Number(paidAmount || 0), 0));
  let paidMonths = 0;

  for (const installment of installmentPlan) {
    if (remainingPaid + 0.0001 < installment) {
      break;
    }

    remainingPaid = roundCurrency(remainingPaid - installment);
    paidMonths += 1;
  }

  return Math.min(12, paidMonths);
};

const getSelectedInstallmentAmount = (installmentPlan: number[], selectedMonthIndexes: number[]) => {
  if (!Array.isArray(selectedMonthIndexes) || selectedMonthIndexes.length === 0) {
    return 0;
  }

  return roundCurrency(
    selectedMonthIndexes.reduce((sum, monthIndex) => sum + Number(installmentPlan[monthIndex] || 0), 0)
  );
};

const getStatusBadgeClass = (status: string) => {
  if (status === "paid") return "bg-green-100 text-green-700";
  if (status === "partial") return "bg-amber-100 text-amber-700";
  if (status === "overdue") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
};

const getStudentFromSummary = (summary: StudentFeeSummary) => summary.student;
const getDisplayDueDate = (summary: StudentFeeSummary) => summary.effectiveDueDate || summary.dueDate || null;

const getLatestReceipt = (summary: StudentFeeSummary) => {
  if (summary.latestReceipt) return summary.latestReceipt;
  const paymentHistory = Array.isArray(summary.paymentHistory) ? summary.paymentHistory : [];
  return paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1] : null;
};

const getRecentPayments = (summary: StudentFeeSummary) => {
  const paymentHistory = Array.isArray(summary.paymentHistory) ? summary.paymentHistory : [];
  return [...paymentHistory]
    .sort((left, right) => new Date(right.paymentDate).getTime() - new Date(left.paymentDate).getTime())
    .slice(0, 5);
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getSchoolLetterhead = () => {
  const school = JSON.parse(localStorage.getItem("school") || "{}");
  const schoolInfo = (school?.schoolInfo || {}) as Record<string, unknown>;
  const adminInfo = (school?.adminInfo || {}) as Record<string, unknown>;

  return {
    name: String(schoolInfo.name || school.name || "School ERP"),
    address: String(schoolInfo.address || school.address || "").trim(),
    phone: String(schoolInfo.phone || school.phone || adminInfo.phone || "").trim(),
    email: String(schoolInfo.email || school.email || adminInfo.email || "").trim(),
    website: String(schoolInfo.website || school.website || "").trim(),
    logo: String(schoolInfo.logo || school.logo || "").trim(),
    id: String(school?._id || ""),
  };
};

const getAssignmentStudent = (assignment: StudentFeeAssignment) =>
  (assignment.student || (typeof assignment.studentId === "object" ? assignment.studentId : null)) as
    | StudentFeeAssignmentStudent
    | null;

const getAssignmentStatus = (assignment: StudentFeeAssignment) =>
  assignment.feeStatus ||
  (Number(assignment.dueAmount || 0) <= 0
    ? "paid"
    : Number(assignment.paidAmount || 0) > 0
      ? "partial"
      : "pending");

const getAssignmentPendingAmount = (assignment: StudentFeeAssignment) =>
  Number(assignment.dueAmount ?? Math.max(Number(assignment.totalFee || 0) - Number(assignment.paidAmount || 0), 0));

const buildClassLabel = (name?: string | null, section?: string | null) => {
  const trimmedName = String(name || "").trim();
  const trimmedSection = String(section || "").trim();
  
  // If section is empty or already in the name, just return the name
  if (!trimmedSection || trimmedName.endsWith(` - ${trimmedSection}`)) {
    return trimmedName;
  }
  
  // Otherwise, append section to name
  return trimmedName && trimmedSection ? `${trimmedName} - ${trimmedSection}` : trimmedName;
};

const normalizeClassValue = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isLikelyObjectId = (value?: string | null) => /^[a-f0-9]{24}$/i.test(String(value || "").trim());

const matchesClassValue = (candidate?: string | null, selected?: string | null) => {
  const normalizedCandidate = normalizeClassValue(candidate);
  const normalizedSelected = normalizeClassValue(selected);

  if (!normalizedSelected) return true;
  if (!normalizedCandidate) return false;
  return normalizedCandidate === normalizedSelected;
};

const matchesSelectedClass = (
  summary: StudentFeeSummary,
  selectedClassValue: string,
  selectedClassLabel: string
) => {
  const student = getStudentFromSummary(summary) as Student | undefined;
  if (!student) return false;

  if (isLikelyObjectId(selectedClassValue) && student.classId) {
    return String(student.classId) === selectedClassValue;
  }

  return matchesClassValue(student.class || "", selectedClassLabel || selectedClassValue);
};

const getClassLabelFromRecord = (record?: SchoolClass | ClassOption | ClassFeeStructure | null) => {
  if (!record) return "";

  if ("label" in record && record.label) return record.label;
  if ("classLabel" in record && record.classLabel) return record.classLabel;

  const name = "className" in record ? record.className : ("name" in record ? record.name : "");
  return buildClassLabel(
    name,
    "section" in record ? record.section : null
  );
};

const extractApiData = <T,>(payload: unknown): T | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeData = payload as { data?: T };
  if (maybeData.data !== undefined) {
    return maybeData.data ?? null;
  }

  return payload as T;
};

const toArray = <T,>(payload: unknown): T[] => {
  const extracted = extractApiData<T[] | { items?: T[] }>(payload);

  if (Array.isArray(extracted)) {
    return extracted;
  }

  if (extracted && typeof extracted === "object" && Array.isArray((extracted as { items?: T[] }).items)) {
    return (extracted as { items?: T[] }).items || [];
  }

  return [];
};

const buildClassOption = (schoolClass: SchoolClass): ClassOption => ({
  label: buildClassLabel(schoolClass.name, schoolClass.section),
  value: schoolClass._id,
  classId: schoolClass._id,
  className: schoolClass.name,
  section: schoolClass.section || "",
});

const normalizeClassFeeStructureRecord = (
  structure: ClassFeeStructure,
  classesMap?: Map<string, SchoolClass>
): ClassFeeStructure => {
  // Look up the actual class information using class_id
  const classId = String(
    structure.classId ||
    (structure as ClassFeeStructure & Record<string, unknown>).class_id ||
    ""
  );
  
  const classInfo = classesMap?.get(classId);
  let className = classInfo?.name || String(
    structure.className ||
    (structure as ClassFeeStructure & Record<string, unknown>).class_name ||
    ""
  );
  
  let section = classInfo?.section || String(
    structure.section || 
    (structure as ClassFeeStructure & Record<string, unknown>).section || 
    ""
  );
  
  // Extract section from className if it's embedded (e.g., "EIGHT - A" -> className="EIGHT", section="A")
  const sectionMatch = className.match(/\s*-\s*([A-Z])$/);
  if (sectionMatch && !section) {
    section = sectionMatch[1];
    className = className.replace(/\s*-\s*[A-Z]$/, "").trim();
  }

  return {
    ...structure,
    classId,
    className,
    classLabel: buildClassLabel(className, section),
    amount: Number(
      structure.amount ??
      structure.academicFee ??
      (structure as ClassFeeStructure & Record<string, unknown>).academic_fee ??
      0
    ),
    academicFee: Number(
      structure.academicFee ??
      structure.amount ??
      (structure as ClassFeeStructure & Record<string, unknown>).academic_fee ??
      0
    ),
    transportFee: Number(
      structure.transportFee ??
      (structure as ClassFeeStructure & Record<string, unknown>).default_transport_fee ??
      (structure as ClassFeeStructure & Record<string, unknown>).transport_fee ??
      0
    ),
    defaultTransportFee: Number(
      structure.defaultTransportFee ??
      (structure as ClassFeeStructure & Record<string, unknown>).transport_fee ??
      (structure as ClassFeeStructure & Record<string, unknown>).default_transport_fee ??
      0
    ),
    section,
    dueDate: String(
      structure.dueDate ||
      (structure as ClassFeeStructure & Record<string, unknown>).due_date ||
      ""
    ),
    academicYear: String(
      structure.academicYear ||
      (structure as ClassFeeStructure & Record<string, unknown>).academic_year ||
      ""
    ),
  };
};

const normalizeAssignmentRecord = (assignment: StudentFeeAssignment): StudentFeeAssignment => ({
  ...assignment,
  academicFee: Number(assignment.academicFee || 0),
  transportFee: Number(assignment.transportFee || 0),
  otherFee: Number(assignment.otherFee || 0),
  discountAmount: Number(assignment.discountAmount || 0),
  totalFee: Number(assignment.totalFee || 0),
  paidAmount: Number(assignment.paidAmount || 0),
  dueAmount: Number(assignment.dueAmount ?? Math.max(Number(assignment.totalFee || 0) - Number(assignment.paidAmount || 0), 0)),
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const mapApiAssignmentToUiRecord = (assignment: Record<string, unknown>): StudentFeeAssignment => {
  const studentRaw = asRecord(assignment.student || assignment.studentId || assignment.student_id || null);
  const classFeeStructureRaw = asRecord(assignment.class_fee_structure_id || null);

  const hasStructureValues =
    classFeeStructureRaw &&
    (classFeeStructureRaw.academic_fee !== undefined ||
      classFeeStructureRaw.default_transport_fee !== undefined ||
      classFeeStructureRaw.other_fee !== undefined);

  const needsTransport = Boolean(
    studentRaw?.needsTransport ||
      studentRaw?.transport_status === "ACTIVE" ||
      studentRaw?.transportRouteId ||
      studentRaw?.transport_route_id
  );

  const academicFee = hasStructureValues
    ? Number(classFeeStructureRaw?.academic_fee ?? 0)
    : Number(assignment.academicFee ?? assignment.academic_fee ?? 0);
  const transportFee = hasStructureValues
    ? (needsTransport ? Number(classFeeStructureRaw?.default_transport_fee ?? 0) : 0)
    : Number(assignment.transportFee ?? assignment.transport_fee ?? 0);
  const otherFee = hasStructureValues
    ? Number(classFeeStructureRaw?.other_fee ?? 0)
    : Number(assignment.otherFee ?? assignment.other_fee ?? 0);
  const discountAmount = Number(assignment.discountAmount ?? assignment.discount_amount ?? 0);
  const totalFee = Math.max(academicFee + transportFee + otherFee - discountAmount, 0);
  const paidAmount = Number(assignment.paidAmount ?? assignment.paid_amount ?? 0);
  const dueAmount = Math.max(totalFee - paidAmount, 0);
  
  // Log if we have fees for this assignment
  if (totalFee > 0 || academicFee > 0 || transportFee > 0) {
    console.log(`[Assignment] ${studentRaw?.name || "Unknown"}: Academic=${academicFee}, Transport=${transportFee}, Other=${otherFee}, Total=${totalFee}`);
  }
  
  const normalizedStudent = studentRaw
    ? {
        _id: String(studentRaw._id || ""),
        name: String(studentRaw.name || ""),
        class: String(studentRaw.class || ""),
        classId: String(studentRaw.classId || studentRaw.class_id || ""),
        sectionId: String(studentRaw.sectionId || studentRaw.section_id || ""),
        rollNumber: String(studentRaw.rollNumber || studentRaw.roll_no || ""),
        registrationNo: String(studentRaw.registrationNo || studentRaw.registration_no || ""),
        needsTransport: Boolean(
          studentRaw.needsTransport ||
            studentRaw.transport_status === "ACTIVE" ||
            Boolean(studentRaw.transport_route_id)
        ),
      }
    : undefined;

  return normalizeAssignmentRecord({
    _id: String(assignment._id || ""),
    student: normalizedStudent,
    studentId: normalizedStudent?._id || String(assignment.studentId || assignment.student_id || ""),
    classFeeStructureId: String(
      assignment.classFeeStructureId || classFeeStructureRaw?._id || assignment.class_fee_structure_id || ""
    ),
    classFeeStructure: null,
    academicYear: String(assignment.academicYear || assignment.academic_year || ""),
    academicFee,
    transportFee,
    otherFee,
    discountAmount,
    totalFee,
    paidAmount,
    dueAmount,
    feeStatus: String(assignment.feeStatus || assignment.fee_status || "pending").toLowerCase() as StudentFeeAssignment["feeStatus"],
    dueDate: String(assignment.dueDate || assignment.due_date || ""),
    lastPaymentDate: String(assignment.lastPaymentDate || assignment.last_payment_date || ""),
    paymentHistory: Array.isArray(assignment.paymentHistory) ? (assignment.paymentHistory as PaymentReceipt[]) : [],
    latestReceipt: (assignment.latestReceipt as PaymentReceipt | null) || null,
  });
};

const toUiStudentFromAssignmentStudent = (student: StudentFeeAssignmentStudent): Student => ({
  _id: String(student._id || ""),
  name: String(student.name || ""),
  class: String(student.class || ""),
  classId: String(student.classId || ""),
  email: String(student.email || ""),
  rollNumber: String(student.rollNumber || ""),
  needsTransport: Boolean(student.needsTransport),
});

const assignmentToStudentFeeSummary = (assignment: StudentFeeAssignment): StudentFeeSummary => {
  const student = getAssignmentStudent(assignment);
  const dueAmount = getAssignmentPendingAmount(assignment);
  const totalFee = Number(assignment.totalFee || 0);
  const paidAmount = Number(assignment.paidAmount || 0);
  const latestReceipt = assignment.latestReceipt || (Array.isArray(assignment.paymentHistory) && assignment.paymentHistory.length > 0
    ? assignment.paymentHistory[assignment.paymentHistory.length - 1]
    : null);

  return {
    financeId: assignment._id,
    student: student ? toUiStudentFromAssignmentStudent(student) : undefined,
    studentId: student?._id || undefined,
    totalFee,
    paidAmount,
    remainingAmount: dueAmount,
    pendingBalance: dueAmount,
    currentDueAmount: dueAmount,
    status: getAssignmentStatus(assignment) as StudentFeeSummary["status"],
    paymentStatus: getAssignmentStatus(assignment) as StudentFeeSummary["paymentStatus"],
    dueDate: assignment.dueDate || null,
    effectiveDueDate: assignment.dueDate || null,
    academicYear: assignment.academicYear || null,
    feeComponents: [
      ...(Number(assignment.academicFee || 0) > 0 ? [{ label: "Academic Fee", amount: Number(assignment.academicFee || 0) }] : []),
      ...(Number(assignment.transportFee || 0) > 0 ? [{ label: "Transport Fee", amount: Number(assignment.transportFee || 0) }] : []),
      ...(Number(assignment.otherFee || 0) > 0 ? [{ label: "Other Fee", amount: Number(assignment.otherFee || 0) }] : []),
    ],
    latestReceipt,
    paymentHistory: Array.isArray(assignment.paymentHistory) ? assignment.paymentHistory : [],
    isOverdue: false,
  };
};

const makeFeeComponentRow = (label = "", amount = ""): EditableFeeComponent => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label,
  amount,
});

const getEditableFeeComponents = (summary: StudentFeeSummary): EditableFeeComponent[] => {
  if (Array.isArray(summary.feeComponents) && summary.feeComponents.length > 0) {
    return summary.feeComponents.map((component) =>
      makeFeeComponentRow(component.label, String(component.amount || ""))
    );
  }

  if (summary.totalFee > 0) {
    return [
      makeFeeComponentRow("Tuition Fee", String(summary.totalFee)),
    ];
  }

  return [];
};

const normalizeEditableFeeComponents = (components: EditableFeeComponent[]): FeeComponent[] =>
  components
    .map((component) => ({
      label: component.label.trim(),
      amount: Number(component.amount || 0),
    }))
    .filter((component) => component.label && component.amount > 0);

const getFeeComponentsTotal = (components: EditableFeeComponent[]) =>
  normalizeEditableFeeComponents(components).reduce((sum, component) => sum + component.amount, 0);

const normalizeClassFeeStructureDraftForm = (parsed: Partial<ClassFeeStructureFormState>): ClassFeeStructureFormState => ({
  structureName: String(parsed.structureName || ""),
  classId: String(parsed.classId || ""),
  className: String(parsed.className || ""),
  section: String(parsed.section || ""),
  amount: String(parsed.amount || ""),
  transportFee: String(parsed.transportFee || ""),
  academicYear: String(parsed.academicYear || ""),
  dueDate: String(parsed.dueDate || ""),
  enableLateFee: Boolean(parsed.enableLateFee),
  lateFeeType: (String(parsed.lateFeeType || "fixed") === "percentage"
    ? "percentage"
    : String(parsed.lateFeeType || "fixed") === "per_day"
      ? "per_day"
      : "fixed"),
  lateFeeValue: String(parsed.lateFeeValue || ""),
  gracePeriodDays: String(parsed.gracePeriodDays || ""),
  feeBreakdown: Array.isArray(parsed.feeBreakdown)
    ? parsed.feeBreakdown.map((item) => ({
        label: String(item?.label || ""),
        amount: String(item?.amount || ""),
        category: String(item?.category || "other"),
      }))
    : [],
});

const makeAdditionalChargeRow = (label = "", amount = "") => ({
  label,
  amount,
  category: "other",
});

const classSelectStyles: StylesConfig<ClassOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 52,
    backgroundColor: "hsl(var(--card))",
    border: `1px solid ${state.isFocused ? "hsl(var(--primary))" : "hsl(var(--input))"}`,
    borderRadius: 12,
    boxShadow: state.isFocused ? "0 0 0 4px hsl(var(--primary) / 0.12)" : "none",
    fontWeight: 600,
    transition: "all 0.2s ease",
    paddingLeft: 6,
    paddingRight: 6,
    "&:hover": {
      borderColor: "hsl(var(--primary))",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 10px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
  }),
  singleValue: (base) => ({
    ...base,
    color: "hsl(var(--foreground))",
  }),
  input: (base) => ({
    ...base,
    color: "hsl(var(--foreground))",
    margin: 0,
    padding: 0,
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    "&:hover": {
      color: "hsl(var(--primary))",
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
    zIndex: 30,
  }),
  menuList: (base) => ({
    ...base,
    padding: 8,
    backgroundColor: "hsl(var(--popover))",
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: state.isSelected ? "hsl(var(--primary))" : state.isFocused ? "hsl(var(--primary) / 0.08)" : "transparent",
    color: state.isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
    fontWeight: 600,
    cursor: "pointer",
  }),
};

export default function FinanceModule() {
  const [activeTab, setActiveTab] = useState<"student" | "staff" | "dashboard">("dashboard");
  const [activeFinanceAction, setActiveFinanceAction] = useState<FinancePhaseAction>("fee-structure");
  const [studentFees, setStudentFees] = useState<StudentFeeSummary[]>([]);
  const [staffSalaries, setStaffSalaries] = useState<StaffSalarySummary[]>([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState<SalaryFormState | null>(null);
  const [feeForm, setFeeForm] = useState<FeeFormState | null>(null);
  const [lateFeeForm, setLateFeeForm] = useState<LateFeeFormState | null>(null);
  const [savingSalary, setSavingSalary] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [selectedFeeSummary, setSelectedFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedSalaryReport, setSelectedSalaryReport] = useState<SalaryReportResponse | null>(null);
  const [salaryReportLoading, setSalaryReportLoading] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<StudentLedgerImportPreview | null>(null);
  const [importResult, setImportResult] = useState<StudentLedgerImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [classFeeStructures, setClassFeeStructures] = useState<ClassFeeStructure[]>([]);
  const [selectedClassStructureId, setSelectedClassStructureId] = useState<string>("");
  const [classStructureNameMap, setClassStructureNameMap] = useState<Record<string, string>>({});
  const [classStructureDrafts, setClassStructureDrafts] = useState<ClassFeeStructureDraft[]>([]);
  const [renamingStructureId, setRenamingStructureId] = useState<string | null>(null);
  const [renameStructureValue, setRenameStructureValue] = useState<string>("");
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [savingClassFeeStructure, setSavingClassFeeStructure] = useState(false);
  const [attemptedClassFeeSave, setAttemptedClassFeeSave] = useState(false);
  const [isFeeStructureCollapsed, setIsFeeStructureCollapsed] = useState(false);
  const [selectedFeeClass, setSelectedFeeClass] = useState<string>("");
  const [selectedHistoryStudentId, setSelectedHistoryStudentId] = useState<string>("");
  const [studentRecordsPage, setStudentRecordsPage] = useState<number>(1);
  const [selectedSalaryDepartment, setSelectedSalaryDepartment] = useState<string>("all");
  const [investorAccounts, setInvestorAccounts] = useState<InvestorLedgerAccount[]>([]);
  const [savingInvestorAccount, setSavingInvestorAccount] = useState(false);
  const [savingInvestorTransaction, setSavingInvestorTransaction] = useState(false);
  const [pendingRemoveInvestor, setPendingRemoveInvestor] = useState<InvestorLedgerAccount | null>(null);
  const [removingInvestorId, setRemovingInvestorId] = useState<string | null>(null);
  const [deletingInvestor, setDeletingInvestor] = useState(false);
  const [investorLedgerRange, setInvestorLedgerRange] = useState<"all" | "month" | "quarter">("all");
  const [investorAccountForm, setInvestorAccountForm] = useState<{ investorName: string; investorType: "investor" | "trustee" | "other"; contact: string; description: string; initialInvestment: string }>({
    investorName: "",
    investorType: "investor",
    contact: "",
    description: "",
    initialInvestment: "",
  });
  const [investorTxForm, setInvestorTxForm] = useState<{ investorId: string; type: "investment" | "repayment"; amount: string; date: string; note: string }>({
    investorId: "",
    type: "repayment",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [investmentForm, setInvestmentForm] = useState<InvestmentFormState>(() => makeDefaultInvestmentForm());
  const [investmentRecords, setInvestmentRecords] = useState<InvestmentRecord[]>([]);
  const [investmentSearch, setInvestmentSearch] = useState<string>("");
  const [investmentCategoryFilter, setInvestmentCategoryFilter] = useState<string>("all");
  const [investmentStatusFilter, setInvestmentStatusFilter] = useState<string>("all");
  const [investmentSortBy, setInvestmentSortBy] = useState<"newest" | "oldest" | "amount-high" | "amount-low">("newest");
  const [investmentSubmitAttempted, setInvestmentSubmitAttempted] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [classFeeStructureForm, setClassFeeStructureForm] = useState<ClassFeeStructureFormState>({
    structureName: "",
    classId: "",
    className: "",
    section: "",
    amount: "",
    transportFee: "",
    academicYear: "",
    dueDate: "",
    enableLateFee: false,
    lateFeeType: "fixed",
    lateFeeValue: "",
    gracePeriodDays: "",
    feeBreakdown: [],
  });

  const saveClassStructureName = (structureId: string, structureName: string) => {
    if (!structureId) return;

    const trimmed = structureName.trim();
    setClassStructureNameMap((current) => {
      const next = { ...current };

      if (trimmed) {
        next[structureId] = trimmed;
      } else {
        delete next[structureId];
      }

      localStorage.setItem(CLASS_STRUCTURE_NAME_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetClassFeeStructureForm = () => {
    setSelectedClassStructureId("");
    setAttemptedClassFeeSave(false);
    setClassFeeStructureForm({
      structureName: "",
      classId: "",
      className: "",
      section: "",
      amount: "",
      transportFee: "",
      academicYear: getDefaultAcademicYear(),
      dueDate: "",
      enableLateFee: false,
      lateFeeType: "fixed",
      lateFeeValue: "",
      gracePeriodDays: "",
      feeBreakdown: [],
    });
  };

  const getStructureDisplayName = (structure: ClassFeeStructure) => {
    const structureId = String(structure._id || "");
    const structureLabel = getClassLabelFromRecord(structure);
    return (classStructureNameMap[structureId] || structureLabel || "Class Structure").trim();
  };

  const getAcademicYearSortValue = (yearValue?: string | null) => {
    const raw = String(yearValue || "").trim();
    if (!raw) return 0;
    const firstPart = raw.split("-")[0] || raw;
    const parsed = Number.parseInt(firstPart, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const sortedClassFeeStructures = useMemo(() => {
    return [...classFeeStructures].sort((left, right) => {
      const leftYear = getAcademicYearSortValue(left.academicYear);
      const rightYear = getAcademicYearSortValue(right.academicYear);

      if (rightYear !== leftYear) {
        return rightYear - leftYear;
      }

      const leftClass = getClassLabelFromRecord(left);
      const rightClass = getClassLabelFromRecord(right);
      const classCompare = leftClass.localeCompare(rightClass, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      if (classCompare !== 0) {
        return classCompare;
      }

      return getStructureDisplayName(left).localeCompare(getStructureDisplayName(right), undefined, {
        sensitivity: "base",
      });
    });
  }, [classFeeStructures, classStructureNameMap]);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const school = JSON.parse(localStorage.getItem("school") || "null");
      if (!school || !school._id) {
        setError("School ID not found in localStorage");
        setStudentFees([]);
        setStaffSalaries([]);
        return;
      }

      const [assignmentRes, staffRes, classFeeStructureRes, classesRes, studentsRes, investorRes] = await Promise.all([
        fetch(`${API_URL}/api/finance/student-fee-assignments?schoolId=${encodeURIComponent(school._id)}`),
        fetch(`${API_URL}/api/finance/${school._id}/staff/summary`),
        fetch(`${API_URL}/api/finance/class-fee-structures?schoolId=${encodeURIComponent(school._id)}`),
        fetch(`${API_URL}/api/classes/${school._id}`),
        fetch(`${API_URL}/api/students/${school._id}`),
        fetch(`${API_URL}/api/finance/${school._id}/investors`),
      ]);

      const assignmentPayload = assignmentRes.ok ? await assignmentRes.json().catch(() => null) : null;
      const staffData = staffRes.ok ? ((await staffRes.json()) as StaffSalarySummary[]) : [];
      const classFeeStructurePayload = classFeeStructureRes.ok ? await classFeeStructureRes.json().catch(() => null) : null;
      const classesDataRaw = classesRes.ok ? await classesRes.json().catch(() => null) : null;
      const studentsDataRaw = studentsRes.ok ? await studentsRes.json().catch(() => null) : null;
      const investorData = investorRes.ok ? await investorRes.json().catch(() => null) : [];

      if (!classesRes.ok) {
        throw new Error(`Failed loading classes (${classesRes.status})`);
      }

      if (!assignmentRes.ok) {
        setError(`Student fee assignments are temporarily unavailable (${assignmentRes.status}). Class list is loaded.`);
      } else if (!classFeeStructureRes.ok) {
        setError(`Class fee structures are temporarily unavailable (${classFeeStructureRes.status}).`);
      } else if (!staffRes.ok) {
        setError(`Staff finance summary is temporarily unavailable (${staffRes.status}).`);
      }
      const classesData = toArray<SchoolClass>(classesDataRaw);
      const studentsData = toArray<Record<string, unknown>>(studentsDataRaw);
      const classOptionsFromSchool = classesData.map(buildClassOption);
      const classLabelById = new Map(
        classOptionsFromSchool.map((option) => [option.classId || option.value, option.label])
      );

      const structuresByClassId = new Map(
        classesData.map((cls) => [String(cls._id || ""), cls])
      );

      const assignments = toArray<Record<string, unknown>>(assignmentPayload).map(mapApiAssignmentToUiRecord);
      const assignmentSummaries = assignments.map((assignment) => {
        const student = getAssignmentStudent(assignment);
        if (student && !student.class && student.classId) {
          student.class = classLabelById.get(student.classId) || student.class;
        }
        return assignmentToStudentFeeSummary(assignment);
      });

      const summaryByStudentId = new Map(
        assignmentSummaries
          .map((summary) => [getStudentFromSummary(summary)?._id || "", summary] as const)
          .filter(([studentId]) => Boolean(studentId))
      );

      for (const student of studentsData) {
        const studentId = String(student._id || "");
        if (!studentId) {
          continue;
        }

        const mappedClassLabel =
          classLabelById.get(String(student.class_id || "")) ||
          buildClassLabel(String(student.class || ""), String(student.classSection || ""));

        const normalizedStudent: Student = {
          _id: studentId,
          name: String(student.name || ""),
          class: mappedClassLabel || String(student.class || ""),
          classId: String(student.class_id || ""),
          email: String(student.email || ""),
          rollNumber: String(student.rollNumber || student.roll_no || ""),
          needsTransport: Boolean(
            student.needsTransport || student.transport_status === "ACTIVE" || Boolean(student.transport_route_id)
          ),
        };

        const existingSummary = summaryByStudentId.get(studentId);
        if (existingSummary) {
          summaryByStudentId.set(studentId, {
            ...existingSummary,
            student: normalizedStudent,
            studentId: normalizedStudent._id,
          } as StudentFeeSummary);
          continue;
        }

        summaryByStudentId.set(studentId, {
          financeId: null,
          student: normalizedStudent,
          studentId,
          totalFee: 0,
          paidAmount: 0,
          remainingAmount: 0,
          pendingBalance: 0,
          currentDueAmount: 0,
          status: "pending",
          paymentStatus: "pending",
          dueDate: null,
          effectiveDueDate: null,
          academicYear: null,
          feeComponents: [],
          latestReceipt: null,
          paymentHistory: [],
          isOverdue: false,
        } as StudentFeeSummary);
      }

      const studentSummaries = Array.from(summaryByStudentId.values());

      setStudentFees(studentSummaries);
      setStaffSalaries(Array.isArray(staffData) ? staffData : []);
      setClassFeeStructures(
        toArray<ClassFeeStructure>(classFeeStructurePayload).length > 0
          ? toArray<ClassFeeStructure>(classFeeStructurePayload).map((structure) =>
              normalizeClassFeeStructureRecord(structure, structuresByClassId)
            )
          : []
      );
      setSchoolClasses(Array.isArray(classesData) ? classesData : []);
      setInvestorAccounts(Array.isArray(investorData) ? (investorData as InvestorLedgerAccount[]) : []);
    } catch (err) {
      console.error("FinanceModule fetch error", err);
      setError(err instanceof Error ? err.message : String(err));
      setStudentFees([]);
      setStaffSalaries([]);
      setClassFeeStructures([]);
      setSchoolClasses([]);
      setInvestorAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const submitInvestorAccountForm = async () => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school?._id) {
      setError("School ID not found in localStorage");
      return;
    }

    const investorName = investorAccountForm.investorName.trim();
    if (!investorName) {
      setError("Investor name is required");
      return;
    }

    try {
      setSavingInvestorAccount(true);
      setError(null);
      setInfoMessage(null);

      const res = await fetch(`${API_URL}/api/finance/${school._id}/investors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorName,
          investorType: investorAccountForm.investorType,
          contact: investorAccountForm.contact.trim(),
          description: investorAccountForm.description.trim(),
          initialInvestment: Number(investorAccountForm.initialInvestment || 0),
          date: new Date().toISOString().split("T")[0],
          status: "Active",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to create investor account");

      setInvestorAccountForm({ investorName: "", investorType: "investor", contact: "", description: "", initialInvestment: "" });
      setInfoMessage("Investor account created successfully.");
      await fetchData();
    } catch (err) {
      console.error("FinanceModule investor account create error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingInvestorAccount(false);
    }
  };

  const submitInvestorTransaction = async () => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school?._id) {
      setError("School ID not found in localStorage");
      return;
    }
    if (!investorTxForm.investorId) {
      setError("Select investor account first");
      return;
    }

    const amount = Number(investorTxForm.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid transaction amount");
      return;
    }

    try {
      setSavingInvestorTransaction(true);
      setError(null);
      setInfoMessage(null);

      const res = await fetch(`${API_URL}/api/finance/${school._id}/investors/${investorTxForm.investorId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: investorTxForm.type,
          amount,
          date: investorTxForm.date,
          note: investorTxForm.note.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to add investor transaction");

      setInfoMessage("Investor transaction saved successfully.");
      setInvestorTxForm({
        investorId: "",
        type: "repayment",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
      });
      await fetchData();
    } catch (err) {
      console.error("FinanceModule investor transaction error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingInvestorTransaction(false);
    }
  };

  const removeInvestorAccount = async () => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school?._id) {
      setError("School ID not found in localStorage");
      return;
    }

    if (!pendingRemoveInvestor) {
      return;
    }

    const account = pendingRemoveInvestor;

    try {
      setDeletingInvestor(true);
      setError(null);
      setInfoMessage(null);
      setRemovingInvestorId(account._id);

      // Play card flip-out before deleting from backend.
      await new Promise((resolve) => window.setTimeout(resolve, 420));

      const res = await fetch(`${API_URL}/api/finance/${school._id}/investors/${account._id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to remove investor account");
      }

      if (investorTxForm.investorId === account._id) {
        setInvestorTxForm((prev) => ({ ...prev, investorId: "" }));
      }

      setPendingRemoveInvestor(null);
      setInfoMessage("Investor account removed successfully.");
      await fetchData();
    } catch (err) {
      console.error("FinanceModule remove investor error", err);
      setError(err instanceof Error ? err.message : String(err));
      setRemovingInvestorId(null);
    } finally {
      setDeletingInvestor(false);
    }
  };

  const getFilteredInvestorTransactions = (transactions: InvestorLedgerAccount["transactions"]) => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (investorLedgerRange === "all") {
      return sorted;
    }

    const now = new Date();
    const daysBack = investorLedgerRange === "month" ? 30 : 90;
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - daysBack);

    return sorted.filter((tx) => new Date(tx.date).getTime() >= cutoff.getTime());
  };

  const getInvestorOverdueDays = (account: InvestorLedgerAccount) => {
    if (account.balanceToRepay <= 0) {
      return 0;
    }

    const repayments = account.transactions
      .filter((tx) => tx.type === "repayment")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestRepaymentDate = repayments[0]?.date;

    const investments = account.transactions
      .filter((tx) => tx.type === "investment")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const referenceDate = latestRepaymentDate || investments[0]?.date;
    if (!referenceDate) {
      return 0;
    }

    const diffMs = Date.now() - new Date(referenceDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  const previewStudentLedgerImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      event.target.value = "";
      return;
    }

    try {
      setImportLoading(true);
      setError(null);
      setInfoMessage(null);
      setImportResult(null);
      setImportPreview(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/finance/${school._id}/student-ledger-ai-preview`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Failed to preview finance import");
      }

      setImportPreview((data?.data || null) as StudentLedgerImportPreview | null);
    } catch (err) {
      console.error("Finance ledger preview error", err);
      setImportPreview(null);
      setError(err instanceof Error ? err.message : "Failed to preview finance import");
    } finally {
      setImportLoading(false);
      event.target.value = "";
    }
  };

  const submitStudentLedgerImport = async () => {
    if (!importPreview || importPreview.matchedRows.length === 0) {
      setError("No matched student ledger rows are ready to import");
      return;
    }

    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    try {
      setImportLoading(true);
      setError(null);
      setInfoMessage(null);

      const response = await fetch(`${API_URL}/api/finance/${school._id}/student-ledger-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: importPreview.matchedRows,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Failed to import finance ledger");
      }

      setImportResult((data?.data || null) as StudentLedgerImportResult | null);
      setInfoMessage("Finance ledger imported successfully.");
      await fetchData();
    } catch (err) {
      console.error("Finance ledger import error", err);
      setError(err instanceof Error ? err.message : "Failed to import finance ledger");
    } finally {
      setImportLoading(false);
    }
  };

  const isStudent = activeTab === "student";
  const isDashboard = activeTab === "dashboard";
  const list = isStudent ? studentFees : staffSalaries;
  const classStructureOptions = schoolClasses.map(buildClassOption);
  const classOptionsFromData = Array.from(
    new Set(
      [
        ...studentFees.map((item) => getStudentFromSummary(item)?.class || ""),
        ...classFeeStructures.map((item) => item.classLabel || item.className || ""),
      ].filter(Boolean)
    )
  )
    .filter((label) => !classStructureOptions.some((option) => matchesClassValue(option.label, label)))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }))
    .map((label) => ({ label, value: label }));

  const classSelectOptions: ClassOption[] = [...classStructureOptions, ...classOptionsFromData];
  const selectedClassOption = classSelectOptions.find((option) => option.value === selectedFeeClass) || null;
  const selectedFeeClassLabel = selectedClassOption?.label || selectedFeeClass;
  const activeClassName = selectedFeeClassLabel || classFeeStructureForm.className;
  const scopedStudentFees = activeClassName
    ? studentFees.filter((item) => matchesSelectedClass(item, selectedFeeClass, selectedFeeClassLabel || activeClassName))
    : studentFees;
  const activeClassStructure = selectedClassStructureId
    ? classFeeStructures.find((item) => String(item._id || "") === selectedClassStructureId) || null
    : activeClassName
      ? classFeeStructures.find((item) => matchesClassValue(item.classLabel || item.className || "", activeClassName)) || null
      : null;
  const total = isStudent
    ? scopedStudentFees.reduce((sum, item) => sum + item.totalFee, 0)
    : staffSalaries.reduce((sum, item) => sum + item.salary, 0);
  const paid = isStudent
    ? scopedStudentFees.reduce((sum, item) => sum + item.paidAmount, 0)
    : staffSalaries.reduce((sum, item) => sum + item.paidAmount, 0);
  const due = total - paid;
  const selectedClassStudents = selectedFeeClass
    ? studentFees.filter((item) => matchesSelectedClass(item, selectedFeeClass, selectedFeeClassLabel))
    : [];

  const getEffectiveSummaryTotal = (summary: StudentFeeSummary) => {
    if (summary.financeId) {
      return Number(summary.totalFee || 0);
    }

    if (!activeClassStructure) {
      return Number(summary.totalFee || 0);
    }

    const student = getStudentFromSummary(summary);
    const academicFee = Number(activeClassStructure.amount ?? activeClassStructure.academicFee ?? 0);
    const transportBase = Number(activeClassStructure.transportFee ?? activeClassStructure.defaultTransportFee ?? 0);
    const otherFee = Number(activeClassStructure.otherFee ?? 0);
    const transportFee = student?.needsTransport ? transportBase : 0;

    return Math.max(academicFee + transportFee + otherFee, 0);
  };

  const getEffectiveSummaryPending = (summary: StudentFeeSummary) =>
    Math.max(getEffectiveSummaryTotal(summary) - Number(summary.paidAmount || 0), 0);

  const selectedClassTotalAmount = selectedClassStudents.reduce((sum, item) => sum + getEffectiveSummaryTotal(item), 0);
  const selectedClassPaidAmount = selectedClassStudents.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
  const selectedClassRemainingAmount = selectedClassStudents.reduce(
    (sum, item) => sum + getEffectiveSummaryPending(item),
    0
  );
  const selectedClassPaidStudentsCount = selectedClassStudents.filter(
    (item) => getEffectiveSummaryTotal(item) > 0 && Number(item.paidAmount || 0) >= getEffectiveSummaryTotal(item)
  ).length;
  const selectedClassDueStudentsCount = selectedClassStudents.filter(
    (item) => getEffectiveSummaryPending(item) > 0
  ).length;
  const getStaffFromSalarySummary = (summary: StaffSalarySummary) => summary.staff || summary.staffId || null;
  const getSalaryDepartment = (summary: StaffSalarySummary) => {
    const staff = getStaffFromSalarySummary(summary);
    const rawDepartment = String(staff?.department || "").trim();
    if (rawDepartment) {
      return rawDepartment;
    }

    const position = String(staff?.position || "").toLowerCase();
    return position.includes("teacher") ? "Teaching" : "Other Staff";
  };

  const salaryDepartmentOptions = [
    "all",
    ...Array.from(new Set(staffSalaries.map((item) => getSalaryDepartment(item))))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" })),
  ];
  const filteredSalarySummaries = staffSalaries.filter((item) =>
    selectedSalaryDepartment === "all" ? true : getSalaryDepartment(item) === selectedSalaryDepartment
  );

  const salaryTotalAmount = filteredSalarySummaries.reduce((sum, item) => sum + Number(item.salary || 0), 0);
  const salaryPaidAmount = filteredSalarySummaries.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
  const salaryBalanceAmount = Math.max(salaryTotalAmount - salaryPaidAmount, 0);
  const salaryStaffCount = filteredSalarySummaries.length;
  const salaryPaidCount = filteredSalarySummaries.filter((item) => String(item.status || "").toLowerCase() === "paid").length;
  const salaryPartialCount = filteredSalarySummaries.filter((item) => String(item.status || "").toLowerCase() === "partial").length;
  const salaryPendingCount = filteredSalarySummaries.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return status === "pending" || status === "overdue";
  }).length;
  const now = new Date();
  const isInCurrentMonth = (dateValue?: string | null) => {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const thisMonthSalaryPaid = staffSalaries.reduce((sum, item) => {
    if (!isInCurrentMonth(item.paymentDate)) return sum;
    return sum + Number(item.paidAmount || 0);
  }, 0);
  const thisMonthInvestorRepayments = investorAccounts.reduce((sum, account) => {
    const monthlyRepayment = (account.transactions || []).reduce((innerSum, transaction) => {
      if (transaction.type !== "repayment") return innerSum;
      if (!isInCurrentMonth(transaction.date)) return innerSum;
      return innerSum + Number(transaction.amount || 0);
    }, 0);

    return sum + monthlyRepayment;
  }, 0);
  const thisMonthExpense = thisMonthSalaryPaid + thisMonthInvestorRepayments;
  const investorOutstandingBalance = investorAccounts.reduce(
    (sum, account) => sum + Number(account.balanceToRepay || 0),
    0
  );
  const estimatedBankBalance = Math.max(paid - thisMonthExpense, 0);
  const estimatedCashInHand = 0;
  const topKpiCards = [
    { label: "Total Fees Due", value: total, accent: "text-slate-900", helper: "Assigned fee amount" },
    { label: "Total Fees Collected", value: paid, accent: "text-emerald-700", helper: "Total collected till date" },
    { label: "Pending Fees / Outstanding Dues", value: Math.max(due, 0), accent: "text-rose-700", helper: "Remaining student dues" },
    { label: "This Month Expense", value: thisMonthExpense, accent: "text-amber-700", helper: "Salary + investor repayments" },
    { label: "This Month Salary Paid", value: thisMonthSalaryPaid, accent: "text-blue-700", helper: "Paid in current month" },
    { label: "Salary Pending", value: salaryBalanceAmount, accent: "text-orange-700", helper: "Unpaid salary amount" },
    { label: "Total Bank Balance", value: estimatedBankBalance, accent: "text-cyan-700", helper: "Estimated from current flows" },
    { label: "Cash in Hand", value: estimatedCashInHand, accent: "text-violet-700", helper: "Update in banking module" },
    { label: "Investor Outstanding Balance", value: investorOutstandingBalance, accent: "text-fuchsia-700", helper: "Total repayable amount" },
  ];
  const filteredSelectedClassStudents = selectedClassStudents.filter((item) => {
    const student = getStudentFromSummary(item);
    const query = studentSearchTerm.trim().toLowerCase();
    if (!query) return true;

    return [student?.name || "", student?.rollNumber || ""]
      .some((value) => value.toLowerCase().includes(query));
  });
  const totalStudentRecordPages = Math.max(1, Math.ceil(filteredSelectedClassStudents.length / STUDENT_RECORDS_PAGE_SIZE));
  const safeStudentRecordsPage = Math.min(studentRecordsPage, totalStudentRecordPages);
  const paginatedSelectedClassStudents = filteredSelectedClassStudents.slice(
    (safeStudentRecordsPage - 1) * STUDENT_RECORDS_PAGE_SIZE,
    safeStudentRecordsPage * STUDENT_RECORDS_PAGE_SIZE
  );
  const studentRecordsStart = filteredSelectedClassStudents.length === 0 ? 0 : (safeStudentRecordsPage - 1) * STUDENT_RECORDS_PAGE_SIZE + 1;
  const studentRecordsEnd = Math.min(safeStudentRecordsPage * STUDENT_RECORDS_PAGE_SIZE, filteredSelectedClassStudents.length);

  const normalizedBreakdownTotal = classFeeStructureForm.feeBreakdown.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  const normalizedAcademicFee = Number(classFeeStructureForm.amount || 0);
  const normalizedTransportFee = Number(classFeeStructureForm.transportFee || 0);
  const normalizedLateFeeValue = Number(classFeeStructureForm.lateFeeValue || 0);
  const normalizedGracePeriodDays = Number(classFeeStructureForm.gracePeriodDays || 0);
  const liveGrandTotal =
    normalizedAcademicFee + normalizedTransportFee + normalizedBreakdownTotal;

  const formValidation = {
    structureName: Boolean((classFeeStructureForm.structureName || classFeeStructureForm.className || "").trim()),
    academicYear: Boolean(String(classFeeStructureForm.academicYear || "").trim()),
    classSelected: Boolean(String(classFeeStructureForm.classId || "").trim()),
    dueDate: Boolean(String(classFeeStructureForm.dueDate || "").trim()),
    hasFeeAmount:
      normalizedAcademicFee > 0 ||
      normalizedTransportFee > 0 ||
      normalizedBreakdownTotal > 0,
    lateFeeValue: !classFeeStructureForm.enableLateFee || normalizedLateFeeValue > 0,
    gracePeriodDays: !classFeeStructureForm.enableLateFee || normalizedGracePeriodDays >= 0,
  };

  const lateFeeRulePreview = !classFeeStructureForm.enableLateFee
    ? "Late fee disabled"
    : `${classFeeStructureForm.lateFeeType === "percentage" ? "Percentage" : classFeeStructureForm.lateFeeType === "per_day" ? "Per Day" : "Fixed Amount"} - ${classFeeStructureForm.lateFeeType === "percentage" ? `${normalizedLateFeeValue || 0}%` : formatCurrency(normalizedLateFeeValue || 0)} after ${normalizedGracePeriodDays || 0} day grace period`;

  const previewClassFeeStructure = () => {
    const structureName = (classFeeStructureForm.structureName || classFeeStructureForm.className || "Set Fee By Class").trim();
    const school = JSON.parse(localStorage.getItem("school") || "{}");
    const additionalRows = classFeeStructureForm.feeBreakdown
      .filter((row) => row.label.trim() && Number(row.amount || 0) > 0)
      .map((row) => `<tr><td style="padding:8px 10px;border:1px solid #dbe4ea">${row.label}</td><td style="padding:8px 10px;border:1px solid #dbe4ea">${formatCurrency(Number(row.amount || 0))}</td></tr>`)
      .join("");

    const win = window.open("", "_blank", "width=920,height=760");
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head><title>${structureName} Preview</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:22px;background:#f8fafc}.sheet{max-width:860px;margin:0 auto}.header{background:#0f766e;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0}.content{background:#fff;border:1px solid #dbe4ea;border-top:none;padding:24px;border-radius:0 0 14px 14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.box{background:#f8fafc;padding:12px;border-radius:10px}.section{margin-top:20px}table{width:100%;border-collapse:collapse}th,td{text-align:left}th{padding:8px 10px;border:1px solid #dbe4ea;background:#f0fdfa}.note{margin-top:16px;font-size:12px;color:#64748b}</style></head><body><div class="sheet"><div class="header"><h2 style="margin:0">Set Fee By Class</h2><p style="margin:8px 0 0;opacity:.9">${school?.name || "School ERP"} | ${structureName}</p></div><div class="content"><div class="grid"><div class="box"><strong>Class</strong><br/>${classFeeStructureForm.className || "-"}</div><div class="box"><strong>Academic Year</strong><br/>${classFeeStructureForm.academicYear || "-"}</div><div class="box"><strong>Due Date</strong><br/>${formatDate(classFeeStructureForm.dueDate || "-")}</div><div class="box"><strong>Grand Total</strong><br/>${formatCurrency(liveGrandTotal)}</div></div><div class="section"><h3>Fee Summary</h3><table><tbody><tr><td style="padding:8px 10px;border:1px solid #dbe4ea">Academic Fee</td><td style="padding:8px 10px;border:1px solid #dbe4ea">${formatCurrency(normalizedAcademicFee)}</td></tr><tr><td style="padding:8px 10px;border:1px solid #dbe4ea">Transport Fee</td><td style="padding:8px 10px;border:1px solid #dbe4ea">${formatCurrency(normalizedTransportFee)}</td></tr><tr><td style="padding:8px 10px;border:1px solid #dbe4ea">Additional Charges</td><td style="padding:8px 10px;border:1px solid #dbe4ea">${formatCurrency(normalizedBreakdownTotal)}</td></tr></tbody></table></div><div class="section"><h3>Late Fee Rule</h3><p>${lateFeeRulePreview}</p></div>${additionalRows ? `<div class="section"><h3>Additional Charges</h3><table><thead><tr><th>Charge Name</th><th>Amount</th></tr></thead><tbody>${additionalRows}</tbody></table></div>` : ""}<p class="note">Transport fee applies only to selected students. Late fee is charged only after due date based on configured rules.</p></div></div></body></html>`);
    win.document.close();
  };

  const getDefaultAcademicYear = () => {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  };

  const financialYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const generatedOptions = Array.from({ length: 7 }, (_, index) => {
      const startYear = currentYear - 2 + index;
      return `${startYear}-${startYear + 1}`;
    });

    const selectedYear = String(classFeeStructureForm.academicYear || "").trim();
    if (selectedYear && !generatedOptions.includes(selectedYear)) {
      return [selectedYear, ...generatedOptions];
    }

    return generatedOptions;
  }, [classFeeStructureForm.academicYear]);

  useEffect(() => {
    setClassFeeStructureForm((current) => (
      current.academicYear
        ? current
        : { ...current, academicYear: getDefaultAcademicYear() }
    ));

    loadClassStructureDrafts();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLASS_STRUCTURE_NAME_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        setClassStructureNameMap(parsed);
      }
    } catch {
      // Ignore invalid local storage payload.
    }
  }, []);

  useEffect(() => {
    setStudentRecordsPage(1);
  }, [selectedFeeClass, studentSearchTerm]);

  useEffect(() => {
    if (studentRecordsPage > totalStudentRecordPages) {
      setStudentRecordsPage(totalStudentRecordPages);
    }
  }, [studentRecordsPage, totalStudentRecordPages]);

  const styledFinanceFieldClassName = "h-[52px] w-full max-w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none";

  const scrollToFinanceSection = (sectionId?: string) => {
    if (!sectionId) {
      return;
    }

    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleFinanceActionSelect = (action: FinanceActionCard) => {
    setActiveFinanceAction(action.id);
    setError(null);
    setInfoMessage(null);
    setActiveTab(action.targetTab);
    setFeeForm(null);
    setSalaryForm(null);
    setSelectedFeeSummary(null);
    setSelectedSalaryReport(null);

    if (action.id === "fee-structure") {
      setIsFeeStructureCollapsed(false);
    }

    scrollToFinanceSection(action.targetSectionId);
  };

  const selectClassFeeStructure = (
    className: string,
    selectedOption?: ClassOption | null,
    selectedStructure?: ClassFeeStructure | null
  ) => {
    const matchedStructure =
      selectedStructure ||
      classFeeStructures.find((item) =>
        matchesClassValue(item.classLabel || item.className || "", className)
      ) ||
      null;
    const normalizedClassName = matchedStructure?.classLabel || matchedStructure?.className || className;
    const fallbackOption =
      selectedOption ||
      classStructureOptions.find((option) => matchesClassValue(option.label, normalizedClassName)) ||
      null;
    const matchedStructureId = String(matchedStructure?._id || "");
    const savedStructureName = matchedStructureId
      ? (classStructureNameMap[matchedStructureId] || normalizedClassName || "")
      : (normalizedClassName || "");

    if (className) {
      setSelectedFeeClass(normalizedClassName);
    }

    setSelectedClassStructureId(matchedStructureId);

    setClassFeeStructureForm({
      structureName: savedStructureName,
      classId: String(fallbackOption?.classId || ""),
      className: normalizedClassName,
      section: String(fallbackOption?.section || matchedStructure?.section || ""),
      amount: matchedStructure ? String(matchedStructure.amount || "") : "",
      transportFee: matchedStructure ? String(matchedStructure.transportFee || "") : "",
      academicYear: matchedStructure?.academicYear || getDefaultAcademicYear(),
      dueDate: (() => {
        const raw = matchedStructure?.dueDate || "";
        if (!raw) return "";
        // Already stored as day number (e.g. "10")
        if (/^\d{1,2}$/.test(raw.trim())) return raw.trim();
        // Full date string like "2026-04-10" — extract day
        const parts = raw.split("-");
        if (parts.length === 3) return String(parseInt(parts[2], 10));
        return raw;
      })(),
      enableLateFee: false,
      lateFeeType: "fixed",
      lateFeeValue: "",
      gracePeriodDays: "",
      feeBreakdown: Array.isArray((matchedStructure as (typeof matchedStructure & { feeBreakdown?: Array<{ label: string; amount: number }> }) | undefined)?.feeBreakdown)
        ? ((matchedStructure as unknown as { feeBreakdown: Array<{ label: string; amount: number }> }).feeBreakdown).map((item) => ({ label: item.label, amount: String(item.amount), category: "other" }))
        : [],
    });
  };

  const handleClassFeeStructureSelect = (option: SingleValue<ClassOption>) => {
    setSelectedClassStructureId("");
    selectClassFeeStructure(option?.label || "", option || null);
  };

  const handleStudentClassSelect = (option: SingleValue<ClassOption>) => {
    setSelectedClassStructureId("");
    setSelectedFeeClass(option?.value || "");
    setSelectedHistoryStudentId("");
    setStudentSearchTerm("");
  };

  const openSelectedStudentHistory = async () => {
    if (!selectedFeeClass) {
      setError("Select class first");
      return;
    }

    if (!selectedHistoryStudentId) {
      setError("Select a student to view fee record history");
      return;
    }

    const selectedSummary = selectedClassStudents.find(
      (item) => getStudentFromSummary(item)?._id === selectedHistoryStudentId
    );

    if (!selectedSummary) {
      setError("Selected student record not found in this class");
      return;
    }

    await openStudentSummary(selectedSummary);
  };

  const deleteClassFeeStructure = async (structureId: string, className: string) => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the fee structure for ${className}? This will also remove all associated student fee assignments.`)) {
      return;
    }

    try {
      setError(null);
      setInfoMessage(null);

      const res = await fetch(`${API_URL}/api/finance/class-fee-structures/${structureId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: school._id }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to delete class fee structure");

      if (selectedClassStructureId === structureId) {
        setSelectedClassStructureId("");
      }

      setInfoMessage(`Fee structure for ${className} has been deleted. ${data?.data?.deletedAssignments || 0} student assignments were removed.`);
      await fetchData();
    } catch (err) {
      console.error("Delete class fee structure error", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const submitClassFeeStructure = async () => {
    setAttemptedClassFeeSave(true);
    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    if (!classFeeStructureForm.className) {
      setError("Select a class");
      return;
    }

    const normalizedStructureName = (classFeeStructureForm.structureName || classFeeStructureForm.className || "").trim();
    if (!normalizedStructureName) {
      setError("Enter a card name for this class structure");
      return;
    }

    const resolvedClassOption =
      classStructureOptions.find((option) => option.classId === classFeeStructureForm.classId) ||
      classStructureOptions.find((option) => matchesClassValue(option.label, classFeeStructureForm.className)) ||
      null;

    if (!resolvedClassOption?.classId) {
      setError("Selected class is invalid. Please re-select a class.");
      return;
    }

    const amount = Number(classFeeStructureForm.amount || 0);
    const transportFee = Number(classFeeStructureForm.transportFee || 0);
    const feeBreakdown = classFeeStructureForm.feeBreakdown
      .filter((item) => item.label.trim() && Number(item.amount) > 0)
      .map((item) => {
        const normalizedCategory = String(item.category || "other").trim() || "other";
        return {
          label: normalizedCategory === "other" ? item.label.trim() : `${item.label.trim()} (${normalizedCategory})`,
          amount: Number(item.amount),
        };
      });
    const breakdownTotal = feeBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const hasLateFeeRuleError = classFeeStructureForm.enableLateFee && Number(classFeeStructureForm.lateFeeValue || 0) <= 0;
    const hasGracePeriodError = classFeeStructureForm.enableLateFee && Number(classFeeStructureForm.gracePeriodDays || 0) < 0;

    if (amount <= 0 && transportFee <= 0 && breakdownTotal <= 0) {
      setError("Add at least one valid fee component");
      return;
    }

    if (hasLateFeeRuleError) {
      setError("Enter a valid late fee value when late fee is enabled");
      return;
    }

    if (hasGracePeriodError) {
      setError("Grace period cannot be negative");
      return;
    }

    try {
      setSavingClassFeeStructure(true);
      setError(null);
      setInfoMessage(null);

      // Update only when the currently selected structure matches this class and academic year.
      const selectedStructure = selectedClassStructureId
        ? classFeeStructures.find((item) => String(item._id || "") === selectedClassStructureId) || null
        : null;
      const isSameAcademicYear = Boolean(
        selectedStructure &&
          String(selectedStructure.academicYear || "") === String(classFeeStructureForm.academicYear || "")
      );
      const isSameClass = Boolean(
        selectedStructure &&
          (String(selectedStructure.classId || "") === String(resolvedClassOption.classId || "") ||
            matchesClassValue(selectedStructure.classLabel || selectedStructure.className || "", classFeeStructureForm.className))
      );
      const isUpdate = Boolean(selectedStructure && selectedStructure._id && isSameAcademicYear && isSameClass);

      const duplicateCard = classFeeStructures.find((item) => {
        const itemId = String(item._id || "");
        if (isUpdate && itemId === String(selectedStructure?._id || "")) {
          return false;
        }

        const sameAcademicYear = String(item.academicYear || "").trim() === String(classFeeStructureForm.academicYear || "").trim();
        if (!sameAcademicYear) {
          return false;
        }

        const sameClass =
          String(item.classId || "") === String(resolvedClassOption.classId || "") ||
          matchesClassValue(item.classLabel || item.className || "", classFeeStructureForm.className);
        if (!sameClass) {
          return false;
        }

        return getStructureDisplayName(item).toLowerCase() === normalizedStructureName.toLowerCase();
      });

      if (duplicateCard) {
        setError(`A structure card named "${normalizedStructureName}" already exists for this class and academic year.`);
        return;
      }
      const url = isUpdate 
        ? `${API_URL}/api/finance/class-fee-structures/${selectedStructure?._id}`
        : `${API_URL}/api/finance/class-fee-structures`;

      const method = isUpdate ? "PUT" : "POST";
      
      const requestBody = isUpdate
        ? {
            schoolId: school._id,
            academic_fee: amount,
            default_transport_fee: transportFee,
            other_fee: 0,
            fee_breakdown: feeBreakdown,
            due_date: classFeeStructureForm.dueDate,
          }
        : {
            schoolId: school._id,
            class_id: resolvedClassOption.classId,
            academic_year: classFeeStructureForm.academicYear,
            academic_fee: amount,
            default_transport_fee: transportFee,
            other_fee: 0,
            fee_breakdown: feeBreakdown,
            due_date: classFeeStructureForm.dueDate,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Failed to ${isUpdate ? "update" : "save"} class fee structure`);

      const returnedStructureId = String(data?.data?.structure?._id || selectedStructure?._id || "");
      if (returnedStructureId) {
        saveClassStructureName(returnedStructureId, normalizedStructureName);
        setSelectedClassStructureId(returnedStructureId);
      }

      if (isUpdate) {
        const syncedCount = Number(data?.data?.syncedCount || 0);
        setInfoMessage(`Fee card for ${classFeeStructureForm.className} (${classFeeStructureForm.academicYear}) updated. ${syncedCount} student assignments synced.`);
      } else {
        const assignedCount = Number(data?.data?.assignedCount || 0);
        setInfoMessage(`New fee card saved for ${classFeeStructureForm.className} (${classFeeStructureForm.academicYear}).${assignedCount > 0 ? ` ${assignedCount} students assigned.` : ""}`);
      }

      resetClassFeeStructureForm();
      
      await fetchData();
    } catch (err) {
      console.error("FinanceModule class fee structure save error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingClassFeeStructure(false);
    }
  };

  const submitClassFeeStructureForAllClasses = async () => {
    setAttemptedClassFeeSave(true);
    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    if (!classFeeStructureForm.academicYear) {
      setError("Select academic year before saving for all classes");
      return;
    }

    const targetClasses = classStructureOptions.filter((option) => Boolean(option.classId));
    if (targetClasses.length === 0) {
      setError("No classes available to apply this fee structure");
      return;
    }

    const amount = Number(classFeeStructureForm.amount || 0);
    const transportFee = Number(classFeeStructureForm.transportFee || 0);
    const feeBreakdown = classFeeStructureForm.feeBreakdown
      .filter((item) => item.label.trim() && Number(item.amount) > 0)
      .map((item) => {
        const normalizedCategory = String(item.category || "other").trim() || "other";
        return {
          label: normalizedCategory === "other" ? item.label.trim() : `${item.label.trim()} (${normalizedCategory})`,
          amount: Number(item.amount),
        };
      });
    const breakdownTotal = feeBreakdown.reduce((sum, item) => sum + item.amount, 0);

    if (amount <= 0 && transportFee <= 0 && breakdownTotal <= 0) {
      setError("Add at least one valid fee component");
      return;
    }

    try {
      setSavingClassFeeStructure(true);
      setError(null);
      setInfoMessage(null);

      let createdCount = 0;
      let updatedCount = 0;
      const failedClasses: string[] = [];

      for (const classOption of targetClasses) {
        const classId = String(classOption.classId || "");
        const classLabel = classOption.label;
        const matchedStructure = classFeeStructures.find((item) => {
          const sameAcademicYear =
            String(item.academicYear || "").trim() === String(classFeeStructureForm.academicYear || "").trim();
          if (!sameAcademicYear) return false;

          return (
            String(item.classId || "") === classId ||
            matchesClassValue(item.classLabel || item.className || "", classLabel)
          );
        });

        const isUpdate = Boolean(matchedStructure?._id);
        const url = isUpdate
          ? `${API_URL}/api/finance/class-fee-structures/${matchedStructure?._id}`
          : `${API_URL}/api/finance/class-fee-structures`;
        const method = isUpdate ? "PUT" : "POST";

        const requestBody = isUpdate
          ? {
              schoolId: school._id,
              academic_fee: amount,
              default_transport_fee: transportFee,
              other_fee: 0,
              fee_breakdown: feeBreakdown,
              due_date: classFeeStructureForm.dueDate,
            }
          : {
              schoolId: school._id,
              class_id: classId,
              academic_year: classFeeStructureForm.academicYear,
              academic_fee: amount,
              default_transport_fee: transportFee,
              other_fee: 0,
              fee_breakdown: feeBreakdown,
              due_date: classFeeStructureForm.dueDate,
            };

        try {
          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(data?.message || `Failed to ${isUpdate ? "update" : "save"} fee structure`);
          }

          const returnedStructureId = String(data?.data?.structure?._id || matchedStructure?._id || "");
          if (returnedStructureId) {
            const structureTitle = `${classLabel} (${classFeeStructureForm.academicYear})`;
            saveClassStructureName(returnedStructureId, structureTitle);
          }

          if (isUpdate) updatedCount += 1;
          else createdCount += 1;
        } catch {
          failedClasses.push(classLabel);
        }
      }

      await fetchData();

      const successCount = createdCount + updatedCount;
      setInfoMessage(
        `Applied fee structure to ${successCount} class(es). Created: ${createdCount}, Updated: ${updatedCount}, Failed: ${failedClasses.length}.`
      );

      resetClassFeeStructureForm();

      if (failedClasses.length > 0) {
        setError(`Could not save for: ${failedClasses.slice(0, 5).join(", ")}${failedClasses.length > 5 ? "..." : ""}`);
      }
    } catch (err) {
      console.error("FinanceModule bulk class fee structure save error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingClassFeeStructure(false);
    }
  };

  const getDraftTitle = (form: ClassFeeStructureFormState) => {
    const classLabel = String(form.className || "").trim() || "Untitled Class";
    const academicYear = String(form.academicYear || "").trim() || getDefaultAcademicYear();
    return `${classLabel} (${academicYear})`;
  };

  const persistClassStructureDrafts = (drafts: ClassFeeStructureDraft[]) => {
    setClassStructureDrafts(drafts);
    localStorage.setItem(CLASS_STRUCTURE_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  };

  const saveClassStructureDraft = () => {
    try {
      const draft: ClassFeeStructureDraft = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: getDraftTitle(classFeeStructureForm),
        updatedAt: new Date().toISOString(),
        form: normalizeClassFeeStructureDraftForm(classFeeStructureForm),
      };

      const nextDrafts = [draft, ...classStructureDrafts].slice(0, 30);
      persistClassStructureDrafts(nextDrafts);
      setInfoMessage(`Draft saved as ${draft.title}. You can keep multiple fee structure drafts.`);
      setError(null);
    } catch {
      setError("Unable to save draft in this browser session.");
    }
  };

  const loadClassStructureDraft = (draftId: string) => {
    const selectedDraft = classStructureDrafts.find((item) => item.id === draftId);
    if (!selectedDraft) {
      setError("Selected draft no longer exists.");
      return;
    }

    setClassFeeStructureForm(normalizeClassFeeStructureDraftForm(selectedDraft.form));
    setInfoMessage(`Loaded draft: ${selectedDraft.title}`);
    setError(null);
  };

  const deleteClassStructureDraft = (draftId: string) => {
    const nextDrafts = classStructureDrafts.filter((item) => item.id !== draftId);
    persistClassStructureDrafts(nextDrafts);
    setInfoMessage("Draft removed.");
    setError(null);
  };

  const loadClassStructureDrafts = () => {
    try {
      const raw = localStorage.getItem(CLASS_STRUCTURE_DRAFT_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return;

      let loadedDrafts: ClassFeeStructureDraft[] = [];

      if (Array.isArray(parsed)) {
        loadedDrafts = parsed
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const source = item as Partial<ClassFeeStructureDraft>;
            const draftFormSource = (source.form || source) as Partial<ClassFeeStructureFormState>;
            return {
              id: String(source.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
              title: String(source.title || getDraftTitle(normalizeClassFeeStructureDraftForm(draftFormSource))),
              updatedAt: String(source.updatedAt || new Date().toISOString()),
              form: normalizeClassFeeStructureDraftForm(draftFormSource),
            };
          })
          .filter((item): item is ClassFeeStructureDraft => Boolean(item));
      } else {
        const legacyForm = normalizeClassFeeStructureDraftForm(parsed as Partial<ClassFeeStructureFormState>);
        loadedDrafts = [{
          id: `legacy-${Date.now()}`,
          title: getDraftTitle(legacyForm),
          updatedAt: new Date().toISOString(),
          form: legacyForm,
        }];
      }

      if (loadedDrafts.length === 0) return;

      loadedDrafts.sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );

      persistClassStructureDrafts(loadedDrafts);
      setClassFeeStructureForm(normalizeClassFeeStructureDraftForm(loadedDrafts[0].form));
    } catch {
      // Ignore invalid draft payload.
    }
  };

  const downloadSelectedFeeStructure = () => {
    if (!activeClassStructure || !activeClassName) {
      setError("Select a class to download the fee structure");
      return;
    }

    const school = JSON.parse(localStorage.getItem("school") || "{}");
    const win = window.open("", "_blank", "width=920,height=760");
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head><title>Fee Structure - ${activeClassName}</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:24px;background:#f8fafc}.sheet{max-width:820px;margin:0 auto}.header{background:#0f766e;color:#fff;padding:22px 24px;border-radius:16px 16px 0 0}.content{background:#fff;border:1px solid #dbe4ea;border-top:none;padding:24px;border-radius:0 0 16px 16px}.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:20px 0}.summary-item{background:#f8fafc;padding:14px;border-radius:12px}.section{margin-top:24px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #dbe4ea;text-align:left}th{background:#f0fdfa}.footer{margin-top:20px;font-size:12px;color:#64748b}</style></head><body><div class="sheet"><div class="header"><h2 style="margin:0">Class Fee Structure</h2><p style="margin:6px 0 0;opacity:.88">${school?.name || "School ERP"} | ${activeClassName}</p></div><div class="content"><div class="summary"><div class="summary-item"><strong>Academic Year</strong><br/>${activeClassStructure.academicYear || "-"}</div><div class="summary-item"><strong>Due Date</strong><br/>${formatDate(activeClassStructure.dueDate || "-")}</div><div class="summary-item"><strong>Academic Fee</strong><br/>${formatCurrency(activeClassStructure.amount || 0)}</div><div class="summary-item"><strong>Transport Fee</strong><br/>${formatCurrency(activeClassStructure.transportFee || 0)}</div></div><div class="section"><h3>Fee Components</h3><table><thead><tr><th>Component</th><th>Amount</th></tr></thead><tbody><tr><td>Academic Fee</td><td>${formatCurrency(activeClassStructure.amount || 0)}</td></tr><tr><td>Transport Fee</td><td>${formatCurrency(activeClassStructure.transportFee || 0)} (only for transport students)</td></tr></tbody></table></div><p class="footer">Generated from the finance module. Transport fee applies only to students who selected the school transport service.</p></div></div><script>window.onload=function(){window.print();};</script></body></html>`);
    win.document.close();
  };

  const openSalaryForm = (item: StaffSalarySummary, mode: "set" | "pay") => {
    const staffMember = item.staff || item.staffId;
    if (!staffMember) return;

    const remainingAmount = Math.max(item.salary - item.paidAmount, 0);

    setSalaryForm({
      mode,
      financeId: item.financeId || null,
      staffId: staffMember._id,
      staffName: staffMember.name,
      amount: String(item.salary || ""),
      paidAmount: mode === "pay" ? String(remainingAmount || item.salary || "") : String(item.paidAmount || ""),
      paymentDate: new Date().toISOString().split("T")[0],
      academicYear: item.academicYear || getDefaultAcademicYear(),
      description: mode === "pay" ? `Salary payment for ${staffMember.name}` : `Salary setup for ${staffMember.name}`,
    });
  };

  const printSalarySlip = (item: StaffSalarySummary) => {
    const staff = getStaffFromSalarySummary(item);
    const name = staff?.name || "Staff Member";
    const position = staff?.position || "-";
    const department = getSalaryDepartment(item);
    const contact = String(staff?.phone || staff?.email || "").trim();
    const avatarUrl = String(staff?.avatar || staff?.image || staff?.photo || "").trim();
    const balance = Math.max(Number(item.salary || 0) - Number(item.paidAmount || 0), 0);
    const school = getSchoolLetterhead();

    const logoHtml = school.logo
      ? `<img src="${school.logo}" alt="School logo" style="height:64px;width:64px;object-fit:cover;border-radius:10px;border:1px solid #e2e8f0;margin-right:16px;"/>`
      : "";

    const staffAvatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" alt="${escapeHtml(name)}" style="height:72px;width:72px;border-radius:50%;border:2px solid #e2e8f0;object-fit:cover;"/>`
      : `<div style="height:72px;width:72px;border-radius:50%;background:#f1f5f9;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#334155;">${escapeHtml(name.charAt(0).toUpperCase())}</div>`;

    const contactParts = [
      school.address,
      school.phone ? `Phone: ${school.phone}` : "",
      school.email ? `Email: ${school.email}` : "",
      school.website ? `Website: ${school.website}` : "",
    ].filter(Boolean);

    const statusColor = item.status === "paid" ? "#16a34a" : item.status === "partial" ? "#d97706" : "#dc2626";
    const totalEarnings = Number(item.salary || 0);
    const netPay = Number(item.paidAmount || 0);
    const totalDeductions = Math.max(totalEarnings - netPay, 0);
    const paymentMode = netPay > 0 ? "BANK TRANSFER" : "-";
    const disbursementDate = item.paymentDate ? formatDate(item.paymentDate) : "-";
    const employeeBank = String(staff?.bankName || "NEFT").trim() || "NEFT";
    const accountNumber = String(staff?.accountNumber || "-").trim() || "-";

    const earningsRows = [
      { label: "Basic Salary", amount: totalEarnings },
      { label: "Dearness Allowance", amount: 0 },
      { label: "HRA", amount: 0 },
      { label: "Transport Allowance", amount: 0 },
      { label: "Professional Dev Allowance", amount: 0 },
      { label: "Medical Allowance", amount: 0 },
      { label: "Leave Encashment", amount: 0 },
    ];

    const deductionsRows = [
      { label: "Advance", amount: 0 },
      { label: "Voluntary Contribution", amount: 0 },
      { label: "Provident Fund", amount: 0 },
      { label: "ESIC", amount: 0 },
      { label: "Loan", amount: 0 },
      { label: "Profession Tax", amount: 0 },
      { label: "TDS", amount: 0 },
      { label: "Other Deduction", amount: totalDeductions },
    ];

    const earningsRowsHtml = earningsRows
      .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="amount">${formatCurrency(row.amount)}</td></tr>`)
      .join("");

    const deductionsRowsHtml = deductionsRows
      .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="amount">${formatCurrency(row.amount)}</td></tr>`)
      .join("");

    const win = window.open("", "_blank", "width=860,height=700");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html><head><title>Salary Slip - ${escapeHtml(name)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:#f1f5f9;color:#111827;margin:0;padding:20px}
  .sheet{max-width:980px;margin:0 auto;background:#fff;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden}
  .letterhead{display:flex;align-items:center;padding:14px 18px;border-bottom:2px solid #0f766e;background:#f8fafc}
  .brand h1{margin:0;font-size:21px;color:#0f172a;letter-spacing:.2px}
  .brand p{margin:3px 0 0;color:#475569;font-size:11px}
  .content{padding:16px 18px}
  .top-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #cbd5e1;margin-top:8px}
  .cell{padding:7px 9px;border-right:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1;font-size:12px}
  .cell:nth-child(2n){border-right:none}
  .section-title{font-size:14px;font-weight:700;margin:12px 0 8px;color:#111827}
  .two-col-table{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #94a3b8}
  .two-col-table th,.two-col-table td{border:1px solid #94a3b8;padding:7px 8px;font-size:12px;vertical-align:top}
  .sub-table{width:100%;border-collapse:collapse}
  .sub-table th,.sub-table td{border:none;border-bottom:1px solid #e2e8f0;padding:6px 4px;font-size:12px}
  .sub-table th{text-align:left;background:#f8fafc;font-weight:700}
  .amount{text-align:right;font-weight:600;white-space:nowrap}
  .totals-row td{font-weight:700;background:#f8fafc}
  .net-pay{font-size:18px;font-weight:800;color:#0f172a}
  .rupees-line{margin-top:10px;padding:8px;border:1px solid #cbd5e1;font-size:12px}
  .payment-title{margin-top:14px;font-size:13px;font-weight:700}
  .payment-table{width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #94a3b8}
  .payment-table th,.payment-table td{border:1px solid #94a3b8;padding:7px 8px;font-size:12px;text-align:left}
  .status-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;color:#fff;background:${statusColor}}
  .footer{margin-top:12px;font-size:10px;color:#64748b;line-height:1.4}
  @media print{body{background:#fff;padding:0}.sheet{border:none;border-radius:0}}
</style>
</head>
<body>
<div class="sheet">
  <div class="letterhead">
    ${logoHtml}
    <div class="brand">
      <h1>${escapeHtml(school.name)}</h1>
      <p>${escapeHtml(contactParts.join(" | "))}</p>
    </div>
  </div>
  <div class="content">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
      <div>
        <div class="section-title" style="margin-top:0;">Salary Slip</div>
        <div style="font-size:12px;color:#475569;">Academic Year: ${escapeHtml(item.academicYear || "-")}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${staffAvatarHtml}
        <div style="font-size:12px;line-height:1.4;">
          <div style="font-weight:700;font-size:14px;color:#111827;">${escapeHtml(name)}</div>
          <div>${escapeHtml(position)}</div>
          <div>Department: ${escapeHtml(department)}</div>
          ${contact ? `<div>Contact: ${escapeHtml(contact)}</div>` : ""}
          <div style="margin-top:4px;"><span class="status-badge">${escapeHtml(String(item.status || "pending").toUpperCase())}</span></div>
        </div>
      </div>
    </div>

    <div class="top-grid">
      <div class="cell"><strong>Designation</strong>: ${escapeHtml(position)}</div>
      <div class="cell"><strong>Department</strong>: ${escapeHtml(department)}</div>
      <div class="cell"><strong>Gross Salary</strong>: ${formatCurrency(totalEarnings)}</div>
      <div class="cell"><strong>Payment Date</strong>: ${formatDate(item.paymentDate)}</div>
      <div class="cell"><strong>Total Deductions</strong>: ${formatCurrency(totalDeductions)}</div>
      <div class="cell"><strong>Balance Due</strong>: ${formatCurrency(balance)}</div>
    </div>

    <table class="two-col-table" style="margin-top:10px;">
      <tr>
        <th style="width:50%;">Earnings</th>
        <th style="width:50%;">Deductions</th>
      </tr>
      <tr>
        <td>
          <table class="sub-table">
            <thead><tr><th>Head</th><th class="amount">Amount</th></tr></thead>
            <tbody>${earningsRowsHtml}</tbody>
          </table>
        </td>
        <td>
          <table class="sub-table">
            <thead><tr><th>Head</th><th class="amount">Amount</th></tr></thead>
            <tbody>${deductionsRowsHtml}</tbody>
          </table>
        </td>
      </tr>
      <tr class="totals-row">
        <td>Total Earnings: <span style="float:right">${formatCurrency(totalEarnings)}</span></td>
        <td>Total Deductions: <span style="float:right">${formatCurrency(totalDeductions)}</span></td>
      </tr>
      <tr class="totals-row">
        <td colspan="2" style="text-align:right;">Net Pay: <span class="net-pay">${formatCurrency(netPay)}</span></td>
      </tr>
    </table>

    <div class="rupees-line">
      RUPEES: ${escapeHtml(formatCurrency(netPay).toUpperCase())}
    </div>

    <div class="payment-title">Payment Details</div>
    <table class="payment-table">
      <thead>
        <tr>
          <th>Mode of Payment</th>
          <th>Disbursement Date</th>
          <th>Employee Bank</th>
          <th>Account No</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(paymentMode)}</td>
          <td>${escapeHtml(disbursementDate)}</td>
          <td>${escapeHtml(employeeBank)}</td>
          <td>${escapeHtml(accountNumber)}</td>
          <td style="text-align:right;">${formatCurrency(netPay)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      This is a system-generated salary slip issued on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} by ${escapeHtml(school.name)}. Please contact the finance department for any queries.
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();};</script>
</body></html>`);
    win.document.close();
  };

  const openSalaryReport = async (item: StaffSalarySummary) => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    const staff = getStaffFromSalarySummary(item);

    if (!school?._id || !staff?._id) {
      setError("Unable to open salary report for this staff member.");
      return;
    }

    try {
      setSalaryReportLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/finance/${school._id}/staff/${staff._id}/salary-report`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load salary report");
      setSelectedSalaryReport(data as SalaryReportResponse);
    } catch (err) {
      console.error("FinanceModule salary report error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSalaryReportLoading(false);
    }
  };

  const downloadSalaryReport = (report: SalaryReportResponse) => {
    const school = getSchoolLetterhead();
    const staff = report.staff;

    const logoHtml = school.logo
      ? `<img src="${school.logo}" alt="School logo" style="height:68px;width:68px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;"/>`
      : "";

    const contactParts = [
      school.address,
      school.phone ? `Phone: ${school.phone}` : "",
      school.email ? `Email: ${school.email}` : "",
      school.website ? `Website: ${school.website}` : "",
    ].filter(Boolean);

    const recordsRows = report.records
      .map(
        (record) =>
          `<tr>
            <td>${formatDate(record.paymentDate || record.updatedAt || record.createdAt)}</td>
            <td>${escapeHtml(record.academicYear || "-")}</td>
            <td style="text-align:right;">${formatCurrency(record.amount)}</td>
            <td style="text-align:right;color:#15803d;">${formatCurrency(record.paidAmount)}</td>
            <td style="text-align:right;color:#b91c1c;">${formatCurrency(record.dueAmount)}</td>
            <td>${escapeHtml(String(record.status || "pending").toUpperCase())}</td>
          </tr>`
      )
      .join("");

    const transactionsRows = report.records
      .flatMap((record) => record.paymentHistory || [])
      .map(
        (entry) =>
          `<tr>
            <td>${formatDate(entry.paymentDate)}</td>
            <td>${escapeHtml(entry.receiptNumber)}</td>
            <td>${escapeHtml(entry.transactionId)}</td>
            <td>${escapeHtml(String(entry.paymentType || "cash").toUpperCase())}</td>
            <td style="text-align:right;">${formatCurrency(entry.amountPaid)}</td>
          </tr>`
      )
      .join("");

    const win = window.open("", "_blank", "width=1100,height=760");
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head><title>Salary Report - ${escapeHtml(staff.name || "Staff")}</title><style>
      body{font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:20px}
      .sheet{max-width:1020px;margin:0 auto;background:#fff;border:1px solid #dbe4ea;border-radius:16px;overflow:hidden}
      .letterhead{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:20px 24px;border-bottom:3px solid #0f766e;background:linear-gradient(135deg,#ecfeff 0%,#f8fafc 52%,#ffffff 100%)}
      .brand h1{margin:0;font-size:24px}
      .brand p{margin:4px 0 0;color:#475569;font-size:12px}
      .content{padding:22px 24px}
      .title{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
      .title h2{margin:0;font-size:22px}
      .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}
      .meta-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px}
      .totals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
      .totals .card{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc}
      h3{margin:18px 0 8px;font-size:15px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:8px}
      th{background:#f1f5f9;text-align:left}
      .footer{margin-top:16px;color:#64748b;font-size:11px}
      @media print{body{background:#fff;padding:0}.sheet{border:none;border-radius:0}}
    </style></head><body>
      <div class="sheet">
        <div class="letterhead">${logoHtml}<div class="brand"><h1>${escapeHtml(school.name)}</h1><p>${escapeHtml(contactParts.join(" | "))}</p></div></div>
        <div class="content">
          <div class="title"><h2>Salary Financial Report</h2><div style="font-size:12px;color:#475569;">Generated: ${formatDate(new Date().toISOString())}</div></div>
          <div class="meta">
            <div class="meta-item"><strong>Staff:</strong> ${escapeHtml(staff.name || "-")}<br/><strong>Position:</strong> ${escapeHtml(staff.position || "-")}<br/><strong>Department:</strong> ${escapeHtml(staff.department || "-")}</div>
            <div class="meta-item"><strong>Bank:</strong> ${escapeHtml(staff.bankName || "-")}<br/><strong>Account Number:</strong> ${escapeHtml(staff.accountNumber || "-")}<br/><strong>IFSC:</strong> ${escapeHtml(staff.ifscCode || "-")}</div>
          </div>
          <div class="totals">
            <div class="card"><strong>Total Salary</strong><br/>${formatCurrency(report.totals.salary)}</div>
            <div class="card"><strong>Total Paid</strong><br/>${formatCurrency(report.totals.paid)}</div>
            <div class="card"><strong>Total Due</strong><br/>${formatCurrency(report.totals.due)}</div>
          </div>

          <h3>Salary Records With Date</h3>
          <table>
            <thead><tr><th>Date</th><th>Academic Year</th><th style="text-align:right;">Salary</th><th style="text-align:right;">Paid</th><th style="text-align:right;">Due</th><th>Status</th></tr></thead>
            <tbody>${recordsRows || `<tr><td colspan="6" style="text-align:center;">No salary records available.</td></tr>`}</tbody>
          </table>

          <h3>Payment Transactions</h3>
          <table>
            <thead><tr><th>Date</th><th>Receipt</th><th>Transaction ID</th><th>Type</th><th style="text-align:right;">Amount</th></tr></thead>
            <tbody>${transactionsRows || `<tr><td colspan="5" style="text-align:center;">No payment transactions available.</td></tr>`}</tbody>
          </table>
          <p class="footer">This report is system generated and intended for finance record-keeping.</p>
        </div>
      </div>
      <script>window.onload=function(){window.print();};</script>
    </body></html>`);
    win.document.close();
  };

  const downloadInvestorStatement = (account: InvestorLedgerAccount) => {
    const school = getSchoolLetterhead();
    const filteredTransactions = getFilteredInvestorTransactions(account.transactions || []);

    const logoHtml = school.logo
      ? `<img src="${school.logo}" alt="School logo" style="height:64px;width:64px;object-fit:cover;border-radius:10px;border:1px solid #e2e8f0;"/>`
      : "";

    const contactParts = [
      school.address,
      school.phone ? `Phone: ${school.phone}` : "",
      school.email ? `Email: ${school.email}` : "",
      school.website ? `Website: ${school.website}` : "",
    ].filter(Boolean);

    const rows = filteredTransactions
      .map(
        (tx) =>
          `<tr>
            <td>${formatDate(tx.date)}</td>
            <td>${escapeHtml(tx.type === "investment" ? "Investment" : "Repayment")}</td>
            <td style="text-align:right;">${formatCurrency(tx.amount)}</td>
            <td>${escapeHtml(tx.note || "-")}</td>
          </tr>`
      )
      .join("");

    const win = window.open("", "_blank", "width=980,height=760");
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head><title>Investor Statement - ${escapeHtml(account.investorName)}</title><style>
      body{font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:20px}
      .sheet{max-width:940px;margin:0 auto;background:#fff;border:1px solid #dbe4ea;border-radius:16px;overflow:hidden}
      .letterhead{display:flex;align-items:center;gap:14px;padding:18px 22px;border-bottom:3px solid #0f766e;background:linear-gradient(135deg,#ecfeff 0%,#f8fafc 52%,#fff 100%)}
      .brand h1{margin:0;font-size:24px}
      .brand p{margin:4px 0 0;color:#475569;font-size:12px}
      .content{padding:20px 22px}
      .title{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
      .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
      .meta-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;font-size:13px}
      .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
      .card{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc}
      table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
      th,td{padding:8px;border:1px solid #e2e8f0}
      th{background:#f1f5f9;text-align:left}
      .footer{margin-top:14px;color:#64748b;font-size:11px}
      @media print{body{background:#fff;padding:0}.sheet{border:none;border-radius:0}}
    </style></head><body>
      <div class="sheet">
        <div class="letterhead">${logoHtml}<div class="brand"><h1>${escapeHtml(school.name)}</h1><p>${escapeHtml(contactParts.join(" | "))}</p></div></div>
        <div class="content">
          <div class="title"><div><h2 style="margin:0;">Investor Statement</h2><p style="margin:4px 0 0;color:#64748b;font-size:12px;">Range: ${escapeHtml(investorLedgerRange === "all" ? "All" : investorLedgerRange === "month" ? "Last 30 days" : "Last 90 days")}</p></div><div style="font-size:12px;color:#475569;">Generated: ${formatDate(new Date().toISOString())}</div></div>
          <div class="meta">
            <div class="meta-item"><strong>Investor</strong><br/>${escapeHtml(account.investorName)}<br/>${escapeHtml(account.investorType.toUpperCase())}</div>
            <div class="meta-item"><strong>Contact</strong><br/>${escapeHtml(account.contact || "-")}<br/>Status: ${escapeHtml(account.status || "Active")}</div>
          </div>
          <div class="cards">
            <div class="card"><strong>Total Invested</strong><br/>${formatCurrency(account.totalInvested)}</div>
            <div class="card"><strong>Total Repaid</strong><br/>${formatCurrency(account.totalRepaid)}</div>
            <div class="card"><strong>Balance To Repay</strong><br/>${formatCurrency(account.balanceToRepay)}</div>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Type</th><th style="text-align:right;">Amount</th><th>Note</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="4" style="text-align:center;">No transactions in selected range.</td></tr>`}</tbody>
          </table>
          <p class="footer">System generated investor ledger statement.</p>
        </div>
      </div>
      <script>window.onload=function(){window.print();};</script>
    </body></html>`);

    win.document.close();
  };

  const openFeeForm = async (item: StudentFeeSummary) => {
    const student = getStudentFromSummary(item);
    if (!student) return;

    let targetSummary = item;

    if (!item.financeId) {
      const school = JSON.parse(localStorage.getItem("school") || "null");
      if (!school || !school._id) {
        setError("School ID not found in localStorage");
        return;
      }

      try {
        setError(null);
        const res = await fetch(`${API_URL}/api/finance/student-fee-assignments/ensure`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId: school._id,
            student_id: student._id,
            class_id: student.classId,
            class_name: student.class || "",
            academic_year: item.academicYear || classFeeStructureForm.academicYear || getDefaultAcademicYear(),
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message || data?.error || "No fee structure is assigned for this student's class");
        }

        const ensuredAssignmentRaw = asRecord(data?.data?.assignment || null);
        if (ensuredAssignmentRaw) {
          const ensuredAssignment = mapApiAssignmentToUiRecord(ensuredAssignmentRaw);
          targetSummary = assignmentToStudentFeeSummary(ensuredAssignment);
        }

        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign fee structure for this student");
        return;
      }
    }

    setFeeForm({
      financeId: targetSummary.financeId || null,
      studentId: student._id,
      studentName: student.name,
      assignmentId: targetSummary.financeId || null,
      feeComponents: getEditableFeeComponents(targetSummary),
      paymentAmount: "",
      paymentType: "cash",
      currentPaidAmount: Number(targetSummary.paidAmount || 0),
      currentDueAmount: Number(targetSummary.pendingBalance ?? targetSummary.remainingAmount ?? 0),
      dueDate: getDisplayDueDate(targetSummary) || new Date().toISOString().split("T")[0],
      paymentDate: new Date().toISOString().split("T")[0],
      academicYear: targetSummary.academicYear || getDefaultAcademicYear(),
      description: `Fee payment for ${student.name}`,
      selectedMonthIndexes: [],
    });
  };

  const submitFeeForm = async (action: "setup" | "payment" | "print") => {
    if (!feeForm) return;

    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    const amount = getFeeComponentsTotal(feeForm.feeComponents);
    const installmentPlan = getInstallmentPlan(amount);
    const paidMonthsCount = getPaidMonthsCount(installmentPlan, feeForm.currentPaidAmount);
    const selectedMonthIndexes = Array.from(new Set(feeForm.selectedMonthIndexes || []))
      .filter((index) => Number.isInteger(index) && index >= paidMonthsCount && index < 12)
      .sort((left, right) => left - right);
    const pendingBalance = Math.max(amount - feeForm.currentPaidAmount, 0);
    const selectedInstallmentAmount = getSelectedInstallmentAmount(installmentPlan, selectedMonthIndexes);
    const paymentAmount = roundCurrency(Math.min(selectedInstallmentAmount, pendingBalance));

    if (!amount || amount <= 0) {
      setError("Add at least one valid fee component");
      return;
    }

    if (action !== "setup") {
      if (selectedMonthIndexes.length === 0 || paymentAmount <= 0) {
        setError("Select at least one unpaid month");
        return;
      }

      if (paymentAmount > pendingBalance + 0.01) {
        setError("Payment amount cannot exceed pending balance");
        return;
      }
    }

    if (!feeForm.assignmentId) {
      setError("Fee assignment is missing for this student. Save class fee structure first.");
      return;
    }

    try {
      setSavingFee(true);
      setError(null);
      setInfoMessage(null);

      const payload = {
        schoolId: school._id,
        student_fee_assignment_id: feeForm.assignmentId,
        payment_date: feeForm.paymentDate,
        payment_amount: paymentAmount,
        payment_mode: feeForm.paymentType,
        reference_no: "",
        remarks: `${feeForm.description}${selectedMonthIndexes.length > 0 ? ` | Months: ${selectedMonthIndexes.map((index) => INSTALLMENT_MONTH_LABELS[index]).join(", ")}` : ""}`,
      };

      const res = await fetch(`${API_URL}/api/finance/student-fee-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || "Failed to save fee details");

      await fetchData();

      if (action === "print") {
        const summaryRes = await fetch(`${API_URL}/api/finance/${school._id}/students/${feeForm.studentId}/receipt-summary`);
        const summaryData = await summaryRes.json().catch(() => null);
        if (!summaryRes.ok) {
          throw new Error(summaryData?.message || "Payment saved, but latest receipt could not be loaded for printing");
        }
        printReceipt(summaryData as StudentFeeSummary);
      }

      setInfoMessage(
        "Fee payment recorded and receipt updated."
      );
      setFeeForm(null);
    } catch (err) {
      console.error("FinanceModule fee save error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingFee(false);
    }
  };

  const submitSalaryForm = async () => {
    if (!salaryForm) return;

    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    const amount = Number(salaryForm.amount);
    const paidAmount = Number(salaryForm.paidAmount);

    if (!amount || amount <= 0) {
      setError("Enter a valid salary amount");
      return;
    }

    if (paidAmount < 0) {
      setError("Paid amount cannot be negative");
      return;
    }

    const status = paidAmount >= amount ? "paid" : paidAmount > 0 ? "partial" : "pending";
    const payload = {
      type: "staff_salary",
      staffId: salaryForm.staffId,
      amount,
      paidAmount,
      paymentDate: salaryForm.paymentDate,
      status,
      description: salaryForm.description,
      academicYear: salaryForm.academicYear,
      schoolId: school._id,
      recordPaymentEntry: salaryForm.mode === "pay",
    };

    try {
      setSavingSalary(true);
      setError(null);
      setInfoMessage(null);

      const res = await fetch(salaryForm.financeId ? `${API_URL}/api/finance/${salaryForm.financeId}` : `${API_URL}/api/finance`, {
        method: salaryForm.financeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to save salary details");

      await fetchData();
      setSalaryForm(null);
    } catch (err) {
      console.error("FinanceModule salary save error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSalary(false);
    }
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    const due = new Date(dueDate).getTime();
    return due < Date.now();
  };

  const openLateFeeForm = (summary: StudentFeeSummary) => {
    if (!summary.financeId || summary.status === "paid") {
      setError("Late fee can only be applied to overdue unpaid or partial fees");
      return;
    }

    const student = getStudentFromSummary(summary);
    if (!student) {
      setError("Unable to open late fee form - student information missing");
      return;
    }

    setLateFeeForm({
      assignmentId: summary.financeId,
      studentName: student.name,
      lateFeeAmount: "0",
      reason: "Late payment penalty",
      isSubmitting: false,
    });
  };

  const submitLateFeeForm = async () => {
    if (!lateFeeForm) return;

    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    const lateFeeAmount = Number(lateFeeForm.lateFeeAmount);
    if (!lateFeeAmount || lateFeeAmount <= 0) {
      setError("Enter a valid late fee amount");
      return;
    }

    try {
      setLateFeeForm({ ...lateFeeForm, isSubmitting: true });
      setError(null);
      setInfoMessage(null);

      const res = await fetch(`${API_URL}/api/finance/student-fee-assignments/${lateFeeForm.assignmentId}/apply-late-fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: school._id,
          lateFeeAmount,
          reason: lateFeeForm.reason,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to apply late fee");

      setInfoMessage(`Late fee of ₹${lateFeeAmount} applied successfully`);
      await fetchData();
      setLateFeeForm(null);
    } catch (err) {
      console.error("FinanceModule late fee error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLateFeeForm(lateFeeForm ? { ...lateFeeForm, isSubmitting: false } : null);
    }
  };

  const openStudentSummary = async (item: StudentFeeSummary) => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    const student = getStudentFromSummary(item);
    if (!school?._id || !student?._id) {
      setError("Unable to open fee summary for this student.");
      return;
    }

    try {
      setSummaryLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/finance/${school._id}/students/${student._id}/receipt-summary`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load fee summary");
      setSelectedFeeSummary(data as StudentFeeSummary);
    } catch (err) {
      console.error("FinanceModule fee summary error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSummaryLoading(false);
    }
  };

  const printReceipt = (summary: StudentFeeSummary) => {
    const student = getStudentFromSummary(summary);
    const latestReceipt = getLatestReceipt(summary);
    if (!student) {
      setError("Student information is missing for receipt generation.");
      return;
    }

    const school = getSchoolLetterhead();
    const feeComponents = Array.isArray(summary.feeComponents) && summary.feeComponents.length > 0 ? summary.feeComponents : [{ label: "Tuition Fee", amount: summary.totalFee }];
    const componentRows = feeComponents
      .map(
        (component) =>
          `<tr><td style="padding:8px;border:1px solid #dbeafe;">${escapeHtml(component.label)}</td><td style="padding:8px;border:1px solid #dbeafe;text-align:right;">${formatCurrency(component.amount)}</td></tr>`
      )
      .join("");
    const receiptSection = latestReceipt
      ? `<div class="section"><h3>Receipt Details</h3><table><tr><td>Receipt Number</td><td>${escapeHtml(latestReceipt.receiptNumber)}</td></tr><tr><td>Transaction ID</td><td>${escapeHtml(latestReceipt.transactionId)}</td></tr><tr><td>Payment Date</td><td>${formatDate(latestReceipt.paymentDate)}</td></tr><tr><td>Payment Type</td><td>${escapeHtml(String(latestReceipt.paymentType || "cash").toUpperCase())}</td></tr><tr><td>Amount Paid</td><td>${formatCurrency(latestReceipt.amountPaid)}</td></tr></table></div>`
      : `<p style="margin-top:16px;color:#92400e;background:#fffbeb;padding:12px;border-radius:10px;">No payment receipt has been generated yet. Record a fee payment to create the first receipt.</p>`;

    const logoHtml = school.logo
      ? `<img src="${school.logo}" alt="School logo" style="height:68px;width:68px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;"/>`
      : "";

    const contactParts = [
      school.address,
      school.phone ? `Phone: ${school.phone}` : "",
      school.email ? `Email: ${school.email}` : "",
      school.website ? `Website: ${school.website}` : "",
    ].filter(Boolean);

    const win = window.open("", "_blank", "width=900,height=720");
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head><title>Fee Receipt - ${escapeHtml(student.name)}</title><style>body{font-family:Arial,sans-serif;background:#f1f5f9;color:#0f172a;margin:0;padding:20px}.sheet{max-width:860px;margin:0 auto;background:#fff;border:1px solid #dbe4ea;border-radius:18px;overflow:hidden}.letterhead{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:20px 24px;border-bottom:3px solid #0f766e;background:linear-gradient(135deg,#ecfeff 0%,#f8fafc 52%,#ffffff 100%)}.brand h1{margin:0;font-size:28px;color:#0f172a}.brand p{margin:6px 0 0;color:#334155;font-size:13px}.content{padding:24px}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0 18px}.meta-item{background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0}.section{margin-top:20px}h2,h3{margin:0 0 10px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #dbeafe}th{background:#eff6ff;text-align:left}.footer{margin-top:22px;font-size:12px;color:#64748b}@media print{body{background:#fff;padding:0}.sheet{border:none;border-radius:0}}</style></head><body><div class="sheet"><div class="letterhead">${logoHtml}<div class="brand"><h1>${escapeHtml(school.name)}</h1><p>${escapeHtml(contactParts.join(" | "))}</p></div></div><div class="content"><h2>Student Fee Summary and Receipt</h2><div class="meta"><div class="meta-item"><strong>Student Name</strong><br />${escapeHtml(student.name)}</div><div class="meta-item"><strong>Class</strong><br />${escapeHtml(student.class)}</div><div class="meta-item"><strong>Current Payment Status</strong><br />${escapeHtml(String(summary.paymentStatus || summary.status).toUpperCase())}</div><div class="meta-item"><strong>Due Date</strong><br />${formatDate(getDisplayDueDate(summary))}</div></div><div class="section"><h3>Current Fee Details</h3><table><tr><td>Total Fee Amount</td><td>${formatCurrency(summary.totalFee)}</td></tr><tr><td>Amount Paid</td><td>${formatCurrency(summary.paidAmount)}</td></tr><tr><td>Pending Balance</td><td>${formatCurrency(summary.pendingBalance ?? summary.remainingAmount)}</td></tr><tr><td>Academic Year</td><td>${escapeHtml(summary.academicYear || "-")}</td></tr></table></div><div class="section"><h3>Fee Component Breakdown</h3><table><thead><tr><th>Component</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${componentRows}</tbody></table></div>${receiptSection}<p class="footer">This is a system-generated fee receipt on school letterhead and can be downloaded as PDF from the print dialog.</p></div></div><script>window.onload=function(){window.print();};</script></body></html>`);
    win.document.close();
  };

  const printAllReceiptsForStudent = async (summary: StudentFeeSummary) => {
    const student = getStudentFromSummary(summary);
    const school = getSchoolLetterhead();

    if (!student?._id || !school.id) {
      setError("Unable to load receipt details for this student.");
      return;
    }

    try {
      setError(null);
      const res = await fetch(`${API_URL}/api/finance/${school.id}/students/${student._id}/receipt-summary`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch student receipts");
      }

      const latestSummary = data as StudentFeeSummary;
      const latestStudent = getStudentFromSummary(latestSummary) || student;
      const paymentHistory = Array.isArray(latestSummary.paymentHistory) ? latestSummary.paymentHistory : [];

      if (paymentHistory.length === 0) {
        setError("No payment receipts found for this student yet.");
        return;
      }

      const sortedPayments = [...paymentHistory].sort(
        (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
      );

      const rows = sortedPayments
        .map(
          (payment, index) =>
            `<tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(payment.receiptNumber)}</td>
              <td>${formatDate(payment.paymentDate)}</td>
              <td>${escapeHtml(String(payment.paymentType || "cash").toUpperCase())}</td>
              <td>${escapeHtml(payment.transactionId)}</td>
              <td style="text-align:right;">${formatCurrency(payment.amountPaid)}</td>
            </tr>`
        )
        .join("");

      const logoHtml = school.logo
        ? `<img src="${school.logo}" alt="School logo" style="height:68px;width:68px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;"/>`
        : "";

      const contactParts = [
        school.address,
        school.phone ? `Phone: ${school.phone}` : "",
        school.email ? `Email: ${school.email}` : "",
        school.website ? `Website: ${school.website}` : "",
      ].filter(Boolean);

      const win = window.open("", "_blank", "width=1000,height=760");
      if (!win) {
        return;
      }

      win.document.write(`<!DOCTYPE html><html><head><title>Receipts - ${escapeHtml(latestStudent.name)}</title><style>
        body{font-family:Arial,sans-serif;color:#0f172a;margin:20px;background:#f8fafc}
        .sheet{max-width:960px;margin:0 auto;background:#fff;border:1px solid #dbe4ea;border-radius:16px;overflow:hidden}
        .letterhead{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:20px 24px;border-bottom:3px solid #0f766e;background:linear-gradient(135deg,#ecfeff 0%,#f8fafc 52%,#ffffff 100%)}
        .brand h1{margin:0;font-size:24px;letter-spacing:0.2px}
        .brand p{margin:4px 0 0;color:#475569;font-size:12px;line-height:1.5}
        .content{padding:22px 24px}
        .title{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}
        .title h2{margin:0;font-size:20px}
        .meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 18px}
        .meta-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px}
        .meta-item .k{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
        .meta-item .v{margin-top:4px;font-weight:600}
        table{width:100%;border-collapse:collapse}
        th,td{padding:10px;border:1px solid #dbe4ea;font-size:13px}
        th{background:#eff6ff;text-align:left}
        .summary{margin-top:14px;display:flex;justify-content:flex-end}
        .summary table{width:320px}
        .summary td{padding:8px}
        .summary .label{color:#475569}
        .summary .value{text-align:right;font-weight:700}
        .footer{margin-top:16px;font-size:12px;color:#64748b}
      </style></head><body><div class="sheet"><div class="letterhead">${logoHtml}<div class="brand"><h1>${escapeHtml(school.name)}</h1><p>${escapeHtml(contactParts.join(" | "))}</p></div></div><div class="content"><div class="title"><div><h2>Student Fee Receipt Register</h2><p style="margin:6px 0 0;color:#64748b;font-size:13px;">Complete payment receipt history for student account.</p></div><div style="text-align:right;font-size:12px;color:#475569;"><div>Generated: ${formatDate(new Date().toISOString())}</div><div>Records: ${sortedPayments.length}</div></div></div><div class="meta"><div class="meta-item"><div class="k">Student Name</div><div class="v">${escapeHtml(latestStudent.name)}</div></div><div class="meta-item"><div class="k">Class</div><div class="v">${escapeHtml(latestStudent.class)}</div></div><div class="meta-item"><div class="k">Roll No</div><div class="v">${escapeHtml(latestStudent.rollNumber || "-")}</div></div><div class="meta-item"><div class="k">Academic Year</div><div class="v">${escapeHtml(latestSummary.academicYear || "-")}</div></div></div><table><thead><tr><th>#</th><th>Receipt Number</th><th>Payment Date</th><th>Mode</th><th>Transaction ID</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><table><tr><td class="label">Total Fee</td><td class="value">${formatCurrency(latestSummary.totalFee)}</td></tr><tr><td class="label">Paid Amount</td><td class="value">${formatCurrency(latestSummary.paidAmount)}</td></tr><tr><td class="label">Pending Balance</td><td class="value">${formatCurrency(latestSummary.pendingBalance ?? latestSummary.remainingAmount)}</td></tr></table></div><p class="footer">This is a system-generated receipt register on school letterhead and can be downloaded as PDF from the print dialog.</p></div></div><script>window.onload=function(){window.print();};</script></body></html>`);
      win.document.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to print receipts");
    }
  };

  const sendReceiptToEmail = async (summary: StudentFeeSummary) => {
    const latestReceipt = getLatestReceipt(summary);
    const student = getStudentFromSummary(summary);

    if (!summary.financeId || !latestReceipt) {
      setError("A payment receipt is not available yet for this student.");
      return;
    }

    if (!student?.email) {
      setError("Registered student email is not available.");
      return;
    }

    try {
      setSendingReceipt(true);
      setError(null);
      setInfoMessage(null);

      const res = await fetch(`${API_URL}/api/finance/${summary.financeId}/send-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptNumber: latestReceipt.receiptNumber }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to send fee receipt");

      setInfoMessage(data?.message || `Receipt sent to ${student.email}`);
      await fetchData();
      if (selectedFeeSummary?.financeId === summary.financeId) {
        await openStudentSummary(summary);
      }
    } catch (err) {
      console.error("FinanceModule send receipt error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSendingReceipt(false);
    }
  };

  const investmentFormErrors = {
    investmentTitle: !investmentForm.investmentTitle.trim(),
    assetType: !investmentForm.assetType.trim(),
    branch: !investmentForm.branch.trim(),
    purchaseDate: !investmentForm.purchaseDate.trim(),
    vendor: !investmentForm.vendor.trim(),
    assetId: !investmentForm.assetId.trim(),
    quantity: Number(investmentForm.quantity || 0) <= 0,
    unitCost: Number(investmentForm.unitCost || 0) <= 0,
    totalAmount: Number(investmentForm.totalAmount || 0) <= 0,
  };

  const hasInvestmentFormErrors = Object.values(investmentFormErrors).some(Boolean);

  const handleInvestmentField = <K extends keyof InvestmentFormState>(key: K, value: InvestmentFormState[K]) => {
    setInvestmentForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "quantity" || key === "unitCost") {
        const quantity = Number(key === "quantity" ? value : next.quantity) || 0;
        const unitCost = Number(key === "unitCost" ? value : next.unitCost) || 0;
        const computedTotal = quantity * unitCost;
        next.totalAmount = computedTotal;
        if (!next.actualPurchaseAmount || next.actualPurchaseAmount <= 0) {
          next.actualPurchaseAmount = computedTotal;
        }
      }

      const actualWithCharges = Number(next.actualPurchaseAmount || 0) + Number(next.taxGst || 0) + Number(next.additionalCharges || 0);
      next.currentBookValue = Math.max(actualWithCharges - Number(next.accumulatedDepreciation || 0), 0);

      return next;
    });
  };

  const handleInvestmentDocumentUpload = (
    docType: keyof InvestmentFormState["documents"],
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const fileNames = Array.from(event.target.files || []).map((file) => file.name);
    if (fileNames.length === 0) return;

    setInvestmentForm((current) => ({
      ...current,
      documents: {
        ...current.documents,
        [docType]: [...current.documents[docType], ...fileNames],
      },
    }));
  };

  const removeInvestmentDocument = (docType: keyof InvestmentFormState["documents"], fileName: string) => {
    setInvestmentForm((current) => ({
      ...current,
      documents: {
        ...current.documents,
        [docType]: current.documents[docType].filter((name) => name !== fileName),
      },
    }));
  };

  const pushStatusTimeline = () => {
    if (!investmentForm.status) return;
    const statusEvent: InvestmentStatusTimelineItem = {
      status: investmentForm.status,
      date: investmentForm.approvalDate || new Date().toISOString().split("T")[0],
      by: (investmentForm.approvedBy || "Finance Admin").trim(),
      remarks: investmentForm.approvalRemarks.trim() || "Status updated",
    };

    setInvestmentForm((current) => ({
      ...current,
      statusTimeline: [statusEvent, ...current.statusTimeline],
      approvalRemarks: "",
    }));
  };

  const submitInvestmentRecord = () => {
    setInvestmentSubmitAttempted(true);
    if (hasInvestmentFormErrors) {
      setError("Please complete mandatory investment fields before saving.");
      return;
    }

    const now = new Date().toISOString();
    const timeline = investmentForm.statusTimeline.length > 0
      ? investmentForm.statusTimeline
      : [{
          status: investmentForm.status,
          date: now.split("T")[0],
          by: (investmentForm.approvedBy || "Finance Admin").trim() || "Finance Admin",
          remarks: "Initial status",
        }];

    const record: InvestmentRecord = {
      ...investmentForm,
      statusTimeline: timeline,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
    };

    setInvestmentRecords((current) => [record, ...current]);
    setInvestmentForm(makeDefaultInvestmentForm());
    setInvestmentSubmitAttempted(false);
    setInfoMessage("Investment record added to asset register.");
    setError(null);
  };

  const filteredInvestmentRecords = useMemo(() => {
    const normalizedSearch = investmentSearch.trim().toLowerCase();
    const filtered = investmentRecords.filter((record) => {
      const byCategory = investmentCategoryFilter === "all" || record.investmentCategory === investmentCategoryFilter;
      const byStatus = investmentStatusFilter === "all" || record.status === investmentStatusFilter;
      const bySearch =
        !normalizedSearch ||
        [record.assetId, record.investmentTitle, record.vendor, record.branch, record.location]
          .some((field) => field.toLowerCase().includes(normalizedSearch));

      return byCategory && byStatus && bySearch;
    });

    filtered.sort((left, right) => {
      if (investmentSortBy === "amount-high") return Number(right.totalAmount || 0) - Number(left.totalAmount || 0);
      if (investmentSortBy === "amount-low") return Number(left.totalAmount || 0) - Number(right.totalAmount || 0);
      if (investmentSortBy === "oldest") return new Date(left.purchaseDate || 0).getTime() - new Date(right.purchaseDate || 0).getTime();
      return new Date(right.purchaseDate || right.createdAt).getTime() - new Date(left.purchaseDate || left.createdAt).getTime();
    });

    return filtered;
  }, [investmentRecords, investmentSearch, investmentCategoryFilter, investmentStatusFilter, investmentSortBy]);

  const investmentOverview = useMemo(() => {
    const totalValue = investmentRecords.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    const underMaintenance = investmentRecords.filter((item) => item.status === "Under Maintenance").length;
    const today = new Date();
    const warrantyWindow = new Date();
    warrantyWindow.setDate(today.getDate() + 60);
    const expiringWarranty = investmentRecords.filter((item) => {
      if (!item.warrantyExpiryDate) return false;
      const warrantyDate = new Date(item.warrantyExpiryDate);
      return warrantyDate >= today && warrantyDate <= warrantyWindow;
    }).length;

    const categorySummary = investmentCategoryOptions.map((category) => ({
      category,
      value: investmentRecords
        .filter((item) => item.investmentCategory === category)
        .reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
    }));

    const budgetTotal = investmentRecords.reduce((sum, item) => sum + Number(item.budgetedAmount || 0), 0);
    const actualTotal = investmentRecords.reduce((sum, item) => sum + Number(item.actualPurchaseAmount || 0), 0);

    return {
      totalValue,
      assetCount: investmentRecords.length,
      underMaintenance,
      expiringWarranty,
      categorySummary,
      recentActivity: [...investmentRecords]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 6),
      budgetTotal,
      actualTotal,
    };
  }, [investmentRecords]);

  const investmentReportSummary = useMemo(() => {
    const yearWise = Array.from(investmentRecords.reduce((map, item) => {
      const key = item.academicYear || "Unknown";
      map.set(key, (map.get(key) || 0) + Number(item.totalAmount || 0));
      return map;
    }, new Map<string, number>()));

    const fundingWise = Array.from(investmentRecords.reduce((map, item) => {
      const key = item.fundingSource || "Other";
      map.set(key, (map.get(key) || 0) + Number(item.totalAmount || 0));
      return map;
    }, new Map<string, number>()));

    const depreciationTotal = investmentRecords.reduce((sum, item) => sum + Number(item.accumulatedDepreciation || 0), 0);
    const disposedTotal = investmentRecords
      .filter((item) => item.status === "Disposed")
      .reduce((sum, item) => sum + Number(item.disposalValue || 0), 0);

    return {
      yearWise,
      fundingWise,
      depreciationTotal,
      disposedTotal,
    };
  }, [investmentRecords]);

  const exportInvestmentCsv = () => {
    const header = [
      "Asset ID",
      "Investment Title",
      "Category",
      "Branch",
      "Purchase Date",
      "Vendor",
      "Total Amount",
      "Status",
      "Location",
      "Book Value",
    ];

    const rows = filteredInvestmentRecords.map((item) => [
      item.assetId,
      item.investmentTitle,
      item.investmentCategory,
      item.branch,
      item.purchaseDate,
      item.vendor,
      Number(item.totalAmount || 0).toFixed(2),
      item.status,
      item.location,
      Number(item.currentBookValue || 0).toFixed(2),
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((entry) => `"${String(entry).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `investment-register-${new Date().toISOString().split("T")[0]}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const feeFormTotal = feeForm ? getFeeComponentsTotal(feeForm.feeComponents) : 0;
  const feeFormPendingBalance = feeForm ? Math.max(feeFormTotal - feeForm.currentPaidAmount, 0) : 0;
  const feeFormInstallmentPlan = feeForm ? getInstallmentPlan(feeFormTotal) : Array.from({ length: 12 }, () => 0);
  const feeFormPaidMonthsCount = feeForm ? getPaidMonthsCount(feeFormInstallmentPlan, feeForm.currentPaidAmount) : 0;
  const feeFormSelectedMonthIndexes = feeForm
    ? (feeForm.selectedMonthIndexes || [])
        .filter((index) => Number.isInteger(index) && index >= feeFormPaidMonthsCount && index < 12)
        .sort((left, right) => left - right)
    : [];
  const feeFormSelectedAmount = roundCurrency(
    Math.min(getSelectedInstallmentAmount(feeFormInstallmentPlan, feeFormSelectedMonthIndexes), feeFormPendingBalance)
  );
  const feeFormMinInstallment = feeForm ? Math.min(...feeFormInstallmentPlan.filter((amount) => amount > 0)) : 0;
  const feeFormMaxInstallment = feeForm ? Math.max(...feeFormInstallmentPlan) : 0;
  const activeFinancePanelTheme = financeActionPanelThemes[activeFinanceAction];
  const mappedImportFields = importPreview
    ? (Object.entries(importPreview.headerMapping) as Array<
        [StudentLedgerImportCanonicalField, StudentLedgerImportHeaderMappingEntry | null]
      >).filter(([, entry]) => Boolean(entry))
    : [];
  const showLedgerImportPanel = Boolean(localStorage.getItem("financeImportPanelEnabled"));

  return (
    <div className={`space-y-6 rounded-[28px] p-4 transition-all duration-300 ${isDashboard ? "bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_40%)]" : activeFinancePanelTheme.pageClassName}`}>
      {/* Tab bar */}
      <div className="border-b flex gap-1 text-sm font-medium">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`inline-flex items-center gap-1.5 px-3 pb-2 transition-colors ${
            activeTab === "dashboard"
              ? "border-b-2 border-slate-900 text-slate-900"
              : "text-gray-500 hover:text-slate-700"
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("student")}
          className={`px-3 pb-2 transition-colors ${
            activeTab === "student"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-slate-700"
          }`}
        >
          Students Finance
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`px-3 pb-2 transition-colors ${
            activeTab === "staff"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-slate-700"
          }`}
        >
          Staff Finance
        </button>
      </div>

      {/* ── DASHBOARD TAB ── */}
      {isDashboard && (
        <SchoolFinanceDashboard
          selectedFinancialYear={selectedFinancialYear}
          onFinancialYearChange={setSelectedFinancialYear}
          onNavigate={(action) => {
            if (action === "record-payment" || action === "fee-structure") {
              setActiveTab("student");
            } else if (action === "salary" || action === "investor-ledger") {
              setActiveTab("staff");
            }
            if (action !== "reports") {
              setActiveFinanceAction(action as FinancePhaseAction);
            }
          }}
        />
      )}

      {/* ── STUDENT / STAFF TABS ── */}
      {!isDashboard && (
      <div>
        <h2 className="text-xl font-semibold">{isStudent ? "Students Finance" : "Staff Finance"}</h2>
        {isStudent && <p className="text-sm text-slate-500 mt-1">Review current fee position, component breakdown, receipt metadata, printable receipts, and registered-email delivery.</p>}
      </div>
      )}

      {!isDashboard && (
      <section className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Finance Dashboard KPIs</h3>
          <p className="text-xs text-slate-500">Current snapshot</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {topKpiCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className={`mt-2 text-lg font-bold ${card.accent}`}>{formatCurrency(card.value)}</p>
              <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {!isDashboard && (
      <section className={`overflow-hidden rounded-[28px] border transition-all duration-300 ${activeFinancePanelTheme.shellClassName}`}>
        <div className="px-6 py-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className={`inline-flex items-center rounded-full border bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] transition-colors duration-300 ${activeFinancePanelTheme.badgeClassName}`}>
                Finance redesign phase 1
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">Finance actions</h3>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-right shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{financePhaseActions.find((action) => action.id === activeFinanceAction)?.title}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            {financePhaseActions.map((action) => {
              const Icon = action.icon;
              const isActiveAction = action.id === activeFinanceAction;

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleFinanceActionSelect(action)}
                  className={`group flex min-h-[240px] h-full flex-col justify-between rounded-[28px] border bg-gradient-to-br p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${action.accentClassName} ${isActiveAction ? "ring-2 ring-slate-900/10 shadow-lg" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-current shadow-sm">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                      {action.phase}
                    </span>
                  </div>

                  <div className="mt-10">
                    <h4 className="text-xl font-semibold leading-tight">{action.title}</h4>
                    <p className="mt-3 text-sm leading-6 text-current/75">{action.description}</p>
                  </div>

                  <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold">
                    {action.cta}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {!isStudent && activeFinanceAction === "school-investment" && (
        <section id="finance-school-investment-section" className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(145deg,#f7fee7_0%,#ffffff_40%,#f8fafc_100%)] p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">Investment Management</h3>
              <p className="mt-1 text-sm text-slate-600">Record and track school investments, capital assets, depreciation, approvals, maintenance, and supporting documentation.</p>
            </div>
            <button
              type="button"
              onClick={exportInvestmentCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="h-4 w-4" /> Export Register
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-slate-900">Dashboard Overview</h4>
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Total Investment Value</p><p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(investmentOverview.totalValue)}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Number of Assets</p><p className="mt-1 text-lg font-bold text-slate-900">{investmentOverview.assetCount}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Assets Under Maintenance</p><p className="mt-1 text-lg font-bold text-amber-700">{investmentOverview.underMaintenance}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Expiring Warranty Count</p><p className="mt-1 text-lg font-bold text-rose-700">{investmentOverview.expiringWarranty}</p></div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category-wise investment summary</p>
                    <div className="mt-2 space-y-2">
                      {investmentOverview.categorySummary.map((item) => (
                        <div key={`category-${item.category}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span className="text-slate-700">{item.category}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent investment activity</p>
                    {investmentOverview.recentActivity.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">No recent investment activity yet.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {investmentOverview.recentActivity.map((activity) => (
                          <div key={activity.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <p className="font-semibold text-slate-900">{activity.investmentTitle}</p>
                            <p className="text-xs text-slate-500">{activity.branch} • {formatDate(activity.purchaseDate)} • {formatCurrency(activity.totalAmount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
                  <p className="font-semibold text-emerald-900">Budget vs Actual Investment Summary</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-emerald-900">
                    <span>Budgeted: <strong>{formatCurrency(investmentOverview.budgetTotal)}</strong></span>
                    <span>Actual: <strong>{formatCurrency(investmentOverview.actualTotal)}</strong></span>
                    <span>Variance: <strong>{formatCurrency(investmentOverview.actualTotal - investmentOverview.budgetTotal)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Add New Investment</h4>
                <p className="mt-1 text-xs text-slate-500">Fill all critical details for accurate capital asset records and financial compliance.</p>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="block xl:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Investment Title</span><input value={investmentForm.investmentTitle} onChange={(e) => handleInvestmentField("investmentTitle", e.target.value)} className={styledFinanceFieldClassName} placeholder="e.g., Smart Classroom Setup - Block A" />{investmentSubmitAttempted && investmentFormErrors.investmentTitle && <span className="mt-1 block text-xs text-rose-600">Investment title is required.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Investment Category</span><select value={investmentForm.investmentCategory} onChange={(e) => handleInvestmentField("investmentCategory", e.target.value as InvestmentCategory)} className={styledFinanceFieldClassName}>{investmentCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Asset Type</span><input value={investmentForm.assetType} onChange={(e) => handleInvestmentField("assetType", e.target.value)} className={styledFinanceFieldClassName} placeholder="e.g., Interactive Panel" />{investmentSubmitAttempted && investmentFormErrors.assetType && <span className="mt-1 block text-xs text-rose-600">Asset type is required.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Academic Year</span><input value={investmentForm.academicYear} onChange={(e) => handleInvestmentField("academicYear", e.target.value)} className={styledFinanceFieldClassName} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Campus / Branch</span><input value={investmentForm.branch} onChange={(e) => handleInvestmentField("branch", e.target.value)} className={styledFinanceFieldClassName} placeholder="Main Campus" />{investmentSubmitAttempted && investmentFormErrors.branch && <span className="mt-1 block text-xs text-rose-600">Branch is required.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Purchase Date</span><input type="date" value={investmentForm.purchaseDate} onChange={(e) => handleInvestmentField("purchaseDate", e.target.value)} className={styledFinanceFieldClassName} />{investmentSubmitAttempted && investmentFormErrors.purchaseDate && <span className="mt-1 block text-xs text-rose-600">Purchase date is required.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Vendor / Supplier</span><input value={investmentForm.vendor} onChange={(e) => handleInvestmentField("vendor", e.target.value)} className={styledFinanceFieldClassName} placeholder="Vendor name" />{investmentSubmitAttempted && investmentFormErrors.vendor && <span className="mt-1 block text-xs text-rose-600">Vendor is required.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Invoice Number</span><input value={investmentForm.invoiceNumber} onChange={(e) => handleInvestmentField("invoiceNumber", e.target.value)} className={styledFinanceFieldClassName} placeholder="INV-2026-001" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Quantity</span><input type="number" min="1" value={investmentForm.quantity} onChange={(e) => handleInvestmentField("quantity", Number(e.target.value || 0))} className={styledFinanceFieldClassName} />{investmentSubmitAttempted && investmentFormErrors.quantity && <span className="mt-1 block text-xs text-rose-600">Quantity must be at least 1.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Unit Cost</span><input type="number" min="0" step="0.01" value={investmentForm.unitCost} onChange={(e) => handleInvestmentField("unitCost", Number(e.target.value || 0))} className={styledFinanceFieldClassName} />{investmentSubmitAttempted && investmentFormErrors.unitCost && <span className="mt-1 block text-xs text-rose-600">Unit cost must be greater than 0.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Total Amount</span><input type="number" min="0" step="0.01" value={investmentForm.totalAmount} onChange={(e) => handleInvestmentField("totalAmount", Number(e.target.value || 0))} className={styledFinanceFieldClassName} />{investmentSubmitAttempted && investmentFormErrors.totalAmount && <span className="mt-1 block text-xs text-rose-600">Total amount must be greater than 0.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Funding Source</span><select value={investmentForm.fundingSource} onChange={(e) => handleInvestmentField("fundingSource", e.target.value as InvestmentFundingSource)} className={styledFinanceFieldClassName}>{investmentFundingSourceOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Payment Method</span><input value={investmentForm.paymentMethod} onChange={(e) => handleInvestmentField("paymentMethod", e.target.value)} className={styledFinanceFieldClassName} placeholder="NEFT / Cheque / UPI" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Asset Code / Asset ID</span><input value={investmentForm.assetId} onChange={(e) => handleInvestmentField("assetId", e.target.value)} className={styledFinanceFieldClassName} placeholder="ASSET-0001" />{investmentSubmitAttempted && investmentFormErrors.assetId && <span className="mt-1 block text-xs text-rose-600">Asset ID is required.</span>}</label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Serial Number</span><input value={investmentForm.serialNumber} onChange={(e) => handleInvestmentField("serialNumber", e.target.value)} className={styledFinanceFieldClassName} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Location / Room</span><input value={investmentForm.location} onChange={(e) => handleInvestmentField("location", e.target.value)} className={styledFinanceFieldClassName} placeholder="Lab 3, Room 204" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Assigned Department</span><input value={investmentForm.department} onChange={(e) => handleInvestmentField("department", e.target.value)} className={styledFinanceFieldClassName} placeholder="Science" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Assigned Custodian</span><input value={investmentForm.custodian} onChange={(e) => handleInvestmentField("custodian", e.target.value)} className={styledFinanceFieldClassName} placeholder="Staff name" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Warranty Expiry Date</span><input type="date" value={investmentForm.warrantyExpiryDate} onChange={(e) => handleInvestmentField("warrantyExpiryDate", e.target.value)} className={styledFinanceFieldClassName} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Insurance Details</span><input value={investmentForm.insuranceDetails} onChange={(e) => handleInvestmentField("insuranceDetails", e.target.value)} className={styledFinanceFieldClassName} placeholder="Policy no., provider" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Useful Life</span><input value={investmentForm.usefulLife} onChange={(e) => handleInvestmentField("usefulLife", e.target.value)} className={styledFinanceFieldClassName} placeholder="5 years" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Depreciation Method</span><select value={investmentForm.depreciationMethod} onChange={(e) => handleInvestmentField("depreciationMethod", e.target.value as InvestmentDepreciationMethod)} className={styledFinanceFieldClassName}>{investmentDepreciationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                  <label className="block xl:col-span-3"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Notes / Description</span><textarea value={investmentForm.notes} onChange={(e) => handleInvestmentField("notes", e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" placeholder="Describe the investment purpose and expected impact." /></label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Document Upload</h4>
                <p className="mt-1 text-xs text-slate-500">Upload supporting documents and maintain a complete asset audit trail.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {([
                    ["invoice", "Upload Invoice"],
                    ["quotation", "Upload Quotation"],
                    ["warranty", "Upload Warranty Document"],
                    ["approval", "Upload Approval File"],
                    ["assetImage", "Upload Asset Image"],
                  ] as Array<[keyof InvestmentFormState["documents"], string]>).map(([key, label]) => (
                    <label key={key} className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      <span className="mb-2 inline-flex items-center gap-2 font-medium"><FileUp className="h-4 w-4 text-emerald-600" /> {label}</span>
                      <input type="file" multiple className="block w-full text-xs text-slate-600" onChange={(event) => handleInvestmentDocumentUpload(key, event)} />
                    </label>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Uploaded files</p>
                  {Object.values(investmentForm.documents).flat().length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No files uploaded yet.</p>
                  ) : (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {(Object.entries(investmentForm.documents) as Array<[keyof InvestmentFormState["documents"], string[]]>).map(([docType, files]) =>
                        files.map((fileName) => (
                          <div key={`${docType}-${fileName}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                            <span className="truncate pr-2 text-slate-700">{fileName}</span>
                            <button type="button" onClick={() => removeInvestmentDocument(docType, fileName)} className="text-rose-600 hover:text-rose-700">Remove</button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-base font-semibold text-slate-900">Approval and Status</h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block md:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Status</span><select value={investmentForm.status} onChange={(e) => handleInvestmentField("status", e.target.value as InvestmentStatus)} className={styledFinanceFieldClassName}>{investmentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Approval Date</span><input type="date" value={investmentForm.approvalDate} onChange={(e) => handleInvestmentField("approvalDate", e.target.value)} className={styledFinanceFieldClassName} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Approved By</span><input value={investmentForm.approvedBy} onChange={(e) => handleInvestmentField("approvedBy", e.target.value)} className={styledFinanceFieldClassName} placeholder="Approver name" /></label>
                    <label className="block md:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Remarks</span><textarea value={investmentForm.approvalRemarks} onChange={(e) => handleInvestmentField("approvalRemarks", e.target.value)} rows={2} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" placeholder="Approval remarks or rejection reason" /></label>
                  </div>
                  <button type="button" onClick={pushStatusTimeline} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><ShieldCheck className="h-4 w-4" /> Add to timeline</button>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline of status changes</p>
                    {investmentForm.statusTimeline.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">No timeline entries yet.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {investmentForm.statusTimeline.map((entry, index) => (
                          <div key={`${entry.status}-${entry.date}-${index}`} className="rounded-lg bg-white px-3 py-2 text-xs">
                            <p className="font-semibold text-slate-900">{entry.status}</p>
                            <p className="text-slate-500">{formatDate(entry.date)} • {entry.by}</p>
                            <p className="mt-1 text-slate-600">{entry.remarks}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-base font-semibold text-slate-900">Financial Tracking</h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Budgeted Amount</span><input type="number" min="0" step="0.01" value={investmentForm.budgetedAmount} onChange={(e) => handleInvestmentField("budgetedAmount", Number(e.target.value || 0))} className={styledFinanceFieldClassName} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Actual Purchase Amount</span><input type="number" min="0" step="0.01" value={investmentForm.actualPurchaseAmount} onChange={(e) => handleInvestmentField("actualPurchaseAmount", Number(e.target.value || 0))} className={styledFinanceFieldClassName} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Tax / GST</span><input type="number" min="0" step="0.01" value={investmentForm.taxGst} onChange={(e) => handleInvestmentField("taxGst", Number(e.target.value || 0))} className={styledFinanceFieldClassName} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Additional Charges</span><input type="number" min="0" step="0.01" value={investmentForm.additionalCharges} onChange={(e) => handleInvestmentField("additionalCharges", Number(e.target.value || 0))} className={styledFinanceFieldClassName} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Depreciation Start Date</span><input type="date" value={investmentForm.depreciationStartDate} onChange={(e) => handleInvestmentField("depreciationStartDate", e.target.value)} className={styledFinanceFieldClassName} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Accumulated Depreciation</span><input type="number" min="0" step="0.01" value={investmentForm.accumulatedDepreciation} onChange={(e) => handleInvestmentField("accumulatedDepreciation", Number(e.target.value || 0))} className={styledFinanceFieldClassName} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Current Book Value</span><input type="number" min="0" step="0.01" value={investmentForm.currentBookValue} onChange={(e) => handleInvestmentField("currentBookValue", Number(e.target.value || 0))} className={styledFinanceFieldClassName} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Residual Value</span><input type="number" min="0" step="0.01" value={investmentForm.residualValue} onChange={(e) => handleInvestmentField("residualValue", Number(e.target.value || 0))} className={styledFinanceFieldClassName} /></label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Maintenance and Lifecycle</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">AMC / Maintenance Contract</span><button type="button" role="switch" aria-checked={investmentForm.maintenanceContractEnabled} onClick={() => handleInvestmentField("maintenanceContractEnabled", !investmentForm.maintenanceContractEnabled)} className={`relative inline-flex h-9 w-20 items-center rounded-full px-1 transition ${investmentForm.maintenanceContractEnabled ? "bg-emerald-600" : "bg-slate-300"}`}><span className={`h-7 w-7 rounded-full bg-white shadow transition ${investmentForm.maintenanceContractEnabled ? "translate-x-11" : "translate-x-0"}`} /></button></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Next Service Date</span><input type="date" value={investmentForm.nextServiceDate} onChange={(e) => handleInvestmentField("nextServiceDate", e.target.value)} className={styledFinanceFieldClassName} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Maintenance Vendor</span><input value={investmentForm.maintenanceVendor} onChange={(e) => handleInvestmentField("maintenanceVendor", e.target.value)} className={styledFinanceFieldClassName} /></label>
                  <label className="block xl:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Service Notes</span><textarea rows={2} value={investmentForm.serviceNotes} onChange={(e) => handleInvestmentField("serviceNotes", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Disposal Date</span><input type="date" value={investmentForm.disposalDate} onChange={(e) => handleInvestmentField("disposalDate", e.target.value)} className={styledFinanceFieldClassName} /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Disposal Value</span><input type="number" min="0" step="0.01" value={investmentForm.disposalValue} onChange={(e) => handleInvestmentField("disposalValue", Number(e.target.value || 0))} className={styledFinanceFieldClassName} /></label>
                  <label className="block xl:col-span-3"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Transfer History</span><textarea rows={2} value={investmentForm.transferHistory} onChange={(e) => handleInvestmentField("transferHistory", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" placeholder="If transferred between branch/department, capture date and details." /></label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-slate-900">Asset Register Table</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={investmentSearch} onChange={(e) => setInvestmentSearch(e.target.value)} placeholder="Search by asset, title, branch, vendor" className="h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm" /></div>
                    <select value={investmentCategoryFilter} onChange={(e) => setInvestmentCategoryFilter(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="all">All Categories</option>{investmentCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                    <select value={investmentStatusFilter} onChange={(e) => setInvestmentStatusFilter(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="all">All Status</option>{investmentStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                    <select value={investmentSortBy} onChange={(e) => setInvestmentSortBy(e.target.value as "newest" | "oldest" | "amount-high" | "amount-low")} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option><option value="amount-high">Sort: Amount High-Low</option><option value="amount-low">Sort: Amount Low-High</option></select>
                  </div>
                </div>

                {filteredInvestmentRecords.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    No investment records found. Add a new investment to populate the asset register.
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="border border-slate-200 px-3 py-2">Asset ID</th>
                          <th className="border border-slate-200 px-3 py-2">Investment Title</th>
                          <th className="border border-slate-200 px-3 py-2">Category</th>
                          <th className="border border-slate-200 px-3 py-2">Branch</th>
                          <th className="border border-slate-200 px-3 py-2">Purchase Date</th>
                          <th className="border border-slate-200 px-3 py-2">Vendor</th>
                          <th className="border border-slate-200 px-3 py-2 text-right">Total Amount</th>
                          <th className="border border-slate-200 px-3 py-2">Status</th>
                          <th className="border border-slate-200 px-3 py-2">Location</th>
                          <th className="border border-slate-200 px-3 py-2 text-right">Book Value</th>
                          <th className="border border-slate-200 px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvestmentRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-slate-50">
                            <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800">{record.assetId}</td>
                            <td className="border border-slate-200 px-3 py-2">{record.investmentTitle}</td>
                            <td className="border border-slate-200 px-3 py-2">{record.investmentCategory}</td>
                            <td className="border border-slate-200 px-3 py-2">{record.branch}</td>
                            <td className="border border-slate-200 px-3 py-2">{formatDate(record.purchaseDate)}</td>
                            <td className="border border-slate-200 px-3 py-2">{record.vendor}</td>
                            <td className="border border-slate-200 px-3 py-2 text-right font-semibold">{formatCurrency(record.totalAmount)}</td>
                            <td className="border border-slate-200 px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{record.status}</span></td>
                            <td className="border border-slate-200 px-3 py-2">{record.location || "-"}</td>
                            <td className="border border-slate-200 px-3 py-2 text-right font-semibold">{formatCurrency(record.currentBookValue)}</td>
                            <td className="border border-slate-200 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setInvestmentForm({ ...record })} className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Edit</button>
                                <button type="button" onClick={() => setInvestmentRecords((current) => current.filter((item) => item.id !== record.id))} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Reports Section</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-900">Category-wise investment report</p><p className="mt-2 text-slate-600">{investmentOverview.categorySummary.filter((item) => item.value > 0).length || 0} categories with active investments.</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-900">Year-wise investment report</p><p className="mt-2 text-slate-600">{investmentReportSummary.yearWise.length} academic year buckets.</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-900">Funding source report</p><p className="mt-2 text-slate-600">{investmentReportSummary.fundingWise.length} funding channels tracked.</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-900">Depreciation report</p><p className="mt-2 text-slate-600">Accumulated depreciation: {formatCurrency(investmentReportSummary.depreciationTotal)}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-900">Asset disposal report</p><p className="mt-2 text-slate-600">Disposed asset value: {formatCurrency(investmentReportSummary.disposedTotal)}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-900">Budget vs actual report</p><p className="mt-2 text-slate-600">Variance: {formatCurrency(investmentOverview.actualTotal - investmentOverview.budgetTotal)}</p></div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="sticky top-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Sticky Summary Panel</h4>
                <p className="mt-1 text-xs text-slate-500">Quick view of current form totals and lifecycle indicators.</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-600">Total Amount</span><span className="font-semibold text-slate-900">{formatCurrency(investmentForm.totalAmount)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Actual + Charges</span><span className="font-semibold text-slate-900">{formatCurrency(Number(investmentForm.actualPurchaseAmount || 0) + Number(investmentForm.taxGst || 0) + Number(investmentForm.additionalCharges || 0))}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Book Value</span><span className="font-semibold text-emerald-700">{formatCurrency(investmentForm.currentBookValue)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Status</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{investmentForm.status}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Warranty Expiry</span><span className="font-semibold text-slate-900">{investmentForm.warrantyExpiryDate ? formatDate(investmentForm.warrantyExpiryDate) : "-"}</span></div>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  <p>All monetary values are shown in INR.</p>
                  <p className="mt-1">Keep status and service dates updated to improve warranty and maintenance tracking.</p>
                </div>

                <div className="mt-4 grid gap-2">
                  <button type="button" onClick={submitInvestmentRecord} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Save Investment Record</button>
                  <button type="button" onClick={() => { setInvestmentForm(makeDefaultInvestmentForm()); setInvestmentSubmitAttempted(false); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Reset Form</button>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Wrench className="h-4 w-4" /> Maintenance Pulse</p>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p>Assets under maintenance: <span className="font-semibold text-amber-700">{investmentOverview.underMaintenance}</span></p>
                    <p>Warranty alerts (60 days): <span className="font-semibold text-rose-700">{investmentOverview.expiringWarranty}</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {(activeFinanceAction === "expense" || activeFinanceAction === "banking" || activeFinanceAction === "asset") && (
        <section id="finance-phase-placeholder" className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#fff7ed_100%)] p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <div>
              <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {activeFinanceAction === "expense" && "Expense area"}
                {activeFinanceAction === "banking" && "Banking area"}
                {activeFinanceAction === "asset" && "Asset area"}
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-slate-900">
                {activeFinanceAction === "expense" && "Expense tracking is queued for the next phase."}
                {activeFinanceAction === "banking" && "Banking details will be built in the next phase."}
                {activeFinanceAction === "asset" && "Asset register and lifecycle management will be built in the next phase."}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Phase 1 establishes the redesigned finance entry points. This placeholder confirms the new navigation is in place, while Expense, Banking, and Asset workflows are still being implemented.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planned next</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Create a dedicated form and table for outgoing transactions.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Add account metadata, reference numbers, and banking summaries.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Track investment inflows and allocations with period-wise analytics.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Maintain an asset register with purchase value, depreciation, and status.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Connect the new screens to backend endpoints once those APIs are finalized.</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!isStudent && activeFinanceAction === "investor-ledger" && (
        <section id="finance-investor-ledger-section" className="rounded-[28px] border border-cyan-200 bg-white p-6 shadow-sm">
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Create Investor Account</h3>
              <p className="mt-1 text-sm text-slate-500">Add investor or trustee profile and optional initial investment.</p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Name</label>
                  <input
                    value={investorAccountForm.investorName}
                    onChange={(e) => setInvestorAccountForm((prev) => ({ ...prev, investorName: e.target.value }))}
                    placeholder="e.g., Mr. Arjun Shah"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Type</label>
                  <select
                    value={investorAccountForm.investorType}
                    onChange={(e) => setInvestorAccountForm((prev) => ({ ...prev, investorType: e.target.value as "investor" | "trustee" | "other" }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="investor">Investor</option>
                    <option value="trustee">Trustee</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Contact</label>
                  <input
                    value={investorAccountForm.contact}
                    onChange={(e) => setInvestorAccountForm((prev) => ({ ...prev, contact: e.target.value }))}
                    placeholder="Phone or email"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Initial Investment</label>
                  <input
                    type="number"
                    min="0"
                    value={investorAccountForm.initialInvestment}
                    onChange={(e) => setInvestorAccountForm((prev) => ({ ...prev, initialInvestment: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</label>
                  <textarea
                    value={investorAccountForm.description}
                    onChange={(e) => setInvestorAccountForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Agreement or terms"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void submitInvestorAccountForm()}
                  disabled={savingInvestorAccount}
                  className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-70"
                >
                  {savingInvestorAccount ? "Saving Account..." : "Create Investor Account"}
                </button>
              </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Add Ledger Transaction</h3>
                <p className="mt-1 text-sm text-slate-500">Record new investment inflow or repayment outflow with date.</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Investor Account</label>
                    <select
                      value={investorTxForm.investorId}
                      onChange={(e) => setInvestorTxForm((prev) => ({ ...prev, investorId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select investor</option>
                      {investorAccounts.map((account) => (
                        <option key={account._id} value={account._id}>{account.investorName} ({account.investorType})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Transaction Type</label>
                    <select
                      value={investorTxForm.type}
                      onChange={(e) => setInvestorTxForm((prev) => ({ ...prev, type: e.target.value as "investment" | "repayment" }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="investment">Investment Received</option>
                      <option value="repayment">Repayment Given Back</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</label>
                    <input
                      type="number"
                      min="0"
                      value={investorTxForm.amount}
                      onChange={(e) => setInvestorTxForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Date</label>
                    <input
                      type="date"
                      value={investorTxForm.date}
                      onChange={(e) => setInvestorTxForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Note</label>
                    <textarea
                      value={investorTxForm.note}
                      onChange={(e) => setInvestorTxForm((prev) => ({ ...prev, note: e.target.value }))}
                      rows={3}
                      placeholder="Optional reference"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void submitInvestorTransaction()}
                    disabled={savingInvestorTransaction}
                    className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-70"
                  >
                    {savingInvestorTransaction ? "Saving Transaction..." : "Save Transaction"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Investor Payback Ledger</h3>
              <p className="mt-1 text-sm text-slate-500">Outstanding balance is computed as Total Invested minus Total Repaid.</p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600">Transaction Range</span>
                  <select
                    value={investorLedgerRange}
                    onChange={(e) => setInvestorLedgerRange(e.target.value as "all" | "month" | "quarter")}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="month">Last 30 days</option>
                    <option value="quarter">Last 90 days</option>
                  </select>
                </div>
                <div className="text-xs font-semibold text-rose-700">
                  Overdue alerts: {
                    investorAccounts.filter((account) => account.balanceToRepay > 0 && getInvestorOverdueDays(account) > 45).length
                  }
                </div>
              </div>

              {investorAccounts.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  No investor accounts created yet.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {investorAccounts.map((account) => (
                    <div
                      key={account._id}
                      className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm transition-all duration-500"
                      style={
                        removingInvestorId === account._id
                          ? {
                              transform: "perspective(1000px) rotateY(88deg) translateX(18px)",
                              transformOrigin: "right center",
                              opacity: 0,
                            }
                          : undefined
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">{account.investorName}</h4>
                          <p className="text-xs text-slate-500">{account.investorType.toUpperCase()} • {account.contact || "No contact"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.balanceToRepay > 0 && getInvestorOverdueDays(account) > 45 && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-800">
                              Overdue {getInvestorOverdueDays(account)}d
                            </span>
                          )}
                          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-800">{account.status || "Active"}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => downloadInvestorStatement(account)}
                          className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                        >
                          <Download className="h-3.5 w-3.5" /> Download Statement
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 text-sm">
                        <div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Total Invested</p><p className="font-semibold text-slate-900">{formatCurrency(account.totalInvested)}</p></div>
                        <div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Total Repaid</p><p className="font-semibold text-emerald-700">{formatCurrency(account.totalRepaid)}</p></div>
                        <div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">Balance To Repay</p><p className="font-semibold text-rose-700">{formatCurrency(account.balanceToRepay)}</p></div>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Transactions</p>
                        {getFilteredInvestorTransactions(account.transactions || []).length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">No transactions yet.</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {getFilteredInvestorTransactions(account.transactions || []).slice(0, 5).map((tx) => (
                              <div key={tx._id || `${tx.type}-${tx.date}-${tx.amount}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                                <div>
                                  <p className="font-semibold text-slate-800">{tx.type === "investment" ? "Investment" : "Repayment"}</p>
                                  <p className="text-slate-500">{formatDate(tx.date)}{tx.note ? ` • ${tx.note}` : ""}</p>
                                </div>
                                <p className={`font-semibold ${tx.type === "investment" ? "text-blue-700" : "text-emerald-700"}`}>{formatCurrency(tx.amount)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setPendingRemoveInvestor(account)}
                          className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {pendingRemoveInvestor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !deletingInvestor && setPendingRemoveInvestor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-5">
              <h3 className="text-lg font-semibold text-rose-700">Warning: Remove Investor Account</h3>
              <p className="mt-2 text-sm text-slate-600">
                You are about to remove <span className="font-semibold text-slate-900">{pendingRemoveInvestor.investorName}</span>.
                This will permanently delete all linked investment and repayment ledger entries.
              </p>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deletingInvestor}
                onClick={() => setPendingRemoveInvestor(null)}
                className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingInvestor}
                onClick={() => void removeInvestorAccount()}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700 disabled:opacity-70"
              >
                {deletingInvestor ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {infoMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{infoMessage}</div>}

      {isStudent && activeFinanceAction === "fee-structure" && (
        <div id="finance-fee-structure-section" className="rounded-3xl border border-teal-100 bg-[linear-gradient(140deg,#f0fdfa_0%,#ffffff_42%,#f8fafc_100%)] p-4 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Set Fee By Class</h3>
              <p className="mt-1 text-sm text-slate-600">Configure the class fee structure, due date, late fee rules, and additional custom charges.</p>
            </div>
            {activeClassStructure && (
              <button
                type="button"
                onClick={downloadSelectedFeeStructure}
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2 text-xs font-semibold text-teal-700 shadow-sm hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <Download className="h-4 w-4" /> Download Current Structure
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Plan Details</h4>
                <p className="mt-1 text-xs text-slate-500">Choose the target class, academic cycle, and fee due date.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Class</span>
                    <Select
                      inputId="class-fee-class"
                      value={classStructureOptions.find((option) => option.classId === classFeeStructureForm.classId) || null}
                      onChange={handleClassFeeStructureSelect}
                      options={classStructureOptions}
                      placeholder="Select class"
                      isClearable
                      isSearchable
                      className="basic-class-select"
                      classNamePrefix="finance-class-select"
                      styles={classSelectStyles}
                    />
                    {attemptedClassFeeSave && !formValidation.classSelected && (
                      <span className="mt-1 block text-xs text-rose-600">Please select a class.</span>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Academic Year</span>
                    <select
                      value={classFeeStructureForm.academicYear}
                      onChange={(e) => setClassFeeStructureForm((current) => ({ ...current, academicYear: e.target.value }))}
                      className={styledFinanceFieldClassName}
                    >
                      <option value="">Select academic year</option>
                      {financialYearOptions.map((yearOption) => (
                        <option key={`plan-year-${yearOption}`} value={yearOption}>{yearOption}</option>
                      ))}
                    </select>
                    {attemptedClassFeeSave && !formValidation.academicYear && (
                      <span className="mt-1 block text-xs text-rose-600">Please choose the academic year.</span>
                    )}
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CalendarDays className="h-4 w-4 text-teal-600" /> Due Date
                    </span>
                    <input
                      id="class-fee-due-date"
                      type="date"
                      value={classFeeStructureForm.dueDate}
                      onChange={(e) => setClassFeeStructureForm((current) => ({ ...current, dueDate: e.target.value }))}
                      className={styledFinanceFieldClassName}
                    />
                    <span className="mt-1 block text-xs text-slate-500">Students must pay before this date to avoid late charges.</span>
                    {attemptedClassFeeSave && !formValidation.dueDate && (
                      <span className="mt-1 block text-xs text-rose-600">Due date is required.</span>
                    )}
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Fee Details</h4>
                <p className="mt-1 text-xs text-slate-500">Define the common class fee components in Indian Rupees.</p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Academic Fee</span>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={classFeeStructureForm.amount}
                        onChange={(e) => setClassFeeStructureForm((current) => ({ ...current, amount: e.target.value }))}
                        className={`${styledFinanceFieldClassName} pl-10`}
                        placeholder="0.00"
                      />
                    </div>
                    <span className="mt-1 block text-xs text-slate-500">Base fee applied to all students in this class.</span>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Transport Fee</span>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={classFeeStructureForm.transportFee}
                        onChange={(e) => setClassFeeStructureForm((current) => ({ ...current, transportFee: e.target.value }))}
                        className={`${styledFinanceFieldClassName} pl-10`}
                        placeholder="0.00"
                      />
                    </div>
                    <span className="mt-1 block text-xs text-slate-500">Applied only to students using school transport.</span>
                  </label>

                </div>
                {attemptedClassFeeSave && !formValidation.hasFeeAmount && (
                  <p className="mt-3 text-xs text-rose-600">Enter at least one fee amount to continue.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">Late Fee Charge</h4>
                    <p className="mt-1 text-xs text-slate-500">Late fee is automatically applied after the due date.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={classFeeStructureForm.enableLateFee}
                    onClick={() => setClassFeeStructureForm((current) => ({ ...current, enableLateFee: !current.enableLateFee }))}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full px-1 transition ${classFeeStructureForm.enableLateFee ? "bg-teal-600" : "bg-slate-300"}`}
                  >
                    <span className="sr-only">Enable Late Fee</span>
                    <span className={`absolute left-1 h-6 w-6 rounded-full bg-white shadow transition ${classFeeStructureForm.enableLateFee ? "translate-x-8" : "translate-x-0"}`} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-white">{classFeeStructureForm.enableLateFee ? "On" : "Off"}</span>
                  </button>
                </div>

                {classFeeStructureForm.enableLateFee && (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Late Fee Type</span>
                      <select
                        value={classFeeStructureForm.lateFeeType}
                        onChange={(e) => setClassFeeStructureForm((current) => ({ ...current, lateFeeType: e.target.value as "fixed" | "per_day" | "percentage" }))}
                        className={styledFinanceFieldClassName}
                      >
                        <option value="fixed">Fixed Amount</option>
                        <option value="per_day">Per Day</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Late Fee Value</span>
                      <div className="relative">
                        {classFeeStructureForm.lateFeeType === "percentage" ? (
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">%</span>
                        ) : (
                          <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        )}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={classFeeStructureForm.lateFeeValue}
                          onChange={(e) => setClassFeeStructureForm((current) => ({ ...current, lateFeeValue: e.target.value }))}
                          className={`${styledFinanceFieldClassName} ${classFeeStructureForm.lateFeeType === "percentage" ? "pl-8" : "pl-10"}`}
                          placeholder="0"
                        />
                      </div>
                      {attemptedClassFeeSave && !formValidation.lateFeeValue && (
                        <span className="mt-1 block text-xs text-rose-600">Late fee value must be greater than 0.</span>
                      )}
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Grace Period (days)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={classFeeStructureForm.gracePeriodDays}
                        onChange={(e) => setClassFeeStructureForm((current) => ({ ...current, gracePeriodDays: e.target.value }))}
                        className={styledFinanceFieldClassName}
                        placeholder="0"
                      />
                      {attemptedClassFeeSave && !formValidation.gracePeriodDays && (
                        <span className="mt-1 block text-xs text-rose-600">Grace period cannot be negative.</span>
                      )}
                    </label>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-xs text-teal-800">
                  <span className="inline-flex items-center gap-1 font-semibold"><Info className="h-3.5 w-3.5" /> Example</span>
                  <p className="mt-1">If due date is 10 June and grace period is 3 days, late fee starts from 14 June.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">Additional Charges</h4>
                    <p className="mt-1 text-xs text-slate-500">Add optional class-level fees such as Library Fee, Lab Fee, Exam Fee, or Activity Fee.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClassFeeStructureForm((current) => ({ ...current, feeBreakdown: [...current.feeBreakdown, makeAdditionalChargeRow()] }))}
                    className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                  >
                    <CirclePlus className="h-4 w-4" /> Add Charge
                  </button>
                </div>

                {classFeeStructureForm.feeBreakdown.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center text-sm text-slate-500">
                    No additional charges added yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {classFeeStructureForm.feeBreakdown.map((item, index) => (
                      <div key={`charge-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Charge Name</span>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => setClassFeeStructureForm((current) => ({
                              ...current,
                              feeBreakdown: current.feeBreakdown.map((row, rowIndex) => (rowIndex === index ? { ...row, label: e.target.value } : row)),
                            }))}
                            placeholder="e.g., Library Fee"
                            className={styledFinanceFieldClassName}
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</span>
                          <div className="relative">
                            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => setClassFeeStructureForm((current) => ({
                                ...current,
                                feeBreakdown: current.feeBreakdown.map((row, rowIndex) => (rowIndex === index ? { ...row, amount: e.target.value } : row)),
                              }))}
                              placeholder="0.00"
                              className={`${styledFinanceFieldClassName} pl-10`}
                            />
                          </div>
                        </label>

                        <button
                          type="button"
                          onClick={() => setClassFeeStructureForm((current) => ({ ...current, feeBreakdown: current.feeBreakdown.filter((_, rowIndex) => rowIndex !== index) }))}
                          className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          aria-label={`Remove additional charge ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Summary Panel</h4>
                <p className="mt-1 text-xs text-slate-500">Live fee summary with rule preview and total impact.</p>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-600">Academic Fee</span><span className="font-semibold text-slate-900">{formatCurrency(normalizedAcademicFee)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Transport Fee</span><span className="font-semibold text-slate-900">{formatCurrency(normalizedTransportFee)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-600">Additional Charges Total</span><span className="font-semibold text-slate-900">{formatCurrency(normalizedBreakdownTotal)}</span></div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">Late Fee Rule Preview</p>
                    <p className="mt-1">{lateFeeRulePreview}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                    <span className="font-semibold text-slate-900">Grand Total</span>
                    <span className="text-lg font-bold text-teal-700">{formatCurrency(liveGrandTotal)}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-900">
                  <p>Transport fee applies only to selected students.</p>
                  <p className="mt-1">Late fee is charged only after due date based on configured rules.</p>
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => void submitClassFeeStructure()}
                    disabled={savingClassFeeStructure}
                    className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-60"
                  >
                    {savingClassFeeStructure ? "Saving..." : "Save Common Fee Structure"}
                  </button>

                  <button
                    type="button"
                    onClick={saveClassStructureDraft}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    onClick={previewClassFeeStructure}
                    className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  >
                    Preview Fee Structure
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Saved Class Structures</h4>
                <p className="mt-1 text-xs text-slate-500">Load any saved class structure card for quick edits.</p>
                <div className="mt-3 max-h-[310px] space-y-3 overflow-y-auto pr-1">
                  {classFeeStructures.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center text-sm text-slate-500">
                      No common class fee structure saved yet.
                    </div>
                  ) : (
                    sortedClassFeeStructures.map((structure) => {
                      const structureLabel = getClassLabelFromRecord(structure);
                      const totalAmount = Number(structure.amount || 0) + Number(structure.transportFee || 0) + Number(structure.otherFee || 0);
                      return (
                        <div key={String(structure._id || `${structure.classId || structureLabel}-${structure.academicYear || ""}`)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <button type="button" onClick={() => selectClassFeeStructure(structureLabel, undefined, structure)} className="w-full text-left">
                            <p className="font-semibold text-slate-900">{getStructureDisplayName(structure)}</p>
                            <p className="mt-1 text-xs text-slate-500">{structureLabel || "Unknown Class"} • {structure.academicYear || "-"}</p>
                            <p className="mt-2 text-sm font-semibold text-slate-800">Total: {formatCurrency(totalAmount)}</p>
                          </button>
                          <div className="mt-2 flex justify-end">
                            <button type="button" onClick={() => deleteClassFeeStructure(String(structure._id || ""), structureLabel)} className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-900">Saved Drafts ({classStructureDrafts.length})</h4>
                {classStructureDrafts.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">No drafts saved yet.</p>
                ) : (
                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {classStructureDrafts.map((draft) => (
                      <div key={draft.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-900">{draft.title}</p>
                        <p className="text-[11px] text-slate-500">Saved {new Date(draft.updatedAt).toLocaleString()}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" onClick={() => loadClassStructureDraft(draft.id)} className="rounded-md border border-teal-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50">Load</button>
                          <button type="button" onClick={() => deleteClassStructureDraft(draft.id)} className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isStudent && activeFinanceAction === "record-payment" && (
        <div id="finance-record-payment-section" className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Record Student Payments</h3>
              <p className="text-sm text-slate-500 mt-1">After setting the common class fee structure, select a class and record payments for individual students.</p>
            </div>
            <button
              onClick={() => void fetchData()}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="p-6 space-y-5">
            {classSelectOptions.length === 0 && !loading && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠️ No classes found. Try refreshing or check if student data exists.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Select Class{classSelectOptions.length > 0 && ` (${classSelectOptions.length} available)`}</span>
                <Select
                  value={classSelectOptions.find((option) => option.value === selectedFeeClass) || null}
                  onChange={handleStudentClassSelect}
                  options={classSelectOptions}
                  placeholder="Choose class"
                  isClearable
                  isSearchable
                  className="basic-class-select"
                  classNamePrefix="finance-class-select"
                  styles={classSelectStyles}
                />
              </label>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Students in selected class: <span className="font-semibold text-slate-900">{selectedClassStudents.length}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Action: <span className="font-semibold text-slate-900">Use common fee structure, then record payment</span>
              </div>
            </div>

            {selectedFeeClass && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Class Total Amount</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(selectedClassTotalAmount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Total Payment Paid</p>
                    <p className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(selectedClassPaidAmount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Remaining Amount</p>
                    <p className="mt-2 text-xl font-bold text-rose-700">{formatCurrency(selectedClassRemainingAmount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Paid Students</p>
                    <p className="mt-2 text-xl font-bold text-emerald-700">{selectedClassPaidStudentsCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Due Students</p>
                    <p className="mt-2 text-xl font-bold text-amber-600">{selectedClassDueStudentsCount}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-4 items-end">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Search Student</span>
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      placeholder="Search by roll no or name"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Search results: <span className="font-semibold text-slate-900">{filteredSelectedClassStudents.length}</span>
                  </div>
                </div>
              </>
            )}

            {!selectedFeeClass ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                <Illustration className="mx-auto h-28 w-36" />
                <p className="mt-4">Select a class to display the student list for fee payment.</p>
              </div>
            ) : selectedClassStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                <Illustration className="mx-auto h-28 w-36" />
                <p className="mt-4">No students found for the selected class.</p>
              </div>
            ) : filteredSelectedClassStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                <Illustration className="mx-auto h-28 w-36" />
                <p className="mt-4">No student matched that roll number or name.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left">Roll No</th>
                      <th className="p-3 text-left">Student Name</th>
                      <th className="p-3 text-left">Class</th>
                      <th className="p-3 text-left">Total Fee</th>
                      <th className="p-3 text-left">Paid</th>
                      <th className="p-3 text-left">Pending</th>
                      <th className="p-3 text-left">Due Date</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSelectedClassStudents.map((summary) => {
                      const student = getStudentFromSummary(summary);
                      const hasAssignment = Boolean(summary.financeId);
                      const rowTotalFee = getEffectiveSummaryTotal(summary);
                      const rowPending = getEffectiveSummaryPending(summary);
                      const rowDueDate = getDisplayDueDate(summary) || activeClassStructure?.dueDate || null;
                      return (
                        <tr key={student?._id || summary.financeId || summary.totalFee} className="border-t border-slate-200">
                          <td className="p-3 text-slate-600">{student?.rollNumber || "-"}</td>
                          <td className="p-3 font-medium text-slate-900">{student?.name || "-"}</td>
                          <td className="p-3 text-slate-600">{student?.class || "-"}</td>
                          <td className="p-3">{formatCurrency(rowTotalFee)}</td>
                          <td className="p-3 text-emerald-700">{formatCurrency(summary.paidAmount)}</td>
                          <td className="p-3 text-rose-700">{formatCurrency(rowPending)}</td>
                          <td className="p-3">{formatDate(rowDueDate)}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => void openFeeForm(summary)}
                                className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${hasAssignment ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"}`}
                              >
                                {hasAssignment ? "Record Payment" : "Assign & Record"}
                              </button>
                              {isOverdue(rowDueDate) && summary.status !== "paid" && hasAssignment && (
                                <button
                                  onClick={() => openLateFeeForm(summary)}
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                                  title="Add late fee charge for overdue payment"
                                >
                                  Add Late Fee
                                </button>
                              )}
                              <button
                                onClick={() => void printAllReceiptsForStudent(summary)}
                                disabled={!hasAssignment}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Print Receipts
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedFeeClass && filteredSelectedClassStudents.length > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-600">
                  Showing <span className="font-semibold text-slate-900">{studentRecordsStart}-{studentRecordsEnd}</span> of <span className="font-semibold text-slate-900">{filteredSelectedClassStudents.length}</span> students
                </p>
                <Pagination
                  page={safeStudentRecordsPage}
                  count={totalStudentRecordPages}
                  color="primary"
                  onChange={(_, page) => setStudentRecordsPage(page)}
                  showFirstButton
                  showLastButton
                  siblingCount={0}
                />
              </div>
            )}

            {selectedFeeClass && (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Student Fee Record History</span>
                  <select
                    value={selectedHistoryStudentId}
                    onChange={(event) => setSelectedHistoryStudentId(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">Select student to view history</option>
                    {selectedClassStudents
                      .slice()
                      .sort((left, right) => (getStudentFromSummary(left)?.name || "").localeCompare(getStudentFromSummary(right)?.name || "", undefined, { sensitivity: "base" }))
                      .map((summary) => {
                        const student = getStudentFromSummary(summary);
                        if (!student?._id) return null;

                        return (
                          <option key={student._id} value={student._id}>
                            {student.name} {student.rollNumber ? `(${student.rollNumber})` : ""}
                          </option>
                        );
                      })}
                  </select>
                </label>
                <button
                  onClick={() => void openSelectedStudentHistory()}
                  disabled={!selectedHistoryStudentId}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  View Fee Record History
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isStudent && activeFinanceAction === "salary" && salaryForm && (
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{salaryForm.mode === "pay" ? "Pay Salary" : "Set Salary"} for {salaryForm.staffName}</h3>
            <button onClick={() => setSalaryForm(null)} className="text-sm text-gray-500">Close</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="number" min="0" placeholder="Salary Amount" className="border rounded p-2" value={salaryForm.amount} onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })} />
            <input type="number" min="0" placeholder="Paid Amount" className="border rounded p-2" value={salaryForm.paidAmount} onChange={(e) => setSalaryForm({ ...salaryForm, paidAmount: e.target.value })} />
            <input type="date" className="border rounded p-2" value={salaryForm.paymentDate} onChange={(e) => setSalaryForm({ ...salaryForm, paymentDate: e.target.value })} />
            <input type="text" placeholder="Academic Year" className="border rounded p-2" value={salaryForm.academicYear} onChange={(e) => setSalaryForm({ ...salaryForm, academicYear: e.target.value })} />
          </div>

          <textarea placeholder="Description" className="border rounded p-2 w-full" rows={3} value={salaryForm.description} onChange={(e) => setSalaryForm({ ...salaryForm, description: e.target.value })} />

          <div className="flex gap-2">
            <button onClick={submitSalaryForm} disabled={savingSalary} className="bg-blue-600 text-white px-4 py-2 rounded">
              {savingSalary ? "Saving..." : salaryForm.mode === "pay" ? "Pay Salary" : "Save Salary"}
            </button>
            <button onClick={() => setSalaryForm(null)} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-6 bg-white rounded-xl shadow text-center">Loading finance summary...</div>
      ) : error ? (
        <div className="p-6 bg-red-50 rounded-xl shadow text-center text-red-600">Error loading data: {error}</div>
      ) : (
        <>
          <div id={!isStudent && activeFinanceAction === "salary" ? "finance-salary-section" : undefined} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {!isStudent && activeFinanceAction === "salary" ? <>
              <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:h-fit">
                  <h4 className="text-sm font-semibold text-slate-900">Filter Department</h4>
                  <p className="mt-1 text-xs text-slate-500">Select a department to filter salary cards.</p>
                  <select
                    value={selectedSalaryDepartment}
                    onChange={(event) => setSelectedSalaryDepartment(event.target.value)}
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {salaryDepartmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department === "all" ? "All Departments" : department}
                      </option>
                    ))}
                  </select>
                  <p className="mt-3 text-xs text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{salaryStaffCount}</span> staff member(s)
                  </p>
                </aside>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Total Salary</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(salaryTotalAmount)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Paid</p>
                      <p className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(salaryPaidAmount)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Balance To Pay</p>
                      <p className="mt-2 text-xl font-bold text-rose-700">{formatCurrency(salaryBalanceAmount)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Staff Count Summary</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">Total: {salaryStaffCount}</p>
                      <p className="mt-1 text-xs text-emerald-700">Paid: {salaryPaidCount}</p>
                      <p className="mt-1 text-xs text-amber-700">Partial: {salaryPartialCount}</p>
                      <p className="mt-1 text-xs text-rose-700">Pending/Overdue: {salaryPendingCount}</p>
                    </div>
                  </div>

                  {filteredSalarySummaries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                      No staff found for the selected department.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {filteredSalarySummaries.map((item, index) => {
                        const summary = item as StaffSalarySummary;
                        const staff = getStaffFromSalarySummary(summary);
                        const name = staff?.name || "No Name";
                        const position = staff?.position || "-";
                        const department = getSalaryDepartment(summary);
                        const contact = String(staff?.phone || staff?.email || "Not available");
                        const avatarUrl = String(staff?.avatar || staff?.image || staff?.photo || "").trim();
                        const dueValue = Math.max(Number(summary.salary || 0) - Number(summary.paidAmount || 0), 0);

                        return (
                          <div key={summary.financeId || `${name}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={name} className="h-14 w-14 rounded-full border border-slate-200 object-cover" />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-700">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h3 className="truncate font-semibold text-slate-900">{name}</h3>
                                <p className="truncate text-xs text-slate-600">{position}</p>
                                <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{department}</p>
                              </div>
                            </div>

                            <div className="mt-3 space-y-1 text-sm">
                              <p className="text-slate-600">Contact: <span className="font-medium text-slate-900">{contact}</span></p>
                              <p className="text-slate-600">Total: <span className="font-semibold text-slate-900">{formatCurrency(summary.salary)}</span></p>
                              <p className="text-slate-600">Paid: <span className="font-semibold text-emerald-700">{formatCurrency(summary.paidAmount)}</span></p>
                              <p className="text-slate-600">Balance: <span className="font-semibold text-rose-700">{formatCurrency(dueValue)}</span></p>
                              <p className="text-xs text-slate-500">Payment Date: {formatDate(summary.paymentDate)}</p>
                            </div>

                            <div className={`mt-2 text-xs px-2 py-1 rounded w-fit ${getStatusBadgeClass(summary.status)}`}>{summary.status.toUpperCase()}</div>

                            <div className="mt-3 space-y-2">
                              <button onClick={() => openSalaryForm(summary, "set")} className="w-full rounded bg-blue-600 py-1 text-white">Set Salary</button>
                              <button onClick={() => openSalaryForm(summary, "pay")} className="w-full rounded bg-green-600 py-1 text-white">Pay Salary</button>
                              <button onClick={() => printSalarySlip(summary)} className="w-full rounded bg-slate-700 py-1 text-white flex justify-center items-center gap-1 text-sm"><Printer className="w-4 h-4" /> Print Salary Slip</button>
                              <button onClick={() => openSalaryReport(summary)} className="w-full rounded bg-amber-600 py-1 text-white flex justify-center gap-1"><FileText className="w-4 h-4" /> Report</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </> : null}
          </div>
        </>
      )}

      {(summaryLoading || selectedFeeSummary) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !summaryLoading && setSelectedFeeSummary(null)}>
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {summaryLoading || !selectedFeeSummary ? (
              <div className="p-8 text-center text-slate-600">Loading fee summary...</div>
            ) : (
              <>
                <div className="border-b px-6 py-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Student Fee Summary and Receipt</h3>
                    <p className="text-sm text-slate-500 mt-1">{getStudentFromSummary(selectedFeeSummary)?.name || "Student"} finance summary with latest receipt activity.</p>
                  </div>
                  <button onClick={() => setSelectedFeeSummary(null)} className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Close</button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">Recent Payments</h4>
                        <p className="mt-1 text-sm text-slate-500">Latest fee receipts for this student, ordered from newest to oldest.</p>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(String(selectedFeeSummary.paymentStatus || selectedFeeSummary.status))}`}>
                        {String(selectedFeeSummary.paymentStatus || selectedFeeSummary.status).toUpperCase()}
                      </div>
                    </div>

                    {getRecentPayments(selectedFeeSummary).length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {getRecentPayments(selectedFeeSummary).map((payment) => (
                          <div key={`${payment.receiptNumber}-${payment.transactionId}`} className="rounded-xl bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{payment.receiptNumber}</p>
                                <p className="mt-1 text-sm text-slate-500">Transaction ID: {payment.transactionId}</p>
                              </div>
                              <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-3 md:text-right">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">Payment Date</p>
                                  <p className="mt-1 font-semibold text-slate-900">{formatDate(payment.paymentDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">Amount</p>
                                  <p className="mt-1 font-semibold text-emerald-700">{formatCurrency(payment.amountPaid)}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">Payment Type</p>
                                  <p className="mt-1 font-semibold text-slate-900">{String(payment.paymentType || "cash").toUpperCase()}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                                  <p className="mt-1 font-semibold text-slate-900">{payment.sentToEmail ? "Sent" : "Not sent"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">No payment has been recorded yet for this student.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <h4 className="font-semibold text-slate-900">Current Fee Details</h4>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex items-center justify-between"><span className="text-slate-500">Total Fee Amount</span><span className="font-semibold">{formatCurrency(selectedFeeSummary.totalFee)}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Amount Paid</span><span className="font-semibold text-emerald-700">{formatCurrency(selectedFeeSummary.paidAmount)}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Pending Balance</span><span className="font-semibold text-rose-700">{formatCurrency(selectedFeeSummary.pendingBalance ?? selectedFeeSummary.remainingAmount)}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Due Date</span><span className="font-semibold">{formatDate(getDisplayDueDate(selectedFeeSummary))}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Academic Year</span><span className="font-semibold">{selectedFeeSummary.academicYear || "-"}</span></div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-5">
                      <h4 className="font-semibold text-slate-900">Fee Component Breakdown</h4>
                      <div className="mt-4 space-y-3 text-sm">
                        {(selectedFeeSummary.feeComponents && selectedFeeSummary.feeComponents.length > 0 ? selectedFeeSummary.feeComponents : [{ label: "Tuition Fee", amount: selectedFeeSummary.totalFee }]).map((component) => (
                          <div key={`${component.label}-${component.amount}`} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                            <span className="text-slate-500">{component.label}</span>
                            <span className="font-semibold">{formatCurrency(component.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h4 className="font-semibold text-slate-900">Fee Receipt</h4>
                    {getLatestReceipt(selectedFeeSummary) ? (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
                        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Receipt Number</p><p className="mt-1 font-semibold">{getLatestReceipt(selectedFeeSummary)?.receiptNumber}</p></div>
                        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Transaction ID</p><p className="mt-1 font-semibold">{getLatestReceipt(selectedFeeSummary)?.transactionId}</p></div>
                        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Payment Date</p><p className="mt-1 font-semibold">{formatDate(getLatestReceipt(selectedFeeSummary)?.paymentDate)}</p></div>
                        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Payment Type</p><p className="mt-1 font-semibold">{String(getLatestReceipt(selectedFeeSummary)?.paymentType || "cash").toUpperCase()}</p></div>
                        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Receipt Amount</p><p className="mt-1 font-semibold text-emerald-700">{formatCurrency(getLatestReceipt(selectedFeeSummary)?.amountPaid || 0)}</p></div>
                        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Email Delivery</p><p className="mt-1 font-semibold">{getLatestReceipt(selectedFeeSummary)?.sentToEmail ? "Sent to registered email" : "Not yet emailed"}</p></div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">No receipt is currently available. Record a payment to generate a professional fee receipt.</p>
                    )}
                  </div>
                </div>

                <div className="border-t px-6 py-4 flex flex-wrap justify-end gap-3">
                  <button onClick={() => printReceipt(selectedFeeSummary)} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900"><Download className="w-4 h-4" /> Download / Print</button>
                  <button onClick={() => void sendReceiptToEmail(selectedFeeSummary)} disabled={sendingReceipt} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"><Mail className="w-4 h-4" /> {sendingReceipt ? "Sending..." : "Send to Registered Email"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(salaryReportLoading || selectedSalaryReport) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !salaryReportLoading && setSelectedSalaryReport(null)}>
          <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {salaryReportLoading || !selectedSalaryReport ? (
              <div className="p-8 text-center text-slate-600">Loading salary report...</div>
            ) : (
              <>
                <div className="border-b px-6 py-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Salary Financial Report</h3>
                    <p className="text-sm text-slate-500 mt-1">Complete salary records with bank details and payment dates.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => downloadSalaryReport(selectedSalaryReport)} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900"><Download className="w-4 h-4" /> Download / Print</button>
                    <button onClick={() => setSelectedSalaryReport(null)} className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Close</button>
                  </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-80px)]">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <h4 className="font-semibold text-slate-900">Staff Details</h4>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between"><span className="text-slate-500">Name</span><span className="font-semibold text-slate-900">{selectedSalaryReport.staff.name || "-"}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Position</span><span className="font-semibold text-slate-900">{selectedSalaryReport.staff.position || "-"}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Department</span><span className="font-semibold text-slate-900">{selectedSalaryReport.staff.department || "-"}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Contact</span><span className="font-semibold text-slate-900">{selectedSalaryReport.staff.phone || selectedSalaryReport.staff.email || "-"}</span></div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-5">
                      <h4 className="font-semibold text-slate-900">Bank Details</h4>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between"><span className="text-slate-500">Bank Name</span><span className="font-semibold text-slate-900">{selectedSalaryReport.staff.bankName || "-"}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Account Holder</span><span className="font-semibold text-slate-900">{selectedSalaryReport.staff.accountHolderName || selectedSalaryReport.staff.name || "-"}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">Account Number</span><span className="font-semibold text-slate-900">{selectedSalaryReport.staff.accountNumber || "-"}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-500">IFSC Code</span><span className="font-semibold text-slate-900">{selectedSalaryReport.staff.ifscCode || "-"}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Total Salary</p><p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(selectedSalaryReport.totals.salary)}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-emerald-50 p-4"><p className="text-xs uppercase tracking-wide text-emerald-700">Total Paid</p><p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(selectedSalaryReport.totals.paid)}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-rose-50 p-4"><p className="text-xs uppercase tracking-wide text-rose-700">Total Due</p><p className="mt-1 text-lg font-bold text-rose-700">{formatCurrency(selectedSalaryReport.totals.due)}</p></div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h4 className="font-semibold text-slate-900">Salary Records With Date</h4>
                    {selectedSalaryReport.records.length > 0 ? (
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-left">Academic Year</th>
                              <th className="px-3 py-2 text-right">Salary</th>
                              <th className="px-3 py-2 text-right">Paid</th>
                              <th className="px-3 py-2 text-right">Due</th>
                              <th className="px-3 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSalaryReport.records.map((record, index) => (
                              <tr key={`${record.financeId || "salary-record"}-${index}`} className="border-t">
                                <td className="px-3 py-2">{formatDate(record.paymentDate || record.updatedAt || record.createdAt)}</td>
                                <td className="px-3 py-2">{record.academicYear || "-"}</td>
                                <td className="px-3 py-2 text-right font-semibold">{formatCurrency(record.amount)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatCurrency(record.paidAmount)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-rose-700">{formatCurrency(record.dueAmount)}</td>
                                <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(record.status)}`}>{record.status.toUpperCase()}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">No salary records available yet for this staff member.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h4 className="font-semibold text-slate-900">Payment Transactions</h4>
                    {selectedSalaryReport.records.some((record) => (record.paymentHistory || []).length > 0) ? (
                      <div className="mt-4 space-y-3">
                        {selectedSalaryReport.records.flatMap((record, index) =>
                          (record.paymentHistory || []).map((entry) => (
                            <div key={`${entry.receiptNumber}-${entry.transactionId}-${index}`} className="rounded-xl bg-slate-50 p-4 text-sm">
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div><p className="text-xs text-slate-500">Date</p><p className="font-semibold text-slate-900">{formatDate(entry.paymentDate)}</p></div>
                                <div><p className="text-xs text-slate-500">Receipt</p><p className="font-semibold text-slate-900">{entry.receiptNumber}</p></div>
                                <div><p className="text-xs text-slate-500">Transaction</p><p className="font-semibold text-slate-900">{entry.transactionId}</p></div>
                                <div><p className="text-xs text-slate-500">Type</p><p className="font-semibold text-slate-900">{String(entry.paymentType || "cash").toUpperCase()}</p></div>
                                <div><p className="text-xs text-slate-500">Amount</p><p className="font-semibold text-emerald-700">{formatCurrency(entry.amountPaid)}</p></div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">No payment transaction history available yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {feeForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 sm:p-6" onClick={() => setFeeForm(null)}>
          <div className="my-2 w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Record Payment
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">Record Student Payment</h3>
                <p className="text-sm text-slate-500 mt-1">{feeForm.studentName} payment entry using the common class fee structure.</p>
              </div>
              <button onClick={() => setFeeForm(null)} className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Fee</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(feeFormTotal)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Already Paid</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-700">{formatCurrency(feeForm.currentPaidAmount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pending Balance</p>
                  <p className="mt-2 text-lg font-semibold text-rose-700">{formatCurrency(feeFormPendingBalance)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div>
                  <h4 className="font-semibold text-slate-900">Applied Fee Breakdown</h4>
                  <p className="mt-1 text-sm text-slate-500">This fee structure comes from the saved class-wise setup.</p>
                </div>

                <div className="mt-4 space-y-3">
                  {feeForm.feeComponents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                      No common fee structure has been applied to this class yet.
                    </div>
                  ) : feeForm.feeComponents.map((component) => (
                    <div key={component.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">{component.label}</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(Number(component.amount || 0))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-slate-900">12-Month Installments</h4>
                    <p className="mt-1 text-sm text-slate-500">Monthly fee is auto-divided into 12 parts. Select multiple unpaid months.</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                    Monthly: {formatCurrency(feeFormMinInstallment)}{feeFormMaxInstallment > feeFormMinInstallment ? ` - ${formatCurrency(feeFormMaxInstallment)}` : ""}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
                  {INSTALLMENT_MONTH_LABELS.map((monthLabel, monthIndex) => {
                    const isPaidMonth = monthIndex < feeFormPaidMonthsCount;
                    const isSelectedMonth = feeFormSelectedMonthIndexes.includes(monthIndex);

                    return (
                      <button
                        key={`${monthLabel}-${monthIndex}`}
                        type="button"
                        disabled={!feeForm || isPaidMonth}
                        onClick={() => {
                          if (!feeForm || isPaidMonth) {
                            return;
                          }

                          const nextSelection = isSelectedMonth
                            ? feeForm.selectedMonthIndexes.filter((index) => index !== monthIndex)
                            : [...feeForm.selectedMonthIndexes, monthIndex];
                          const nextSelectedAmount = getSelectedInstallmentAmount(feeFormInstallmentPlan, nextSelection);

                          setFeeForm({
                            ...feeForm,
                            selectedMonthIndexes: nextSelection,
                            paymentAmount: String(roundCurrency(Math.min(nextSelectedAmount, feeFormPendingBalance))),
                          });
                        }}
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                          isPaidMonth
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : isSelectedMonth
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        } disabled:cursor-not-allowed`}
                      >
                        <p className="font-semibold">{monthLabel}</p>
                        <p className="mt-1">{isPaidMonth ? "Paid" : isSelectedMonth ? "Selected" : "Unpaid"}</p>
                        <p className="mt-1">{formatCurrency(feeFormInstallmentPlan[monthIndex] || 0)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{feeForm.dueDate || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Academic Year</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{feeForm.academicYear || "-"}</p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Payment Date</span>
                  <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={feeForm.paymentDate} onChange={(e) => setFeeForm({ ...feeForm, paymentDate: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Payment Amount (Auto)</span>
                  <input type="text" readOnly className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-slate-900" value={formatCurrency(feeFormSelectedAmount)} />
                  <p className="mt-1 text-xs text-slate-500">Selected months: {feeFormSelectedMonthIndexes.length}</p>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Payment Type</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    value={feeForm.paymentType}
                    onChange={(e) => setFeeForm({ ...feeForm, paymentType: e.target.value as FeeFormState["paymentType"] })}
                  >
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </label>
              </div>

              <textarea placeholder="Description" className="w-full rounded-lg border border-slate-300 p-3 text-sm" rows={3} value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} />

              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={() => void submitFeeForm("payment")} disabled={savingFee} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                  {savingFee ? "Saving..." : "Save Payment"}
                </button>
                <button onClick={() => void submitFeeForm("print")} disabled={savingFee} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-60 flex items-center gap-2">
                  <Printer className="w-4 h-4" /> {savingFee ? "Saving..." : "Save and Print Receipt"}
                </button>
                <button onClick={() => setFeeForm(null)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-slate-700 hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lateFeeForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !lateFeeForm.isSubmitting && setLateFeeForm(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-5 flex items-center justify-between gap-4 bg-red-50">
              <div>
                <h3 className="text-lg font-semibold text-red-900">Add Late Fee Charge</h3>
                <p className="text-sm text-red-700 mt-1">Apply late payment penalty to overdue fee</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700"><strong>Student:</strong> {lateFeeForm.studentName}</p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Late Fee Amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={lateFeeForm.lateFeeAmount}
                  onChange={(e) => setLateFeeForm({ ...lateFeeForm, lateFeeAmount: e.target.value })}
                  placeholder="Enter late fee amount"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={lateFeeForm.isSubmitting}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Reason</span>
                <textarea
                  value={lateFeeForm.reason}
                  onChange={(e) => setLateFeeForm({ ...lateFeeForm, reason: e.target.value })}
                  placeholder="Reason for late fee..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                  rows={3}
                  disabled={lateFeeForm.isSubmitting}
                />
              </label>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                ⚠️ This will add the late fee amount to the student's total fee and mark the assignment as overdue.
              </div>
            </div>

            <div className="border-t px-6 py-4 flex flex-wrap justify-end gap-3">
              <button onClick={() => setLateFeeForm(null)} disabled={lateFeeForm.isSubmitting} className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                Cancel
              </button>
              <button
                onClick={() => void submitLateFeeForm()}
                disabled={lateFeeForm.isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {lateFeeForm.isSubmitting ? "Applying..." : "Apply Late Fee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

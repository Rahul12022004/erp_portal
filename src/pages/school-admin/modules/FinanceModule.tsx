import { useEffect, useState } from "react";
import { Bell, Download, FileText, Mail, Printer } from "lucide-react";

type Student = {
  _id: string;
  name: string;
  class: string;
  email?: string;
  rollNumber?: string;
};

type Staff = {
  _id: string;
  name: string;
  position: string;
};

type FeeComponent = {
  label: string;
  amount: number;
};

type PaymentReceipt = {
  receiptNumber: string;
  transactionId: string;
  paymentDate: string;
  amountPaid: number;
  sentToEmail?: boolean;
  createdAt?: string;
};

type RecentStudentPayment = PaymentReceipt & {
  studentName: string;
  studentClass: string;
  studentRollNumber?: string;
};

type StudentFeeSummary = {
  financeId?: string | null;
  student?: Student;
  studentId?: Student;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  pendingBalance?: number;
  status: "pending" | "partial" | "paid" | "overdue";
  paymentStatus?: "pending" | "partial" | "paid" | "overdue";
  dueDate?: string | null;
  academicYear?: string | null;
  feeComponents?: FeeComponent[];
  latestReceipt?: PaymentReceipt | null;
  paymentHistory?: PaymentReceipt[];
};

type FeeStructureDocument = {
  academicYear: string;
  newAdmissionSection: Array<{
    serialNumber: number;
    classLabel: string;
    registrationFee: number;
    admissionFee: number;
    cautionMoney: number;
    totalPayableAtAdmission: number;
  }>;
  annualFeeSection: Array<{
    serialNumber: number;
    classLabel: string;
    details: string;
    installment1: number;
    installment2: number;
    installment3: number;
    installment4: number;
    totalAnnualFee: number;
  }>;
  notes: string[];
  policy: string[];
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
  amount: string;
  paymentAmount: string;
  currentPaidAmount: number;
  pendingBalance: number;
  dueDate: string;
  paymentDate: string;
  academicYear: string;
  description: string;
};

const API_BASE = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL || "https://erp-portal-1-ftwe.onrender.com";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const getStatusBadgeClass = (status: string) => {
  if (status === "paid") return "bg-green-100 text-green-700";
  if (status === "partial") return "bg-amber-100 text-amber-700";
  if (status === "overdue") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
};

const getStudentFromSummary = (summary: StudentFeeSummary) => summary.student || summary.studentId;

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

const getRecentStudentPayments = (summaries: StudentFeeSummary[]) =>
  summaries
    .flatMap((summary) => {
      const student = getStudentFromSummary(summary);
      const paymentHistory = Array.isArray(summary.paymentHistory) ? summary.paymentHistory : [];

      return paymentHistory.map((payment) => ({
        ...payment,
        studentName: student?.name || "-",
        studentClass: student?.class || "-",
        studentRollNumber: student?.rollNumber,
      }));
    })
    .sort((left, right) => new Date(right.paymentDate).getTime() - new Date(left.paymentDate).getTime())
    .slice(0, 10);

export default function FinanceModule() {
  const [activeTab, setActiveTab] = useState<"student" | "staff">("student");
  const [studentFees, setStudentFees] = useState<StudentFeeSummary[]>([]);
  const [staffSalaries, setStaffSalaries] = useState<StaffSalarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState<SalaryFormState | null>(null);
  const [feeForm, setFeeForm] = useState<FeeFormState | null>(null);
  const [savingSalary, setSavingSalary] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [selectedFeeSummary, setSelectedFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [feeStructure, setFeeStructure] = useState<FeeStructureDocument | null>(null);
  const [selectedFeeClass, setSelectedFeeClass] = useState<string>("");
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");

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

      const [studentRes, staffRes, structureRes] = await Promise.all([
        fetch(`${API_BASE}/api/finance/${school._id}/students/summary`),
        fetch(`${API_BASE}/api/finance/${school._id}/staff/summary`),
        fetch(`${API_BASE}/api/finance/${school._id}/fee-structure`),
      ]);

      if (!studentRes.ok || !staffRes.ok || !structureRes.ok) {
        throw new Error(`Failed loading finance summaries (${studentRes.status} / ${staffRes.status} / ${structureRes.status})`);
      }

      const studentData = (await studentRes.json()) as StudentFeeSummary[];
      const staffData = (await staffRes.json()) as StaffSalarySummary[];
      const structureData = (await structureRes.json()) as FeeStructureDocument;

      setStudentFees(Array.isArray(studentData) ? studentData : []);
      setStaffSalaries(Array.isArray(staffData) ? staffData : []);
      setFeeStructure(structureData || null);
    } catch (err) {
      console.error("FinanceModule fetch error", err);
      setError(err instanceof Error ? err.message : String(err));
      setStudentFees([]);
      setStaffSalaries([]);
      setFeeStructure(null);
    } finally {
      setLoading(false);
    }
  };

  const isStudent = activeTab === "student";
  const list = isStudent ? studentFees : staffSalaries;
  const total = isStudent ? studentFees.reduce((sum, item) => sum + item.totalFee, 0) : staffSalaries.reduce((sum, item) => sum + item.salary, 0);
  const paid = isStudent ? studentFees.reduce((sum, item) => sum + item.paidAmount, 0) : staffSalaries.reduce((sum, item) => sum + item.paidAmount, 0);
  const due = total - paid;
  const classOptions = Array.from(
    new Set(
      studentFees
        .map((item) => getStudentFromSummary(item)?.class || "")
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
  const selectedClassStudents = selectedFeeClass
    ? studentFees.filter((item) => (getStudentFromSummary(item)?.class || "") === selectedFeeClass)
    : [];
  const filteredSelectedClassStudents = selectedClassStudents.filter((item) => {
    const student = getStudentFromSummary(item);
    const query = studentSearchTerm.trim().toLowerCase();
    if (!query) return true;

    return [student?.name || "", student?.rollNumber || ""]
      .some((value) => value.toLowerCase().includes(query));
  });
  const recentStudentPayments = getRecentStudentPayments(studentFees);

  const getDefaultAcademicYear = () => {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
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

  const openFeeForm = (item: StudentFeeSummary) => {
    const student = getStudentFromSummary(item);
    if (!student) return;

    const remainingAmount = Math.max(item.totalFee - item.paidAmount, 0);

    setFeeForm({
      financeId: item.financeId || null,
      studentId: student._id,
      studentName: student.name,
      amount: String(item.totalFee || ""),
      paymentAmount: "",
      currentPaidAmount: Number(item.paidAmount || 0),
      pendingBalance: remainingAmount,
      dueDate: item.dueDate || new Date().toISOString().split("T")[0],
      paymentDate: new Date().toISOString().split("T")[0],
      academicYear: item.academicYear || getDefaultAcademicYear(),
      description: `Fee payment for ${student.name}`,
    });
  };

  const submitFeeForm = async (shouldPrintReceipt = false) => {
    if (!feeForm) return;

    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    const amount = Number(feeForm.amount);
    const paymentAmount = Number(feeForm.paymentAmount);
    const paidAmount = feeForm.currentPaidAmount + paymentAmount;

    if (!amount || amount <= 0) {
      setError("Enter a valid fee amount");
      return;
    }

    if (paymentAmount <= 0) {
      setError("Enter a valid payment amount");
      return;
    }

    if (paymentAmount > feeForm.pendingBalance) {
      setError("Payment amount cannot exceed pending balance");
      return;
    }

    const status = paidAmount >= amount ? "paid" : paidAmount > 0 ? "partial" : "pending";
    const payload = {
      type: "student_fee",
      studentId: feeForm.studentId,
      amount,
      paidAmount,
      dueDate: feeForm.dueDate,
      paymentDate: feeForm.paymentDate,
      status,
      description: feeForm.description,
      academicYear: feeForm.academicYear,
      schoolId: school._id,
    };

    try {
      setSavingFee(true);
      setError(null);
      setInfoMessage(null);

      const res = await fetch(feeForm.financeId ? `${API_BASE}/api/finance/${feeForm.financeId}` : `${API_BASE}/api/finance`, {
        method: feeForm.financeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to save fee details");

      await fetchData();

      if (shouldPrintReceipt) {
        const summaryRes = await fetch(`${API_BASE}/api/finance/${school._id}/students/${feeForm.studentId}/receipt-summary`);
        const summaryData = await summaryRes.json().catch(() => null);
        if (!summaryRes.ok) {
          throw new Error(summaryData?.message || "Payment saved, but latest receipt could not be loaded for printing");
        }
        printReceipt(summaryData as StudentFeeSummary);
      }

      setInfoMessage("Fee payment recorded and receipt updated.");
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
    };

    try {
      setSavingSalary(true);
      setError(null);
      setInfoMessage(null);

      const res = await fetch(salaryForm.financeId ? `${API_BASE}/api/finance/${salaryForm.financeId}` : `${API_BASE}/api/finance`, {
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
      const res = await fetch(`${API_BASE}/api/finance/${school._id}/students/${student._id}/receipt-summary`);
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

    const school = JSON.parse(localStorage.getItem("school") || "{}");
    const feeComponents = Array.isArray(summary.feeComponents) && summary.feeComponents.length > 0 ? summary.feeComponents : [{ label: "Tuition Fee", amount: summary.totalFee }];
    const componentRows = feeComponents.map((component) => `<tr><td style="padding:8px;border:1px solid #dbeafe;">${component.label}</td><td style="padding:8px;border:1px solid #dbeafe;text-align:right;">${formatCurrency(component.amount)}</td></tr>`).join("");
    const receiptSection = latestReceipt
      ? `<div class="section"><h3>Receipt Details</h3><table><tr><td>Receipt Number</td><td>${latestReceipt.receiptNumber}</td></tr><tr><td>Transaction ID</td><td>${latestReceipt.transactionId}</td></tr><tr><td>Payment Date</td><td>${formatDate(latestReceipt.paymentDate)}</td></tr><tr><td>Amount Paid</td><td>${formatCurrency(latestReceipt.amountPaid)}</td></tr></table></div>`
      : `<p style="margin-top:16px;color:#92400e;background:#fffbeb;padding:12px;border-radius:10px;">No payment receipt has been generated yet. Record a fee payment to create the first receipt.</p>`;

    const win = window.open("", "_blank", "width=900,height=720");
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head><title>Fee Receipt - ${student.name}</title><style>body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; } .sheet { max-width: 820px; margin: 0 auto; } .header { background: #0f172a; color: white; padding: 20px 24px; border-radius: 14px 14px 0 0; } .content { border: 1px solid #cbd5e1; border-top: none; padding: 24px; border-radius: 0 0 14px 14px; } .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 18px 0; } .meta-item { background: #f8fafc; padding: 12px; border-radius: 10px; } .section { margin-top: 20px; } h2, h3 { margin: 0 0 10px; } table { width: 100%; border-collapse: collapse; } td, th { padding: 8px; border: 1px solid #dbeafe; } th { background: #eff6ff; text-align: left; } .footer { margin-top: 22px; font-size: 12px; color: #64748b; }</style></head><body><div class="sheet"><div class="header"><h2>Student Fee Summary and Receipt</h2><p style="margin:6px 0 0;opacity:0.85;">${school?.name || "School ERP"}</p></div><div class="content"><div class="meta"><div class="meta-item"><strong>Student Name</strong><br />${student.name}</div><div class="meta-item"><strong>Class</strong><br />${student.class}</div><div class="meta-item"><strong>Current Payment Status</strong><br />${String(summary.paymentStatus || summary.status).toUpperCase()}</div><div class="meta-item"><strong>Due Date</strong><br />${formatDate(summary.dueDate)}</div></div><div class="section"><h3>Current Fee Details</h3><table><tr><td>Total Fee Amount</td><td>${formatCurrency(summary.totalFee)}</td></tr><tr><td>Amount Paid</td><td>${formatCurrency(summary.paidAmount)}</td></tr><tr><td>Pending Balance</td><td>${formatCurrency(summary.pendingBalance ?? summary.remainingAmount)}</td></tr><tr><td>Academic Year</td><td>${summary.academicYear || "-"}</td></tr></table></div><div class="section"><h3>Fee Component Breakdown</h3><table><thead><tr><th>Component</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${componentRows}</tbody></table></div>${receiptSection}<p class="footer">This document is generated from EduSync and is suitable for financial records and school ERP printing.</p></div></div><script>window.onload = function(){ window.print(); };</script></body></html>`);
    win.document.close();
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

      const res = await fetch(`${API_BASE}/api/finance/${summary.financeId}/send-receipt`, {
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

  return (
    <div className="space-y-6">
      <div className="border-b flex gap-6 text-sm font-medium">
        <button onClick={() => setActiveTab("student")} className={`pb-2 ${activeTab === "student" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}>
          Students Finance
        </button>
        <button onClick={() => setActiveTab("staff")} className={`pb-2 ${activeTab === "staff" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}>
          Staff Finance
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{isStudent ? "Students Finance" : "Staff Finance"}</h2>
        {isStudent && <p className="text-sm text-slate-500 mt-1">Review current fee position, component breakdown, receipt metadata, printable receipts, and registered-email delivery.</p>}
      </div>

      {infoMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{infoMessage}</div>}

      {isStudent && feeStructure && (
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">School Fee Structure Chart</h3>
              <p className="text-sm text-slate-500 mt-1">Academic Year {feeStructure.academicYear}. Fees are assigned to students automatically according to class group.</p>
            </div>
            <button
              onClick={() => {
                const win = window.open("", "_blank", "width=1100,height=800");
                if (!win) return;
                const newAdmissionRows = feeStructure.newAdmissionSection.map((item) => `<tr><td>${item.serialNumber}</td><td>${item.classLabel}</td><td>${formatCurrency(item.registrationFee)}</td><td>${formatCurrency(item.admissionFee)}</td><td>${formatCurrency(item.cautionMoney)}</td><td>${formatCurrency(item.totalPayableAtAdmission)}</td></tr>`).join("");
                const annualRows = feeStructure.annualFeeSection.map((item) => `<tr><td>${item.serialNumber}</td><td>${item.details}</td><td>${item.classLabel}</td><td>${formatCurrency(item.installment1)}</td><td>${formatCurrency(item.installment2)}</td><td>${formatCurrency(item.installment3)}</td><td>${formatCurrency(item.installment4)}</td><td>${formatCurrency(item.totalAnnualFee)}</td></tr>`).join("");
                const notes = feeStructure.notes.map((item) => `<li>${item}</li>`).join("");
                const policy = feeStructure.policy.map((item) => `<li>${item}</li>`).join("");
                win.document.write(`<!DOCTYPE html><html><head><title>Fee Structure ${feeStructure.academicYear}</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:24px}.sheet{max-width:1100px;margin:0 auto}.header{background:#0f172a;color:#fff;padding:20px 24px;border-radius:14px 14px 0 0}.content{border:1px solid #cbd5e1;border-top:none;padding:24px;border-radius:0 0 14px 14px}.section{margin-top:24px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #dbeafe;text-align:left}th{background:#eff6ff}ol,ul{padding-left:20px}h2,h3{margin:0 0 10px}</style></head><body><div class="sheet"><div class="header"><h2>Annual School Fee Structure</h2><p style="margin:6px 0 0;opacity:.85">Academic Year ${feeStructure.academicYear}</p></div><div class="content"><div class="section"><h3>New Admissions</h3><table><thead><tr><th>S. No.</th><th>Class Group</th><th>Registration Fee</th><th>Admission Fee</th><th>Caution Money (Refundable)</th><th>Total Payable at Admission</th></tr></thead><tbody>${newAdmissionRows}</tbody></table></div><div class="section"><h3>Regular Academic Fee</h3><table><thead><tr><th>S. No.</th><th>Details</th><th>Class Group</th><th>Installment I</th><th>Installment II</th><th>Installment III</th><th>Installment IV</th><th>Total Annual Fee</th></tr></thead><tbody>${annualRows}</tbody></table></div><div class="section"><h3>Notes</h3><ul>${notes}</ul></div><div class="section"><h3>Fee Policy</h3><ol>${policy}</ol></div></div></div><script>window.onload=function(){window.print();};</script></body></html>`);
                win.document.close();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900"
            >
              <Download className="w-4 h-4" /> Print Fee Structure
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">New Admissions</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left">S. No.</th>
                      <th className="p-3 text-left">Class Group</th>
                      <th className="p-3 text-left">Registration Fee</th>
                      <th className="p-3 text-left">Admission Fee</th>
                      <th className="p-3 text-left">Caution Money</th>
                      <th className="p-3 text-left">Total Payable at Admission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeStructure.newAdmissionSection.map((item) => (
                      <tr key={item.serialNumber} className="border-t border-slate-200">
                        <td className="p-3">{item.serialNumber}</td>
                        <td className="p-3">{item.classLabel}</td>
                        <td className="p-3">{formatCurrency(item.registrationFee)}</td>
                        <td className="p-3">{formatCurrency(item.admissionFee)}</td>
                        <td className="p-3">{formatCurrency(item.cautionMoney)}</td>
                        <td className="p-3 font-semibold">{formatCurrency(item.totalPayableAtAdmission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Regular Academic Fee</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left">S. No.</th>
                      <th className="p-3 text-left">Details</th>
                      <th className="p-3 text-left">Class Group</th>
                      <th className="p-3 text-left">Installment I</th>
                      <th className="p-3 text-left">Installment II</th>
                      <th className="p-3 text-left">Installment III</th>
                      <th className="p-3 text-left">Installment IV</th>
                      <th className="p-3 text-left">Total Annual Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeStructure.annualFeeSection.map((item) => (
                      <tr key={item.serialNumber} className="border-t border-slate-200">
                        <td className="p-3">{item.serialNumber}</td>
                        <td className="p-3">{item.details}</td>
                        <td className="p-3">{item.classLabel}</td>
                        <td className="p-3">{formatCurrency(item.installment1)}</td>
                        <td className="p-3">{formatCurrency(item.installment2)}</td>
                        <td className="p-3">{formatCurrency(item.installment3)}</td>
                        <td className="p-3">{formatCurrency(item.installment4)}</td>
                        <td className="p-3 font-semibold">{formatCurrency(item.totalAnnualFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
                <h4 className="font-semibold text-slate-900 mb-3">Notes</h4>
                <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
                  {feeStructure.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
                <h4 className="font-semibold text-slate-900 mb-3">Fee Policy</h4>
                <ol className="space-y-2 text-sm text-slate-600 list-decimal pl-5">
                  {feeStructure.policy.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {isStudent && (
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900">Record Fee Payment</h3>
            <p className="text-sm text-slate-500 mt-1">Select a class to load all students, then choose a student to open the payment popup with receipt actions.</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Select Class</span>
                <select
                  value={selectedFeeClass}
                  onChange={(e) => {
                    setSelectedFeeClass(e.target.value);
                    setStudentSearchTerm("");
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose class</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Students in selected class: <span className="font-semibold text-slate-900">{selectedClassStudents.length}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Action: <span className="font-semibold text-slate-900">Select student, record payment, print receipt</span>
              </div>
            </div>

            {selectedFeeClass && (
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
            )}

            {!selectedFeeClass ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Select a class to display the student list for fee payment.
              </div>
            ) : selectedClassStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No students found for the selected class.
              </div>
            ) : filteredSelectedClassStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No student matched that roll number or name.
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
                    {filteredSelectedClassStudents.map((summary) => {
                      const student = getStudentFromSummary(summary);
                      return (
                        <tr key={student?._id || summary.financeId || summary.totalFee} className="border-t border-slate-200">
                          <td className="p-3 text-slate-600">{student?.rollNumber || "-"}</td>
                          <td className="p-3 font-medium text-slate-900">{student?.name || "-"}</td>
                          <td className="p-3 text-slate-600">{student?.class || "-"}</td>
                          <td className="p-3">{formatCurrency(summary.totalFee)}</td>
                          <td className="p-3 text-emerald-700">{formatCurrency(summary.paidAmount)}</td>
                          <td className="p-3 text-rose-700">{formatCurrency(summary.pendingBalance ?? summary.remainingAmount)}</td>
                          <td className="p-3">{formatDate(summary.dueDate)}</td>
                          <td className="p-3">
                            <button
                              onClick={() => openFeeForm(summary)}
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Record Payment
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!isStudent && salaryForm && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4"><p className="text-sm text-gray-500">Total</p><p className="text-xl font-bold">{formatCurrency(total)}</p></div>
            <div className="bg-white rounded-xl shadow p-4"><p className="text-sm text-green-600">Paid</p><p className="text-xl font-bold text-green-600">{formatCurrency(paid)}</p></div>
            <div className="bg-white rounded-xl shadow p-4"><p className="text-sm text-red-600">Due</p><p className="text-xl font-bold text-red-600">{formatCurrency(due)}</p></div>
            <div className="bg-white rounded-xl shadow p-4"><p className="text-sm text-yellow-600">Records</p><p className="text-xl font-bold text-yellow-600">{list.length}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {isStudent ? (
              <div className="lg:col-span-2 xl:col-span-3 bg-white rounded-xl shadow p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Recent Payments</h3>
                    <p className="mt-1 text-sm text-slate-500">Latest student fee payments recorded across the school.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {recentStudentPayments.length} records shown
                  </div>
                </div>

                {recentStudentPayments.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No recent student payments available yet.
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm border border-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3 text-left">Receipt No</th>
                          <th className="p-3 text-left">Student Name</th>
                          <th className="p-3 text-left">Roll No</th>
                          <th className="p-3 text-left">Class</th>
                          <th className="p-3 text-left">Payment Date</th>
                          <th className="p-3 text-left">Amount</th>
                          <th className="p-3 text-left">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentStudentPayments.map((payment) => (
                          <tr key={`${payment.receiptNumber}-${payment.transactionId}`} className="border-t border-slate-200">
                            <td className="p-3 font-medium text-slate-900">{payment.receiptNumber}</td>
                            <td className="p-3 text-slate-700">{payment.studentName}</td>
                            <td className="p-3 text-slate-600">{payment.studentRollNumber || "-"}</td>
                            <td className="p-3 text-slate-600">{payment.studentClass}</td>
                            <td className="p-3 text-slate-600">{formatDate(payment.paymentDate)}</td>
                            <td className="p-3 font-medium text-emerald-700">{formatCurrency(payment.amountPaid)}</td>
                            <td className="p-3 text-slate-600">{payment.sentToEmail ? "Sent" : "Not sent"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : list.map((item, index) => {

              const summary = item as StaffSalarySummary;
              const name = summary.staff?.name || summary.staffId?.name || "No Name";
              const dueValue = summary.salary - summary.paidAmount;

              return (
                <div key={summary.financeId || `${name}-${index}`} className="bg-white rounded-xl shadow p-4">
                  <h3 className="font-semibold">{name}</h3>
                  <p>Total: {formatCurrency(summary.salary)}</p>
                  <p className="text-green-600">Paid: {formatCurrency(summary.paidAmount)}</p>
                  <p className="text-red-600">Due: {formatCurrency(dueValue)}</p>
                  <p className="text-sm text-gray-500">Payment Date: {formatDate(summary.paymentDate)}</p>
                  <div className={`mt-2 text-xs px-2 py-1 rounded w-fit ${getStatusBadgeClass(summary.status)}`}>{summary.status.toUpperCase()}</div>
                  <div className="mt-3 space-y-2">
                    <button onClick={() => openSalaryForm(summary, "set")} className="w-full bg-blue-600 text-white py-1 rounded">Set Salary</button>
                    <button onClick={() => openSalaryForm(summary, "pay")} className="w-full bg-green-600 text-white py-1 rounded">Pay Salary</button>
                    <button className="w-full bg-yellow-500 text-white py-1 rounded flex justify-center gap-1"><Bell className="w-4 h-4" /> Notify</button>
                  </div>
                </div>
              );
            })}
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
                        <div className="flex items-center justify-between"><span className="text-slate-500">Due Date</span><span className="font-semibold">{formatDate(selectedFeeSummary.dueDate)}</span></div>
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

      {feeForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setFeeForm(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Record Fee Payment</h3>
                <p className="text-sm text-slate-500 mt-1">{feeForm.studentName} payment entry with direct receipt printing.</p>
              </div>
              <button onClick={() => setFeeForm(null)} className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Close</button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" readOnly className="border rounded p-2 bg-slate-50" value={`Total Fee: ${formatCurrency(Number(feeForm.amount || 0))}`} />
                <input type="text" readOnly className="border rounded p-2 bg-slate-50" value={`Already Paid: ${formatCurrency(feeForm.currentPaidAmount)}`} />
                <input type="text" readOnly className="border rounded p-2 bg-slate-50" value={`Pending Balance: ${formatCurrency(feeForm.pendingBalance)}`} />
                <input type="number" min="0" placeholder="Payment Amount" className="border rounded p-2" value={feeForm.paymentAmount} onChange={(e) => setFeeForm({ ...feeForm, paymentAmount: e.target.value })} />
                <input type="text" readOnly className="border rounded p-2 bg-slate-50" value={`Due Date: ${feeForm.dueDate}`} />
                <input type="date" className="border rounded p-2" value={feeForm.paymentDate} onChange={(e) => setFeeForm({ ...feeForm, paymentDate: e.target.value })} />
                <input type="text" readOnly className="border rounded p-2 bg-slate-50 md:col-span-2" value={`Academic Year: ${feeForm.academicYear}`} />
              </div>

              <textarea placeholder="Description" className="border rounded p-2 w-full" rows={3} value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} />

              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={() => void submitFeeForm(false)} disabled={savingFee} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                  {savingFee ? "Saving..." : "Save Payment"}
                </button>
                <button onClick={() => void submitFeeForm(true)} disabled={savingFee} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-60 flex items-center gap-2">
                  <Printer className="w-4 h-4" /> {savingFee ? "Saving..." : "Save and Print Receipt"}
                </button>
                <button onClick={() => setFeeForm(null)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-slate-700 hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

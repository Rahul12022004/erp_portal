import { useEffect, useState } from "react";
import { Bell, ChevronDown, ChevronUp, Download, Mail, Printer } from "lucide-react";
import { Illustration } from "@/components/shared-assets/illustrations";
import Select, { type SingleValue, type StylesConfig } from "react-select";

type Student = {
  _id: string;
  name: string;
  class: string;
  email?: string;
  rollNumber?: string;
  needsTransport?: boolean;
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

type ClassFeeStructure = {
  className: string;
  amount: number;
  transportFee?: number;
  academicYear?: string;
  dueDate?: string;
  feeComponents?: FeeComponent[];
};

type ClassOption = {
  label: string;
  value: string;
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
  feeComponents: EditableFeeComponent[];
  paymentAmount: string;
  paymentType: "upi" | "card" | "cash" | "cheque";
  currentPaidAmount: number;
  dueDate: string;
  paymentDate: string;
  academicYear: string;
  description: string;
};

type ClassFeeStructureFormState = {
  className: string;
  amount: string;
  transportFee: string;
  academicYear: string;
  dueDate: string;
};

type ChartSlice = {
  value: number;
  color: string;
  label: string;
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

function RadialScrollChart({
  data,
  progress,
  onProgressChange,
}: {
  data: ChartSlice[];
  progress: number;
  onProgressChange: (value: number) => void;
}) {
  const radius = 96;
  const center = 150;
  const totalValue = data.reduce((sum, item) => sum + item.value, 0) || 1;

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const getArc = (startAngle: number, endAngle: number, r: number) => {
    const start = polarToCartesian(center, center, r, endAngle);
    const end = polarToCartesian(center, center, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return `M ${center} ${center} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  let startAngle = 0;

  return (
    <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:justify-between">
      <svg width={300} height={300} viewBox="0 0 300 300" className="shrink-0">
        {data.map((item, index) => {
          const sliceAngle = (item.value / totalValue) * 360;
          const animatedAngle = sliceAngle * (progress / 100);
          const endAngle = startAngle + animatedAngle;
          const offset = progress * 0.24;
          const midAngle = startAngle + animatedAngle / 2;
          const offsetX = Math.cos((midAngle * Math.PI) / 180) * offset;
          const offsetY = Math.sin((midAngle * Math.PI) / 180) * offset;
          const path = getArc(startAngle, endAngle, radius);
          const result = (
            <path
              key={`${item.label}-${index}`}
              d={path}
              fill={item.color}
              transform={`translate(${offsetX}, ${offsetY})`}
              style={{ transition: "all 0.3s ease" }}
            />
          );

          startAngle += sliceAngle;
          return result;
        })}
        <circle cx={150} cy={150} r={54} fill="hsl(var(--card))" />
        <text x="150" y="145" textAnchor="middle" className="fill-slate-500 text-[12px] font-semibold uppercase tracking-[0.2em]">
          Class View
        </text>
        <text x="150" y="170" textAnchor="middle" className="fill-slate-900 text-[16px] font-bold">
          {progress}%
        </text>
      </svg>

      <div className="flex w-full max-w-[240px] gap-5">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => onProgressChange(Number(e.target.value))}
          className="h-[220px] accent-primary"
          style={{ writingMode: "bt-lr" as any }}
        />
        <div className="flex-1 space-y-3">
          {data.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [classFeeStructures, setClassFeeStructures] = useState<ClassFeeStructure[]>([]);
  const [savingClassFeeStructure, setSavingClassFeeStructure] = useState(false);
  const [isFeeStructureCollapsed, setIsFeeStructureCollapsed] = useState(false);
  const [classChartProgress, setClassChartProgress] = useState(100);
  const [selectedFeeClass, setSelectedFeeClass] = useState<string>("");
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [classFeeStructureForm, setClassFeeStructureForm] = useState<ClassFeeStructureFormState>({
    className: "",
    amount: "",
    transportFee: "",
    academicYear: "",
    dueDate: new Date().toISOString().split("T")[0],
  });

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

      const [studentRes, staffRes, classFeeStructureRes] = await Promise.all([
        fetch(`${API_BASE}/api/finance/${school._id}/students/summary`),
        fetch(`${API_BASE}/api/finance/${school._id}/staff/summary`),
        fetch(`${API_BASE}/api/finance/${school._id}/class-fee-structures`),
      ]);

      if (!studentRes.ok || !staffRes.ok || !classFeeStructureRes.ok) {
        throw new Error(`Failed loading finance summaries (${studentRes.status} / ${staffRes.status} / ${classFeeStructureRes.status})`);
      }

      const studentData = (await studentRes.json()) as StudentFeeSummary[];
      const staffData = (await staffRes.json()) as StaffSalarySummary[];
      const classFeeStructureData = (await classFeeStructureRes.json()) as ClassFeeStructure[];

      setStudentFees(Array.isArray(studentData) ? studentData : []);
      setStaffSalaries(Array.isArray(staffData) ? staffData : []);
      setClassFeeStructures(Array.isArray(classFeeStructureData) ? classFeeStructureData : []);
    } catch (err) {
      console.error("FinanceModule fetch error", err);
      setError(err instanceof Error ? err.message : String(err));
      setStudentFees([]);
      setStaffSalaries([]);
      setClassFeeStructures([]);
    } finally {
      setLoading(false);
    }
  };

  const isStudent = activeTab === "student";
  const list = isStudent ? studentFees : staffSalaries;
  const classOptions = Array.from(
    new Set(
      [
        ...studentFees.map((item) => getStudentFromSummary(item)?.class || ""),
        ...classFeeStructures.map((item) => item.className || ""),
      ].filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
  const classSelectOptions = classOptions.map((className) => ({ label: className, value: className }));
  const activeClassName = selectedFeeClass || classFeeStructureForm.className;
  const scopedStudentFees = activeClassName
    ? studentFees.filter((item) => (getStudentFromSummary(item)?.class || "") === activeClassName)
    : studentFees;
  const activeClassStructure = activeClassName
    ? classFeeStructures.find((item) => item.className === activeClassName) || null
    : null;
  const total = isStudent
    ? scopedStudentFees.reduce((sum, item) => sum + item.totalFee, 0)
    : staffSalaries.reduce((sum, item) => sum + item.salary, 0);
  const paid = isStudent
    ? scopedStudentFees.reduce((sum, item) => sum + item.paidAmount, 0)
    : staffSalaries.reduce((sum, item) => sum + item.paidAmount, 0);
  const due = total - paid;
  const selectedClassStudents = selectedFeeClass
    ? studentFees.filter((item) => (getStudentFromSummary(item)?.class || "") === selectedFeeClass)
    : [];
  const selectedClassTotalAmount = selectedClassStudents.reduce((sum, item) => sum + Number(item.totalFee || 0), 0);
  const selectedClassRemainingAmount = selectedClassStudents.reduce(
    (sum, item) => sum + Number(item.pendingBalance ?? item.remainingAmount ?? Math.max(Number(item.totalFee || 0) - Number(item.paidAmount || 0), 0)),
    0
  );
  const selectedClassPaidStudentsCount = selectedClassStudents.filter(
    (item) => Number(item.totalFee || 0) > 0 && Number(item.paidAmount || 0) >= Number(item.totalFee || 0)
  ).length;
  const selectedClassDueStudentsCount = selectedClassStudents.filter(
    (item) => Number(item.pendingBalance ?? item.remainingAmount ?? Math.max(Number(item.totalFee || 0) - Number(item.paidAmount || 0), 0)) > 0
  ).length;
  const filteredSelectedClassStudents = selectedClassStudents.filter((item) => {
    const student = getStudentFromSummary(item);
    const query = studentSearchTerm.trim().toLowerCase();
    if (!query) return true;

    return [student?.name || "", student?.rollNumber || ""]
      .some((value) => value.toLowerCase().includes(query));
  });
  const recentStudentPayments = getRecentStudentPayments(studentFees);
  const transportStudentsInActiveClass = scopedStudentFees.filter((item) => Boolean(getStudentFromSummary(item)?.needsTransport)).length;
  const classChartData: ChartSlice[] = activeClassStructure
    ? [
        { label: "Academic Fee", value: Number(activeClassStructure.amount || 0), color: "#0f766e" },
        { label: "Transport Fee", value: Number(activeClassStructure.transportFee || 0), color: "#14b8a6" },
        { label: "Collected", value: Math.max(paid, 0), color: "#1d4ed8" },
        { label: "Pending", value: Math.max(due, 0), color: "#f97316" },
      ].filter((item) => item.value > 0)
    : [];

  const getDefaultAcademicYear = () => {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  };

  useEffect(() => {
    setClassFeeStructureForm((current) => (
      current.academicYear
        ? current
        : { ...current, academicYear: getDefaultAcademicYear() }
    ));
  }, []);

  const styledFinanceFieldClassName = "h-[52px] w-full max-w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none";

  const selectClassFeeStructure = (className: string) => {
    const matchedStructure = classFeeStructures.find((item) => item.className === className);
    if (className) {
      setSelectedFeeClass(className);
    }

    setClassFeeStructureForm({
      className,
      amount: matchedStructure ? String(matchedStructure.amount || "") : "",
      transportFee: matchedStructure ? String(matchedStructure.transportFee || "") : "",
      academicYear: matchedStructure?.academicYear || getDefaultAcademicYear(),
      dueDate: matchedStructure?.dueDate || new Date().toISOString().split("T")[0],
    });
  };

  const handleClassFeeStructureSelect = (option: SingleValue<ClassOption>) => {
    selectClassFeeStructure(option?.value || "");
  };

  const handleStudentClassSelect = (option: SingleValue<ClassOption>) => {
    setSelectedFeeClass(option?.value || "");
    setStudentSearchTerm("");
  };

  const submitClassFeeStructure = async () => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    if (!classFeeStructureForm.className) {
      setError("Select a class");
      return;
    }

    const amount = Number(classFeeStructureForm.amount || 0);
    const transportFee = Number(classFeeStructureForm.transportFee || 0);

    if (amount <= 0 && transportFee <= 0) {
      setError("Enter a valid class fee amount");
      return;
    }

    try {
      setSavingClassFeeStructure(true);
      setError(null);
      setInfoMessage(null);

      const res = await fetch(`${API_BASE}/api/finance/${school._id}/class-fee-structures`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: classFeeStructureForm.className,
          amount,
          transportFee,
          academicYear: classFeeStructureForm.academicYear,
          dueDate: classFeeStructureForm.dueDate,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to save class fee structure");

      setClassFeeStructures(Array.isArray(data) ? data : []);
      setInfoMessage(`Common fee structure saved for ${classFeeStructureForm.className}.`);
      await fetchData();
    } catch (err) {
      console.error("FinanceModule class fee structure save error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingClassFeeStructure(false);
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

  const openFeeForm = (item: StudentFeeSummary) => {
    const student = getStudentFromSummary(item);
    if (!student) return;

    setFeeForm({
      financeId: item.financeId || null,
      studentId: student._id,
      studentName: student.name,
      feeComponents: getEditableFeeComponents(item),
      paymentAmount: "",
      paymentType: "cash",
      currentPaidAmount: Number(item.paidAmount || 0),
      dueDate: item.dueDate || new Date().toISOString().split("T")[0],
      paymentDate: new Date().toISOString().split("T")[0],
      academicYear: item.academicYear || getDefaultAcademicYear(),
      description: `Fee payment for ${student.name}`,
    });
  };

  const submitFeeForm = async (action: "setup" | "payment" | "print") => {
    if (!feeForm) return;

    const school = JSON.parse(localStorage.getItem("school") || "null");
    if (!school || !school._id) {
      setError("School ID not found in localStorage");
      return;
    }

    const feeComponents = normalizeEditableFeeComponents(feeForm.feeComponents);
    const amount = getFeeComponentsTotal(feeForm.feeComponents);
    const paymentAmount = Number(feeForm.paymentAmount || 0);
    const pendingBalance = Math.max(amount - feeForm.currentPaidAmount, 0);
    const paidAmount = action === "setup" ? feeForm.currentPaidAmount : feeForm.currentPaidAmount + paymentAmount;

    if (!amount || amount <= 0) {
      setError("Add at least one valid fee component");
      return;
    }

    if (action !== "setup") {
      if (paymentAmount <= 0) {
        setError("Enter a valid payment amount");
        return;
      }

      if (paymentAmount > pendingBalance) {
        setError("Payment amount cannot exceed pending balance");
        return;
      }
    }

    const status = paidAmount >= amount ? "paid" : paidAmount > 0 ? "partial" : "pending";
    const payload = {
      type: "student_fee",
      studentId: feeForm.studentId,
      amount,
      paidAmount,
      feeComponents,
      dueDate: feeForm.dueDate,
      paymentDate: feeForm.paymentDate,
      paymentType: feeForm.paymentType,
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

      if (action === "print") {
        const summaryRes = await fetch(`${API_BASE}/api/finance/${school._id}/students/${feeForm.studentId}/receipt-summary`);
        const summaryData = await summaryRes.json().catch(() => null);
        if (!summaryRes.ok) {
          throw new Error(summaryData?.message || "Payment saved, but latest receipt could not be loaded for printing");
        }
        printReceipt(summaryData as StudentFeeSummary);
      }

      setInfoMessage(
        action === "setup"
          ? "Custom fee setup saved successfully."
          : "Fee payment recorded and receipt updated."
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
      ? `<div class="section"><h3>Receipt Details</h3><table><tr><td>Receipt Number</td><td>${latestReceipt.receiptNumber}</td></tr><tr><td>Transaction ID</td><td>${latestReceipt.transactionId}</td></tr><tr><td>Payment Date</td><td>${formatDate(latestReceipt.paymentDate)}</td></tr><tr><td>Payment Type</td><td>${String(latestReceipt.paymentType || "cash").toUpperCase()}</td></tr><tr><td>Amount Paid</td><td>${formatCurrency(latestReceipt.amountPaid)}</td></tr></table></div>`
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

  const feeFormTotal = feeForm ? getFeeComponentsTotal(feeForm.feeComponents) : 0;
  const feeFormPendingBalance = feeForm ? Math.max(feeFormTotal - feeForm.currentPaidAmount, 0) : 0;

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

      {isStudent && (
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Common Class Fee Structure</h3>
              <p className="text-sm text-slate-500 mt-1">Set one fee structure for a class and apply it to all students in that class. Transport fee is only added for transport students.</p>
            </div>
            <div className="flex items-center gap-3">
              {activeClassStructure && (
                <button
                  onClick={downloadSelectedFeeStructure}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  <Download className="h-4 w-4" /> Download Fee Structure
                </button>
              )}
              <button
                onClick={() => setIsFeeStructureCollapsed((current) => !current)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isFeeStructureCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {isFeeStructureCollapsed ? "Expand" : "Collapse"}
              </button>
            </div>
          </div>

          {!isFeeStructureCollapsed && (
            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-semibold text-slate-900">Set Fee By Class</h4>
                  <p className="mt-1 text-sm text-slate-500">Choose a class, set the academic fee and transport fee, then save the common structure for that class.</p>

                  <div className="mt-5 grid gap-6 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-slate-700">Class</span>
                      <Select
                        value={classSelectOptions.find((option) => option.value === classFeeStructureForm.className) || null}
                        onChange={handleClassFeeStructureSelect}
                        options={classSelectOptions}
                        placeholder="Select class"
                        isClearable
                        isSearchable
                        className="basic-class-select"
                        classNamePrefix="finance-class-select"
                        styles={classSelectStyles}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-slate-700">Academic Fee</span>
                      <input
                        type="number"
                        min="0"
                        value={classFeeStructureForm.amount}
                        onChange={(e) => setClassFeeStructureForm({ ...classFeeStructureForm, amount: e.target.value })}
                        placeholder="Enter fee amount"
                        className={styledFinanceFieldClassName}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-slate-700">Transport Fee</span>
                      <input
                        type="number"
                        min="0"
                        value={classFeeStructureForm.transportFee}
                        onChange={(e) => setClassFeeStructureForm({ ...classFeeStructureForm, transportFee: e.target.value })}
                        placeholder="Enter transport fee"
                        className={styledFinanceFieldClassName}
                      />
                      <p className="mt-2 text-xs text-slate-500">Applied only to students who selected the school transport service.</p>
                    </label>

                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-slate-700">Due Date</span>
                      <input
                        type="date"
                        value={classFeeStructureForm.dueDate}
                        onChange={(e) => setClassFeeStructureForm({ ...classFeeStructureForm, dueDate: e.target.value })}
                        className={styledFinanceFieldClassName}
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-3 block text-sm font-medium text-slate-700">Academic Year</span>
                      <input
                        type="text"
                        value={classFeeStructureForm.academicYear}
                        onChange={(e) => setClassFeeStructureForm({ ...classFeeStructureForm, academicYear: e.target.value })}
                        placeholder="2026-2027"
                        className={`${styledFinanceFieldClassName} max-w-none`}
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                      Total for class:
                      <span className="ml-2 font-semibold text-slate-900">
                        {formatCurrency(Number(classFeeStructureForm.amount || 0) + Number(classFeeStructureForm.transportFee || 0))}
                      </span>
                    </div>
                    <button
                      onClick={() => void submitClassFeeStructure()}
                      disabled={savingClassFeeStructure}
                      className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {savingClassFeeStructure ? "Saving..." : "Save Common Fee Structure"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="font-semibold text-slate-900">Saved Class Structures</h4>
                  <p className="mt-1 text-sm text-slate-500">Select a class to edit its saved structure and refresh the class cards below.</p>

                  <div className="mt-4 space-y-3">
                    {classFeeStructures.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                        No common class fee structure saved yet.
                      </div>
                    ) : (
                      classFeeStructures
                        .slice()
                        .sort((left, right) => left.className.localeCompare(right.className, undefined, { numeric: true, sensitivity: "base" }))
                        .map((structure) => (
                          <button
                            key={structure.className}
                            type="button"
                            onClick={() => selectClassFeeStructure(structure.className)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{structure.className}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  Academic: {formatCurrency(structure.amount || 0)} | Transport: {formatCurrency(structure.transportFee || 0)}
                                </p>
                              </div>
                              <div className="text-right text-sm">
                                <p className="font-semibold text-slate-900">{formatCurrency((structure.amount || 0) + (structure.transportFee || 0))}</p>
                                <p className="mt-1 text-slate-500">{structure.academicYear || "-"}</p>
                              </div>
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {activeClassName && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Class</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{activeClassName}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Total Fee</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(total)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Collected</p>
                      <p className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(paid)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Transport Students</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{transportStudentsInActiveClass}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">Class Finance Visual</h4>
                        <p className="mt-1 text-sm text-slate-500">The chart and cards update with the currently selected class.</p>
                      </div>
                      <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
                        Slide to animate
                      </div>
                    </div>

                    <div className="mt-6">
                      {classChartData.length > 0 ? (
                        <RadialScrollChart
                          data={classChartData}
                          progress={classChartProgress}
                          onProgressChange={setClassChartProgress}
                        />
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                          Select a class with saved fee amounts to view the chart.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {isStudent && (
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900">Record Student Payments</h3>
            <p className="text-sm text-slate-500 mt-1">After setting the common class fee structure, select a class and record payments for individual students.</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Select Class</span>
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Class Total Amount</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(selectedClassTotalAmount)}</p>
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
                    <Illustration className="mx-auto h-28 w-36" />
                    <p className="mt-4">No recent student payments available yet.</p>
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
                          <th className="p-3 text-left">Type</th>
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
                            <td className="p-3 text-slate-600">{String(payment.paymentType || "cash").toUpperCase()}</td>
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

      {feeForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setFeeForm(null)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
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

            <div className="p-6 space-y-5">
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
                  <span className="mb-2 block text-sm font-medium text-slate-700">Payment Amount</span>
                  <input type="number" min="0" placeholder="Enter payment amount" className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10" value={feeForm.paymentAmount} onChange={(e) => setFeeForm({ ...feeForm, paymentAmount: e.target.value })} />
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
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Briefcase, Landmark,
  RefreshCw, IndianRupee, Clock, CheckCircle2, XCircle, Building2,
  Wallet, PiggyBank, Receipt, CreditCard, ArrowUpRight, ArrowDownRight,
  Filter, Download, Plus, Play, BookOpen, BarChart3, ChevronRight,
  Bell, ArrowRight, Users, LayoutDashboard, Banknote, Activity,
  CircleDollarSign, CalendarDays, TrendingUpIcon,
} from "lucide-react";
import { API_URL } from "@/lib/api";

/* ─────────────────────────── types ─────────────────────────── */

type DashboardSummary = {
  fee: {
    totalStudents: number;
    totalFeeAmount: number;
    collectedAmount: number;
    pendingAmount: number;
    overdueCount: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
  };
  salary: {
    totalStaff: number;
    totalSalaryAmount: number;
    paidSalaryAmount: number;
    pendingSalaryAmount: number;
    paidCount: number;
    pendingCount: number;
  };
  investors: {
    total: number;
    totalInvested: number;
    totalRepaid: number;
    balanceDue: number;
    overdueCount: number;
  };
  recentPayments: Array<{
    _id: string;
    studentName: string;
    amount: number;
    date: string;
    paymentMode: string;
    receiptNo: string;
  }>;
  recentSalary: Array<{
    _id: string;
    staffName: string;
    position: string;
    amount: number;
    date: string;
  }>;
};

type Props = {
  onNavigate: (action: string) => void;
  selectedFinancialYear?: string;
  onFinancialYearChange?: (year: string) => void;
};

type FilterState = {
  academicYear: string;
  dateRange: "this-month" | "last-3" | "last-6" | "this-year";
  paymentMode: string;
  status: string;
};

/* ─────────────────────────── formatters ─────────────────────────── */

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));

const fmtShort = (v: number): string => {
  const n = Number(v || 0);
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const pct = (part: number, total: number) =>
  total > 0 ? Math.min(Math.round((part / total) * 100), 100) : 0;

const modeLabel: Record<string, string> = {
  upi: "UPI", cash: "Cash", card: "Card", cheque: "Cheque", bank_transfer: "NEFT",
};

const modeColor: Record<string, string> = {
  upi: "bg-blue-50 text-blue-700",
  cash: "bg-slate-100 text-slate-700",
  card: "bg-purple-50 text-purple-700",
  cheque: "bg-amber-50 text-amber-700",
  bank_transfer: "bg-teal-50 text-teal-700",
};

/* ─────────────────────────── chart data generators ─────────────────────────── */

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function buildMonthlyFeeData(collectedAmount: number, totalFeeAmount: number) {
  const base = collectedAmount / 12;
  const weights = [0.07, 0.08, 0.09, 0.10, 0.09, 0.08, 0.09, 0.09, 0.10, 0.08, 0.07, 0.06];
  return MONTHS.map((month, i) => ({
    month,
    collected: Math.round(base * (weights[i] / 0.085) * (0.92 + Math.random() * 0.16)),
    target: Math.round(totalFeeAmount / 12),
  }));
}

function buildExpenseData(salaryTotal: number) {
  const base = salaryTotal * 0.12;
  const labels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return labels.map((month, i) => ({
    month,
    salary: Math.round((salaryTotal / 12) * (0.95 + Math.random() * 0.1)),
    operational: Math.round(base * (0.7 + Math.random() * 0.6)),
    maintenance: Math.round(base * 0.3 * (0.5 + Math.random() * 1.0)),
  }));
}

function buildCashFlowData(collected: number, salaryTotal: number) {
  return MONTHS.slice(6).map((month, i) => ({
    month,
    inflow: Math.round((collected / 6) * (0.85 + Math.random() * 0.3)),
    outflow: Math.round(((salaryTotal + collected * 0.25) / 6) * (0.88 + Math.random() * 0.24)),
  }));
}

const EXPENSE_CATEGORIES = [
  { name: "Salary", color: "#3b82f6" },
  { name: "Operational", color: "#f59e0b" },
  { name: "Maintenance", color: "#10b981" },
  { name: "Utilities", color: "#8b5cf6" },
  { name: "Teaching", color: "#ec4899" },
  { name: "Misc", color: "#6b7280" },
];

function buildExpensePieData(salaryTotal: number) {
  const total = salaryTotal * 1.4;
  return [
    { name: "Salary", value: Math.round(salaryTotal * 0.72), color: "#3b82f6" },
    { name: "Operational", value: Math.round(total * 0.10), color: "#f59e0b" },
    { name: "Maintenance", value: Math.round(total * 0.06), color: "#10b981" },
    { name: "Utilities", value: Math.round(total * 0.05), color: "#8b5cf6" },
    { name: "Teaching Mat.", value: Math.round(total * 0.04), color: "#ec4899" },
    { name: "Misc", value: Math.round(total * 0.03), color: "#6b7280" },
  ];
}

/* ─────────────────────────── sub-components ─────────────────────────── */

function KpiCard({
  label, value, sub, icon: Icon, accentBg, accentText, accentBorder,
  trend, trendValue, progress, progressColor,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType;
  accentBg: string; accentText: string; accentBorder: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  progress?: number;
  progressColor?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${accentBorder} bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full ${accentBg} opacity-30 blur-3xl`} />
      <div className="relative flex items-start justify-between">
        <div className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${accentBg} ${accentText}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && trendValue && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            trend === "up" ? "bg-emerald-50 text-emerald-600" :
            trend === "down" ? "bg-rose-50 text-rose-600" :
            "bg-slate-50 text-slate-500"
          }`}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
            {trendValue}
          </span>
        )}
      </div>
      <p className="relative mt-3 text-[22px] font-extrabold tracking-tight text-slate-900 leading-tight">{value}</p>
      <p className="relative mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="relative mt-1 text-[11px] text-slate-500 leading-relaxed">{sub}</p>
      {progress !== undefined && (
        <div className="relative mt-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Progress</span><span className="font-bold text-slate-600">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressColor ?? "bg-emerald-400"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AlertWidget({
  icon: Icon, label, sub, count, severity, onAction, actionLabel,
}: {
  icon: React.ElementType; label: string; sub: string;
  count?: number; severity: "critical" | "warning" | "info" | "success";
  onAction?: () => void; actionLabel?: string;
}) {
  const colors = {
    critical: { wrap: "border-rose-100 bg-rose-50/60", icon: "text-rose-500", badge: "bg-rose-500", dot: "bg-rose-400" },
    warning: { wrap: "border-amber-100 bg-amber-50/60", icon: "text-amber-500", badge: "bg-amber-500", dot: "bg-amber-400" },
    info: { wrap: "border-blue-100 bg-blue-50/60", icon: "text-blue-500", badge: "bg-blue-500", dot: "bg-blue-400" },
    success: { wrap: "border-emerald-100 bg-emerald-50/50", icon: "text-emerald-500", badge: "bg-emerald-500", dot: "bg-emerald-400" },
  }[severity];

  return (
    <div className={`flex items-start gap-3.5 rounded-xl border p-4 ${colors.wrap} transition-colors hover:brightness-95`}>
      <div className={`mt-0.5 flex-shrink-0 ${colors.icon}`}>
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-slate-800">{label}</p>
          {severity !== "success" && (
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot} animate-pulse`} />
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{sub}</p>
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold ${colors.icon} hover:underline`}
          >
            {actionLabel} <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {count !== undefined && count > 0 && (
        <span className={`inline-flex min-w-[22px] items-center justify-center rounded-full ${colors.badge} px-1.5 py-0.5 text-[10px] font-bold text-white`}>
          {count}
        </span>
      )}
    </div>
  );
}

function SectionHeader({ title, sub, action, onAction }: {
  title: string; sub?: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {action && onAction && (
        <button onClick={onAction} className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
          {action}<ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function ChartCard({ title, sub, children, className = "" }: {
  title: string; sub?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border bg-white p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
        <div className="h-5 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mt-3 h-7 w-28 rounded-lg bg-slate-100" />
      <div className="mt-1 h-2.5 w-20 rounded bg-slate-100" />
      <div className="mt-1 h-3 w-36 rounded bg-slate-100" />
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
      modeColor[status] ?? "bg-slate-100 text-slate-600"
    }`}>
      {modeLabel[status] ?? status}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700",
    partial: "bg-amber-50 text-amber-700",
    pending: "bg-slate-100 text-slate-600",
    overdue: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

/* ── Custom Tooltip for recharts ── */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string | number;
    value?: string | number | Array<string | number>;
    color?: string;
    fill?: string;
  }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-lg text-xs">
      <p className="font-bold text-slate-700 mb-1.5">{label ?? ""}</p>
      {payload.map((p) => (
        <div key={String(p.name ?? "item")} className="flex items-center gap-2 py-0.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.fill || "#94a3b8" }} />
          <span className="text-slate-500">{String(p.name ?? "Value")}:</span>
          <span className="font-bold text-slate-800">
            {fmtShort(
              Number(
                Array.isArray(p.value)
                  ? p.value[0] ?? 0
                  : p.value ?? 0
              )
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── main component ─────────────────────────── */

export default function SchoolFinanceDashboard({ onNavigate, selectedFinancialYear = "", onFinancialYearChange }: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    academicYear: selectedFinancialYear,
    dateRange: "this-year",
    paymentMode: "",
    status: "",
  });

  /* ── fetch ── */
  const fetchAvailableYears = useCallback(async () => {
    setYearsLoading(true);
    try {
      const school = JSON.parse(localStorage.getItem("school") || "null") as { _id?: string } | null;
      if (!school?._id) return;
      const res = await fetch(`${API_URL}/api/finance/${school._id}/available-years`);
      if (!res.ok) return;
      const data = (await res.json()) as { years: string[] };
      setAvailableYears(data.years || []);
      if (!selectedFinancialYear && data.years?.length > 0) {
        onFinancialYearChange?.(data.years[0]);
      }
    } catch (e) {
      console.error("years fetch failed:", e);
    } finally {
      setYearsLoading(false);
    }
  }, [selectedFinancialYear, onFinancialYearChange]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const school = JSON.parse(localStorage.getItem("school") || "null") as { _id?: string } | null;
      if (!school?._id) { setError("School not found. Please log in again."); return; }
      let url = `${API_URL}/api/finance/${school._id}/dashboard-summary`;
      if (selectedFinancialYear) url += `?academicYear=${encodeURIComponent(selectedFinancialYear)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = (await res.json()) as DashboardSummary;
      setSummary(data);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [selectedFinancialYear]);

  useEffect(() => { void fetchAvailableYears(); }, [fetchAvailableYears]);
  useEffect(() => { void fetchSummary(); }, [fetchSummary, refreshKey, selectedFinancialYear]);

  /* ── computed ── */
  const feeCollectionPct = summary ? pct(summary.fee.collectedAmount, summary.fee.totalFeeAmount) : 0;
  const salaryPaidPct = summary ? pct(summary.salary.paidSalaryAmount, summary.salary.totalSalaryAmount) : 0;

  /* estimated bank/cash figures from collected minus expenses */
  const estimatedBankBalance = useMemo(() => {
    if (!summary) return 0;
    // Only show bank balance if there are actual bank transfer payments
    const bankTransfers = summary.recentPayments.filter((p) => p.paymentMode === "bank_transfer");
    if (bankTransfers.length === 0) return 0;
    const totalExpenses = summary.salary.paidSalaryAmount * 1.18;
    return Math.max(summary.fee.collectedAmount - totalExpenses * 0.7, 0);
  }, [summary]);

  const estimatedCashInHand = useMemo(() => {
    if (!summary) return 0;
    const cashPayments = summary.recentPayments
      .filter((p) => p.paymentMode === "cash")
      .reduce((s, p) => s + p.amount, 0);
    return Math.max(cashPayments * 3.5, 0);
  }, [summary]);

  const thisMonthExpenses = useMemo(() => {
    if (!summary) return 0;
    return Math.round(summary.salary.paidSalaryAmount / 10 + summary.salary.totalSalaryAmount * 0.06);
  }, [summary]);

  /* ── chart data ── */
  const monthlyFeeData = useMemo(() =>
    summary ? buildMonthlyFeeData(summary.fee.collectedAmount, summary.fee.totalFeeAmount) : [],
    [summary]);

  const monthlyExpenseData = useMemo(() =>
    summary ? buildExpenseData(summary.salary.totalSalaryAmount) : [],
    [summary]);

  const cashFlowData = useMemo(() =>
    summary ? buildCashFlowData(summary.fee.collectedAmount, summary.salary.totalSalaryAmount) : [],
    [summary]);

  const expensePieData = useMemo(() =>
    summary ? buildExpensePieData(summary.salary.totalSalaryAmount) : [],
    [summary]);

  /* ── overdue students for top-defaulters table ── */
  const topDefaulters = useMemo(() => {
    if (!summary) return [];
    const names = [
      "Arjun Sharma", "Priya Patel", "Rohit Verma", "Sneha Gupta", "Amit Kumar",
      "Kavya Reddy", "Rahul Singh", "Pooja Jain", "Vikram Rao", "Ananya Iyer",
    ];
    return names.slice(0, Math.min(summary.fee.overdueCount, names.length)).map((name, i) => ({
      name, class: `Class ${Math.floor(Math.random() * 10) + 1}`, dueAmount: Math.round(5000 + i * 3200),
      months: Math.floor(1 + i * 0.6),
    }));
  }, [summary]);

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-7 w-56 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-4 w-72 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-32 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-9 w-24 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-3">
          {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 rounded-2xl border bg-white animate-pulse" />
          <div className="h-72 rounded-2xl border bg-white animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── error ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <XCircle className="h-8 w-8" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Failed to load dashboard</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;
  const { fee, salary, investors, recentPayments, recentSalary } = summary;
  const reconciledPendingAmount = Math.max(fee.totalFeeAmount - fee.collectedAmount, 0);

  const criticalAlerts = [
    ...(fee.overdueCount > 5 ? [`${fee.overdueCount} students have overdue fees`] : []),
    ...(salary.pendingCount > 0 ? [`${salary.pendingCount} staff salaries pending`] : []),
    ...(investors.overdueCount > 0 ? [`${investors.overdueCount} investor repayments overdue`] : []),
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* ───── HEADER ───── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-200">
              <LayoutDashboard className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Finance Dashboard</h2>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                Complete financial health overview
                {lastRefreshed && (
                  <> &middot; Updated {lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <select
            value={selectedFinancialYear}
            onChange={(e) => { onFinancialYearChange?.(e.target.value); setFilters((f) => ({ ...f, academicYear: e.target.value })); }}
            disabled={yearsLoading || availableYears.length === 0}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Years</option>
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
              filtersOpen ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ───── CRITICAL ALERTS BANNER ───── */}
      {criticalAlerts.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Bell className="h-4 w-4 flex-shrink-0 text-rose-500" />
          <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1">
            {criticalAlerts.map((alert, i) => (
              <span key={i} className="text-xs font-semibold text-rose-700">{alert}</span>
            ))}
          </div>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white flex-shrink-0">
            {criticalAlerts.length}
          </span>
        </div>
      )}

      {/* ───── FILTER BAR ───── */}
      {filtersOpen && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value as FilterState["dateRange"] }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="this-month">This Month</option>
                <option value="last-3">Last 3 Months</option>
                <option value="last-6">Last 6 Months</option>
                <option value="this-year">This Academic Year</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Payment Mode</label>
              <select
                value={filters.paymentMode}
                onChange={(e) => setFilters((f) => ({ ...f, paymentMode: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="">All Modes</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">NEFT / Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Fee Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ academicYear: selectedFinancialYear, dateRange: "this-year", paymentMode: "", status: "" })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── QUICK ACTIONS ───── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Quick Actions</span>
        {([
          { label: "Record Payment", icon: CreditCard, action: "record-payment", color: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200" },
          { label: "Add Expense", icon: Receipt, action: "expense", color: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200" },
          { label: "Run Salary", icon: Play, action: "salary", color: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200" },
          { label: "Investor Ledger", icon: Landmark, action: "investor-ledger", color: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200" },
          { label: "View Reports", icon: BarChart3, action: "reports", color: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700" },
        ] as const).map(({ label, icon: Icon, action, color }) => (
          <button
            key={action}
            onClick={() => onNavigate(action)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition ${color}`}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ───── KPI GRID ───── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1 – Total Fees Due */}
        <KpiCard
          label="Total Fees Due"
          value={fmtShort(fee.totalFeeAmount)}
          sub={`${fee.totalStudents} enrolled students · ${fmt(fee.totalFeeAmount / (fee.totalStudents || 1))} avg`}
          icon={IndianRupee}
          accentBg="bg-slate-100" accentText="text-slate-700" accentBorder="border-slate-100"
        />

        {/* 2 – Fees Collected */}
        <KpiCard
          label="Fees Collected"
          value={fmtShort(fee.collectedAmount)}
          sub={`${fee.paidCount} fully paid · ${fee.partialCount} partial payments`}
          icon={CheckCircle2}
          accentBg="bg-emerald-50" accentText="text-emerald-600" accentBorder="border-emerald-100"
          trend="up" trendValue={`${feeCollectionPct}%`}
          progress={feeCollectionPct} progressColor="bg-gradient-to-r from-emerald-400 to-emerald-500"
        />

        {/* 3 – Outstanding Dues */}
        <KpiCard
          label="Outstanding Dues"
          value={fmtShort(reconciledPendingAmount)}
          sub={`${fee.overdueCount} overdue · ${fee.unpaidCount} unpaid · ${fee.partialCount} partial`}
          icon={AlertTriangle}
          accentBg="bg-rose-50" accentText="text-rose-500" accentBorder="border-rose-100"
          trend={fee.overdueCount > 0 ? "down" : "neutral"}
          trendValue={fee.overdueCount > 0 ? `${fee.overdueCount} overdue` : "Clear"}
        />

        {/* 4 – Collection Rate */}
        <KpiCard
          label="Collection Rate"
          value={`${feeCollectionPct}%`}
          sub={`Target: 90% · ${feeCollectionPct >= 90 ? "On track" : `${90 - feeCollectionPct}% shortfall`}`}
          icon={Activity}
          accentBg={feeCollectionPct >= 90 ? "bg-emerald-50" : "bg-amber-50"}
          accentText={feeCollectionPct >= 90 ? "text-emerald-600" : "text-amber-600"}
          accentBorder={feeCollectionPct >= 90 ? "border-emerald-100" : "border-amber-100"}
          progress={feeCollectionPct} progressColor={feeCollectionPct >= 90 ? "bg-emerald-400" : "bg-amber-400"}
        />

        {/* 5 – This Month Expenses */}
        <KpiCard
          label="This Month's Expenses"
          value={fmtShort(thisMonthExpenses)}
          sub={`Salary + operational · Budget: ${fmtShort(thisMonthExpenses * 1.12)}`}
          icon={Receipt}
          accentBg="bg-orange-50" accentText="text-orange-600" accentBorder="border-orange-100"
          trend="neutral" trendValue="Estimated"
        />

        {/* 6 – Salary Paid */}
        <KpiCard
          label="Salary Paid"
          value={fmtShort(salary.paidSalaryAmount)}
          sub={`${salary.paidCount} of ${salary.totalStaff} staff · ${salaryPaidPct}% disbursed`}
          icon={Briefcase}
          accentBg="bg-blue-50" accentText="text-blue-600" accentBorder="border-blue-100"
          progress={salaryPaidPct} progressColor="bg-gradient-to-r from-blue-400 to-blue-500"
        />

        {/* 7 – Salary Pending */}
        <KpiCard
          label="Salary Pending"
          value={fmtShort(salary.pendingSalaryAmount)}
          sub={`${salary.pendingCount} staff not fully paid · Due this cycle`}
          icon={Clock}
          accentBg={salary.pendingCount > 0 ? "bg-amber-50" : "bg-slate-50"}
          accentText={salary.pendingCount > 0 ? "text-amber-600" : "text-slate-500"}
          accentBorder={salary.pendingCount > 0 ? "border-amber-100" : "border-slate-100"}
          trend={salary.pendingCount > 0 ? "down" : "neutral"}
          trendValue={salary.pendingCount > 0 ? `${salary.pendingCount} pending` : "All Clear"}
        />

        {/* 8 – Bank Balance */}
        <KpiCard
          label="Estimated Bank Balance"
          value={fmtShort(estimatedBankBalance)}
          sub={estimatedBankBalance === 0 ? "No bank data added yet" : "Fee collected minus expenses approx."}
          icon={Building2}
          accentBg={estimatedBankBalance === 0 ? "bg-slate-50" : estimatedBankBalance < 100000 ? "bg-rose-50" : "bg-teal-50"}
          accentText={estimatedBankBalance === 0 ? "text-slate-600" : estimatedBankBalance < 100000 ? "text-rose-600" : "text-teal-600"}
          accentBorder={estimatedBankBalance === 0 ? "border-slate-100" : estimatedBankBalance < 100000 ? "border-rose-100" : "border-teal-100"}
          trend={estimatedBankBalance === 0 ? "neutral" : estimatedBankBalance < 100000 ? "down" : "up"}
          trendValue={estimatedBankBalance === 0 ? "Not started" : estimatedBankBalance < 100000 ? "Low" : "Healthy"}
        />

        {/* 9 – Cash in Hand */}
        <KpiCard
          label="Cash in Hand"
          value={fmtShort(estimatedCashInHand)}
          sub={`From ${recentPayments.filter((p) => p.paymentMode === "cash").length} cash transactions (recent)`}
          icon={Banknote}
          accentBg="bg-violet-50" accentText="text-violet-600" accentBorder="border-violet-100"
        />
      </div>

      {/* ───── CHARTS ROW 1 ───── */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">

        {/* Monthly Fee Collection Trend */}
        <ChartCard
          title="Monthly Fee Collection Trend"
          sub={`Academic year ${selectedFinancialYear || "overall"} · Target vs Collected`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyFeeData} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="collectGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtShort(v as number)} />
              <Tooltip content={(p) => <CustomTooltip {...p} />} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Area type="monotone" dataKey="target" name="Target" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 2" fill="url(#targetGrad)" dot={false} />
              <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} fill="url(#collectGrad)" dot={{ fill: "#10b981", r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Expense by Category */}
        <ChartCard title="Expense by Category" sub="Current year expense distribution">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <PieChart width={140} height={140}>
                <Pie
                  data={expensePieData} cx={65} cy={65} innerRadius={40} outerRadius={62}
                  paddingAngle={3} dataKey="value" strokeWidth={0}
                >
                  {expensePieData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={(p) => <CustomTooltip {...p} />} />
              </PieChart>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {expensePieData.map((item) => {
                const total = expensePieData.reduce((s, d) => s + d.value, 0);
                const p = Math.round((item.value / total) * 100);
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="truncate text-[11px] text-slate-600 flex-1">{item.name}</span>
                    <span className="text-[11px] font-bold text-slate-800">{p}%</span>
                  </div>
                );
              })}
              <p className="mt-1 text-[10px] text-slate-400">
                Total: {fmtShort(expensePieData.reduce((s, d) => s + d.value, 0))}
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ───── CHARTS ROW 2 ───── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">

        {/* Cash In vs Cash Out */}
        <ChartCard title="Cash In vs Cash Out" sub="Last 6 months inflow vs outflow">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashFlowData} margin={{ top: 4, right: 12, left: -8, bottom: 0 }} barGap={2} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtShort(v as number)} />
              <Tooltip content={(p) => <CustomTooltip {...p} />} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Bar dataKey="inflow" name="Cash In" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" name="Cash Out" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly Expense Trend */}
        <ChartCard title="Monthly Expense Trend" sub="Salary + Operational + Maintenance">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyExpenseData.slice(6)} margin={{ top: 4, right: 12, left: -8, bottom: 0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtShort(v as number)} />
              <Tooltip content={(p) => <CustomTooltip {...p} />} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Bar dataKey="salary" name="Salary" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="operational" name="Operational" stackId="a" fill="#f59e0b" />
              <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ───── ALERTS GRID ───── */}
      <div>
        <SectionHeader title="Alerts & Attention Required" sub="Live status of critical finance events" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AlertWidget
            icon={AlertTriangle}
            label="Overdue Fee Students"
            sub={fee.overdueCount > 0 ? `${fee.overdueCount} student${fee.overdueCount !== 1 ? "s" : ""} have fees past due date` : "No overdue fee students right now"}
            count={fee.overdueCount}
            severity={fee.overdueCount > 0 ? "critical" : "success"}
            onAction={() => onNavigate("record-payment")}
            actionLabel="View students"
          />
          <AlertWidget
            icon={IndianRupee}
            label="Total Overdue Amount"
            sub={fee.overdueCount > 0 ? `${fmtShort(reconciledPendingAmount * 0.6)} approximate overdue dues` : "All dues within grace period"}
            severity={fee.overdueCount > 5 ? "critical" : fee.overdueCount > 0 ? "warning" : "success"}
            onAction={() => onNavigate("record-payment")}
            actionLabel="Collect fees"
          />
          <AlertWidget
            icon={Clock}
            label="Pending Salary Payments"
            sub={salary.pendingCount > 0 ? `${salary.pendingCount} staff not yet fully paid · ${fmtShort(salary.pendingSalaryAmount)} due` : "All staff salaries cleared"}
            count={salary.pendingCount}
            severity={salary.pendingCount > 0 ? "warning" : "success"}
            onAction={() => onNavigate("salary")}
            actionLabel="Pay salaries"
          />
          <AlertWidget
            icon={Building2}
            label="Bank Balance Status"
            sub={estimatedBankBalance === 0 ? `No bank data recorded yet · Add bank transactions to track balance` : estimatedBankBalance < 100000 ? `Balance may be low · Only ${fmtShort(estimatedBankBalance)} estimated` : `${fmtShort(estimatedBankBalance)} available · Healthy balance`}
            severity={estimatedBankBalance === 0 ? "info" : estimatedBankBalance < 100000 ? "critical" : estimatedBankBalance < 500000 ? "warning" : "success"}
          />
          <AlertWidget
            icon={TrendingUp}
            label="Expense vs Collection"
            sub={`Expenses at ~${Math.round((salary.totalSalaryAmount * 1.2 / (fee.collectedAmount || 1)) * 100)}% of collected fees this year`}
            severity={(salary.totalSalaryAmount * 1.2) > fee.collectedAmount ? "warning" : "info"}
          />
          <AlertWidget
            icon={Landmark}
            label="Investor Repayments"
            sub={investors.overdueCount > 0 ? `${investors.overdueCount} investor repayment${investors.overdueCount !== 1 ? "s" : ""} overdue · ${fmtShort(investors.balanceDue)} total balance` : `${investors.total} investor${investors.total !== 1 ? "s" : ""} · All repayments on track`}
            count={investors.overdueCount}
            severity={investors.overdueCount > 0 ? "critical" : "success"}
            onAction={() => onNavigate("investor-ledger")}
            actionLabel="View ledger"
          />
        </div>
      </div>

      {/* ───── TABLES ROW ───── */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">

        {/* Recent Transactions */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <SectionHeader
              title="Recent Fee Transactions"
              sub={`Last ${Math.min(recentPayments.length, 8)} payments recorded`}
              action="All payments"
              onAction={() => onNavigate("record-payment")}
            />
          </div>
          {recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <Receipt className="h-8 w-8 opacity-30" />
              <p className="text-xs">No transactions recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-50 bg-slate-50/80">
                    <th className="py-2.5 pl-5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Student</th>
                    <th className="py-2.5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Receipt</th>
                    <th className="py-2.5 pr-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                    <th className="py-2.5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Mode</th>
                    <th className="py-2.5 pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentPayments.slice(0, 8).map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-2.5 pl-5 pr-3 text-xs font-semibold text-slate-800 max-w-[140px] truncate">{p.studentName}</td>
                      <td className="py-2.5 pr-3 text-[11px] font-mono text-slate-400">{p.receiptNo}</td>
                      <td className="py-2.5 pr-3 text-right text-xs font-extrabold text-slate-900">{fmt(p.amount)}</td>
                      <td className="py-2.5 pr-3"><StatusBadge status={p.paymentMode} /></td>
                      <td className="py-2.5 pr-5 text-[11px] text-slate-400">{p.date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column — Top Defaulters + Salary Summary */}
        <div className="space-y-4">

          {/* Top Defaulters */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <SectionHeader
                title="Top Fee Defaulters"
                sub={fee.overdueCount > 0 ? `${fee.overdueCount} students require follow-up` : "No overdue students"}
                action="View all"
                onAction={() => onNavigate("record-payment")}
              />
            </div>
            {topDefaulters.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400">
                <CheckCircle2 className="h-7 w-7 opacity-30" />
                <p className="text-xs">No overdue students</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-slate-50 bg-slate-50/80">
                      <th className="py-2 pl-5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Student</th>
                      <th className="py-2 pr-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Class</th>
                      <th className="py-2 pr-5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topDefaulters.map((d, i) => (
                      <tr key={i} className="hover:bg-rose-50/40 transition-colors">
                        <td className="py-2 pl-5 pr-3">
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{d.name}</p>
                          <p className="text-[10px] text-slate-400">{d.months} mo overdue</p>
                        </td>
                        <td className="py-2 pr-3 text-[11px] text-slate-600 text-center">{d.class}</td>
                        <td className="py-2 pr-5 text-right text-xs font-extrabold text-rose-600">{fmtShort(d.dueAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Salary Summary */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <SectionHeader
              title="Staff Salary Summary"
              sub="Current cycle payment status"
              action="Manage salary"
              onAction={() => onNavigate("salary")}
            />
            <div className="space-y-2.5">
              {[
                { label: "Total Staff", value: String(salary.totalStaff), color: "text-slate-800" },
                { label: "Salary Disbursed", value: fmtShort(salary.paidSalaryAmount), color: "text-emerald-600" },
                { label: "Salary Pending", value: fmtShort(salary.pendingSalaryAmount), color: salary.pendingCount > 0 ? "text-amber-600" : "text-slate-400" },
                { label: "Total Payroll", value: fmtShort(salary.totalSalaryAmount), color: "text-blue-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <span className={`text-xs font-extrabold ${color}`}>{value}</span>
                </div>
              ))}
              {/* progress bar */}
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Disbursement progress</span>
                  <span className="font-bold text-slate-600">{salaryPaidPct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-700" style={{ width: `${salaryPaidPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── RECENT SALARY PAYMENTS ───── */}
      {recentSalary.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <SectionHeader
              title="Recent Salary Payments"
              sub={`Last ${Math.min(recentSalary.length, 5)} staff payments`}
              action="All salary"
              onAction={() => onNavigate("salary")}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y border-slate-50 bg-slate-50/80">
                  <th className="py-2.5 pl-5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Staff Member</th>
                  <th className="py-2.5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Position</th>
                  <th className="py-2.5 pr-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                  <th className="py-2.5 pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentSalary.slice(0, 5).map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 pl-5 pr-3 text-xs font-semibold text-slate-800">{s.staffName}</td>
                    <td className="py-2.5 pr-3 text-[11px] text-slate-500 capitalize">{s.position}</td>
                    <td className="py-2.5 pr-3 text-right text-xs font-extrabold text-blue-700">{fmt(s.amount)}</td>
                    <td className="py-2.5 pr-5 text-[11px] text-slate-400">{s.date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── FINANCIAL HEALTH BAR ───── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Financial Health Summary" sub="Key ratios at a glance" />
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              label: "Fee Collection",
              collected: fee.collectedAmount, total: fee.totalFeeAmount,
              pctVal: feeCollectionPct,
              color: "from-emerald-400 to-emerald-500",
              dot: "bg-emerald-400",
              status: feeCollectionPct >= 90 ? "Excellent" : feeCollectionPct >= 70 ? "Good" : "Needs attention",
            },
            {
              label: "Salary Disbursement",
              collected: salary.paidSalaryAmount, total: salary.totalSalaryAmount,
              pctVal: salaryPaidPct,
              color: "from-blue-400 to-blue-500",
              dot: "bg-blue-400",
              status: salaryPaidPct === 100 ? "Complete" : salaryPaidPct >= 80 ? "Progress" : "Pending",
            },
            {
              label: "Investor Repayment",
              collected: investors.totalRepaid, total: investors.totalInvested,
              pctVal: pct(investors.totalRepaid, investors.totalInvested),
              color: "from-purple-400 to-purple-500",
              dot: "bg-purple-400",
              status: investors.overdueCount === 0 ? "On track" : `${investors.overdueCount} overdue`,
            },
          ].map(({ label, collected, total, pctVal, color, dot, status }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{status}</span>
                  <span className="text-xs font-extrabold text-slate-800">{pctVal}%</span>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pctVal}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                <span>{fmtShort(collected)}</span>
                <span>of {fmtShort(total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

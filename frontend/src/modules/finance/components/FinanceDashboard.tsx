import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Briefcase,
  Landmark,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  IndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { API_URL } from "@/lib/api";

/* ─────────────────────────────── types ─────────────────────────────── */

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

/* ─────────────────────────────── helpers ─────────────────────────────── */

const fmt = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const fmtShort = (value: number): string => {
  const n = Number(value || 0);
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const pct = (part: number, total: number) =>
  total > 0 ? Math.min(Math.round((part / total) * 100), 100) : 0;

const modeIcon: Record<string, string> = {
  upi: "UPI",
  cash: "CASH",
  card: "CARD",
  cheque: "CHQ",
  bank_transfer: "NEFT",
};

/* ─────────────────────────────── sub-components ─────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  progress,
  progressLabel,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: React.ElementType;
  progress?: number;
  progressLabel?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${accent}`}
    >
      {/* background glow */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl bg-current" />

      <div className="flex items-start justify-between">
        <div
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 shadow-sm`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
        {trend === "down" && <TrendingDown className="h-4 w-4 text-rose-500" />}
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{sub}</p>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{progressLabel}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full bg-current transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  sub,
  action,
  onAction,
}: {
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    cash: "bg-slate-100 text-slate-700",
    upi: "bg-blue-50 text-blue-700",
    card: "bg-purple-50 text-purple-700",
    cheque: "bg-amber-50 text-amber-700",
    bank_transfer: "bg-teal-50 text-teal-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        map[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {modeIcon[status] ?? status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border bg-white p-5 animate-pulse">
      <div className="h-11 w-11 rounded-xl bg-slate-100" />
      <div className="mt-4 h-7 w-32 rounded-lg bg-slate-100" />
      <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
      <div className="mt-1 h-3 w-40 rounded bg-slate-100" />
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100" />
    </div>
  );
}

/* ─────────────────────────────── main component ─────────────────────────────── */

export default function FinanceDashboard({ onNavigate, selectedFinancialYear = "", onFinancialYearChange }: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);

  const fetchAvailableYears = useCallback(async () => {
    setYearsLoading(true);
    try {
      const school = JSON.parse(localStorage.getItem("school") || "null") as { _id?: string } | null;
      if (!school?._id) return;
      
      const res = await fetch(`${API_URL}/api/finance/${school._id}/available-years`);
      if (!res.ok) throw new Error(`Failed to fetch years: ${res.status}`);
      const data = (await res.json()) as { years: string[] };
      setAvailableYears(data.years || []);
      
      // Set default year to latest if not already selected
      if (!selectedFinancialYear && data.years && data.years.length > 0) {
        onFinancialYearChange?.(data.years[0]);
      }
    } catch (err) {
      console.error("Failed to load available years:", err);
    } finally {
      setYearsLoading(false);
    }
  }, [selectedFinancialYear, onFinancialYearChange]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const school = JSON.parse(localStorage.getItem("school") || "null") as { _id?: string } | null;
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }
      
      let url = `${API_URL}/api/finance/${school._id}/dashboard-summary`;
      if (selectedFinancialYear) {
        url += `?academicYear=${encodeURIComponent(selectedFinancialYear)}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = (await res.json()) as DashboardSummary;
      setSummary(data);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [selectedFinancialYear]);

  useEffect(() => {
    void fetchAvailableYears();
  }, [fetchAvailableYears]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary, refreshKey, selectedFinancialYear]);

  /* ── computed ── */
  const feeCollectionPct = summary ? pct(summary.fee.collectedAmount, summary.fee.totalFeeAmount) : 0;
  const salaryPaidPct = summary ? pct(summary.salary.paidSalaryAmount, summary.salary.totalSalaryAmount) : 0;

  /* ── skeleton ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-2xl border bg-white animate-pulse" />
          <div className="h-64 rounded-2xl border bg-white animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── error ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <XCircle className="h-8 w-8" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{error}</p>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const { fee, salary, investors, recentPayments, recentSalary } = summary;

  return (
    <div className="space-y-6">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Finance Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated view across fees, salary, and investor ledger
            {lastRefreshed && (
              <> &middot; Updated {lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Financial Year Selector */}
          <select
            value={selectedFinancialYear}
            onChange={(e) => onFinancialYearChange?.(e.target.value)}
            disabled={yearsLoading || availableYears.length === 0}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select Financial Year</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Fees Collected */}
        <KpiCard
          label="Fees Collected"
          value={fmtShort(fee.collectedAmount)}
          sub={`of ${fmtShort(fee.totalFeeAmount)} total · ${fee.paidCount} fully paid`}
          accent="border-emerald-100 text-emerald-600"
          icon={IndianRupee}
          progress={feeCollectionPct}
          progressLabel="Collection rate"
          trend="up"
        />

        {/* Pending Fees */}
        <KpiCard
          label="Pending / Overdue Fees"
          value={fmtShort(fee.pendingAmount)}
          sub={`${fee.overdueCount} overdue · ${fee.partialCount} partial · ${fee.unpaidCount} unpaid`}
          accent="border-amber-100 text-amber-600"
          icon={AlertTriangle}
          trend={fee.overdueCount > 0 ? "down" : "neutral"}
        />

        {/* Salary Status */}
        <KpiCard
          label="Salary Paid"
          value={fmtShort(salary.paidSalaryAmount)}
          sub={`${salary.paidCount} of ${salary.totalStaff} staff · ${fmtShort(salary.pendingSalaryAmount)} pending`}
          accent="border-blue-100 text-blue-600"
          icon={Briefcase}
          progress={salaryPaidPct}
          progressLabel="Salary disbursed"
        />

        {/* Investor Balance */}
        <KpiCard
          label="Investor Balance Due"
          value={fmtShort(investors.balanceDue)}
          sub={`${investors.total} investor${investors.total !== 1 ? "s" : ""} · ${fmtShort(investors.totalRepaid)} repaid`}
          accent={`border-purple-100 text-purple-600 ${investors.overdueCount > 0 ? "ring-1 ring-rose-300" : ""}`}
          icon={Landmark}
          trend={investors.overdueCount > 0 ? "down" : "neutral"}
        />
      </div>

      {/* ── PROGRESS OVERVIEW BAR ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Financial Health Overview</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Fee */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Fee Collection
              </span>
              <span className="text-xs font-bold text-slate-800">{feeCollectionPct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                style={{ width: `${feeCollectionPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
              <span>Collected {fmt(fee.collectedAmount)}</span>
              <span>Total {fmtShort(fee.totalFeeAmount)}</span>
            </div>
          </div>

          {/* Salary */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                Salary Disbursed
              </span>
              <span className="text-xs font-bold text-slate-800">{salaryPaidPct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-700"
                style={{ width: `${salaryPaidPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
              <span>Paid {fmtShort(salary.paidSalaryAmount)}</span>
              <span>Total {fmtShort(salary.totalSalaryAmount)}</span>
            </div>
          </div>

          {/* Investor Repayment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />
                Investor Repayment
              </span>
              <span className="text-xs font-bold text-slate-800">
                {pct(investors.totalRepaid, investors.totalInvested)}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-700"
                style={{ width: `${pct(investors.totalRepaid, investors.totalInvested)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
              <span>Repaid {fmtShort(investors.totalRepaid)}</span>
              <span>Invested {fmtShort(investors.totalInvested)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT ACTIVITY + ALERTS ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">

        {/* Recent Fee Payments */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <SectionHeader
              title="Recent Fee Payments"
              sub="Last 6 transactions recorded"
              action="All payments"
              onAction={() => onNavigate("record-payment")}
            />
          </div>
          {recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
              <CheckCircle2 className="h-8 w-8 opacity-30" />
              <p className="text-xs">No payments recorded yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-50 bg-slate-50/60">
                  <th className="py-2 pl-5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Student</th>
                  <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Receipt</th>
                  <th className="py-2 pr-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                  <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Mode</th>
                  <th className="py-2 pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 pl-5 pr-3 font-medium text-slate-800 text-xs max-w-[140px] truncate">{p.studentName}</td>
                    <td className="py-2.5 pr-3 text-slate-400 text-[11px] font-mono">{p.receiptNo}</td>
                    <td className="py-2.5 pr-3 text-right font-bold text-slate-900 text-xs">{fmt(p.amount)}</td>
                    <td className="py-2.5 pr-3"><StatusPill status={p.paymentMode} /></td>
                    <td className="py-2.5 pr-5 text-slate-400 text-[11px]">{p.date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right panel — Alerts + Quick Actions */}
        <div className="space-y-4">

          {/* Alerts */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <SectionHeader title="Alerts & Status" />
            <div className="space-y-2.5">

              {/* Overdue fees */}
              <div className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${fee.overdueCount > 0 ? "bg-rose-50" : "bg-slate-50"}`}>
                <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${fee.overdueCount > 0 ? "text-rose-500" : "text-slate-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">Overdue Fee Students</p>
                  <p className="text-[11px] text-slate-500">{fee.overdueCount > 0 ? `${fee.overdueCount} student${fee.overdueCount > 1 ? "s" : ""} require attention` : "No overdue fees"}</p>
                </div>
                {fee.overdueCount > 0 && (
                  <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                    {fee.overdueCount}
                  </span>
                )}
              </div>

              {/* Pending salary */}
              <div className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${salary.pendingCount > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
                <Clock className={`h-4 w-4 flex-shrink-0 ${salary.pendingCount > 0 ? "text-amber-500" : "text-slate-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">Salary Pending</p>
                  <p className="text-[11px] text-slate-500">{salary.pendingCount > 0 ? `${salary.pendingCount} staff member${salary.pendingCount > 1 ? "s" : ""} not fully paid` : "All salaries cleared"}</p>
                </div>
                {salary.pendingCount > 0 && (
                  <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {salary.pendingCount}
                  </span>
                )}
              </div>

              {/* Overdue investors */}
              <div className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${investors.overdueCount > 0 ? "bg-purple-50" : "bg-slate-50"}`}>
                <Landmark className={`h-4 w-4 flex-shrink-0 ${investors.overdueCount > 0 ? "text-purple-500" : "text-slate-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">Investor Repayment Due</p>
                  <p className="text-[11px] text-slate-500">{investors.overdueCount > 0 ? `${investors.overdueCount} investor${investors.overdueCount > 1 ? "s" : ""} overdue (>45 days)` : "No overdue investors"}</p>
                </div>
                {investors.overdueCount > 0 && (
                  <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] font-bold text-white">
                    {investors.overdueCount}
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* Quick Module Access */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <SectionHeader title="Quick Access" />
            <div className="space-y-2">
              {([
                { id: "fee-structure", label: "Fee Structure", color: "text-amber-600 bg-amber-50 hover:bg-amber-100" },
                { id: "record-payment", label: "Record Payment", color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" },
                { id: "salary", label: "Salary", color: "text-blue-600 bg-blue-50 hover:bg-blue-100" },
                { id: "investor-ledger", label: "Investor Ledger", color: "text-cyan-600 bg-cyan-50 hover:bg-cyan-100" },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${item.color}`}
                >
                  {item.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── RECENT SALARY ── */}
      {recentSalary.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <SectionHeader
              title="Recent Salary Payments"
              sub="Last 5 paid salaries"
              action="Salary desk"
              onAction={() => onNavigate("salary")}
            />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-50 bg-slate-50/60">
                <th className="py-2 pl-5 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Staff</th>
                <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Position</th>
                <th className="py-2 pr-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                <th className="py-2 pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentSalary.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 pl-5 pr-3 font-medium text-slate-800 text-xs">{s.staffName}</td>
                  <td className="py-2.5 pr-3 text-slate-400 text-[11px] capitalize">{s.position || "—"}</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-slate-900 text-xs">{fmt(s.amount)}</td>
                  <td className="py-2.5 pr-5 text-slate-400 text-[11px]">{s.date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODULE SNAPSHOT CARDS ── */}
      <div className="grid gap-4 sm:grid-cols-3">

        {/* Fee snapshot */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Fee Module</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Total students</span>
              <span className="font-bold text-slate-800">{fee.totalStudents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Fully paid</span>
              <span className="font-bold text-emerald-700">{fee.paidCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Partial</span>
              <span className="font-bold text-amber-600">{fee.partialCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Overdue</span>
              <span className={`font-bold ${fee.overdueCount > 0 ? "text-rose-600" : "text-slate-400"}`}>{fee.overdueCount}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate("record-payment")}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
          >
            Record payment <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Salary snapshot */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Salary Module</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Total staff</span>
              <span className="font-bold text-slate-800">{salary.totalStaff}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Total payroll</span>
              <span className="font-bold text-blue-700">{fmtShort(salary.totalSalaryAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Paid</span>
              <span className="font-bold text-emerald-600">{fmtShort(salary.paidSalaryAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Pending payout</span>
              <span className={`font-bold ${salary.pendingSalaryAmount > 0 ? "text-amber-600" : "text-slate-400"}`}>{fmtShort(salary.pendingSalaryAmount)}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate("salary")}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
          >
            Open salary desk <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Investor snapshot */}
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Investor Ledger</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Total investors</span>
              <span className="font-bold text-slate-800">{investors.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Total invested</span>
              <span className="font-bold text-purple-700">{fmtShort(investors.totalInvested)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Total repaid</span>
              <span className="font-bold text-emerald-600">{fmtShort(investors.totalRepaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Balance due</span>
              <span className={`font-bold ${investors.balanceDue > 0 ? "text-rose-600" : "text-slate-400"}`}>{fmtShort(investors.balanceDue)}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate("investor-ledger")}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition"
          >
            Open ledger <ArrowRight className="h-3 w-3" />
          </button>
        </div>

      </div>
    </div>
  );
}

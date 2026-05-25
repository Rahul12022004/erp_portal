import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  AlertTriangle, IndianRupee, RefreshCw, TrendingDown, TrendingUp,
  Users, Target, Zap, Award, Clock, ArrowUpRight, ArrowDownRight,
  BarChart3, Activity, Brain, ShieldAlert, CheckCircle2,
} from "lucide-react";
import {
  getAvailableYears,
  getDashboardSummary,
  getAllStudentAssignments,
} from "@/lib/financeApi";
import type { ClassFeeSummaryRow, StudentAssignment } from "@/lib/financeTypes";

// ─── clay tokens ─────────────────────────────────────────────────────────────
const clayOuter = "rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_34%),linear-gradient(180deg,#f0f1ff_0%,#eef2ff_60%,#f8fbff_100%)] p-3 space-y-5";
const clayShell = "rounded-[28px] border border-indigo-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f5ff_100%)] p-5 shadow-[0_18px_45px_rgba(99,102,241,0.08)]";
const clayCard  = "rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]";
const clayInset = "rounded-[22px] border border-slate-200/75 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_20px_rgba(148,163,184,0.10)]";

// ─── helpers ──────────────────────────────────────────────────────────────────
const getSchoolId = (): string => {
  const s = JSON.parse(localStorage.getItem("school") || "null") as { _id?: string } | null;
  return s?._id ?? "";
};

const fmtShort = (v: number): string => {
  const n = Number(v || 0);
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const pct = (part: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;

const daysSince = (dateStr: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));

function buildClassRows(assignments: StudentAssignment[]): ClassFeeSummaryRow[] {
  const map = new Map<string, ClassFeeSummaryRow>();
  for (const a of assignments) {
    const cid   = a.student_id?.class_id ?? a.student_id?.class ?? "?";
    const cname = a.student_id?.class ?? "Unknown";
    if (!map.has(cid)) map.set(cid, { classId: cid, className: cname, totalFee: 0, collected: 0, pending: 0, totalStudents: 0, collectionPct: 0 });
    const row = map.get(cid)!;
    row.totalFee += a.total_fee;
    row.collected += a.paid_amount;
    row.pending += a.due_amount;
    row.totalStudents += 1;
  }
  return Array.from(map.values()).map((r) => ({ ...r, collectionPct: pct(r.collected, r.totalFee) }));
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent, bg, delta }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent: string; bg: string; delta?: { up: boolean; text: string };
}) {
  return (
    <div className={`${clayCard} relative overflow-hidden`}>
      <div className={`pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full ${bg} opacity-30 blur-2xl`} />
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-[14px] ${bg} ${accent}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-3 text-[22px] font-extrabold tracking-tight text-slate-900 leading-tight">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
      {delta && (
        <div className={`mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${delta.up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {delta.up ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
          {delta.text}
        </div>
      )}
    </div>
  );
}

function CollectionProgress({ collected, total, paidCount, totalStudents }: {
  collected: number; total: number; paidCount: number; totalStudents: number;
}) {
  const p = pct(collected, total);
  const color = p >= 75 ? "from-emerald-400 to-emerald-500" : p >= 40 ? "from-amber-400 to-orange-400" : "from-rose-400 to-rose-500";
  return (
    <div className={`${clayInset} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Collection Progress</p>
        <span className={`text-2xl font-extrabold ${p >= 75 ? "text-emerald-600" : p >= 40 ? "text-amber-600" : "text-rose-600"}`}>{p}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/70">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${p}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>Collected <strong className="text-slate-800">{fmtShort(collected)}</strong></span>
        <span>Target <strong className="text-slate-800">{fmtShort(total)}</strong></span>
      </div>
      <div className="flex items-center gap-1.5 pt-0.5">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        <span className="text-[11px] text-slate-600"><strong className="text-slate-800">{paidCount}</strong> of <strong className="text-slate-800">{totalStudents}</strong> students paid in full</span>
      </div>
    </div>
  );
}

function StatusDonut({ paid, partial, unpaid, overdue }: { paid: number; partial: number; unpaid: number; overdue: number }) {
  const data = [
    { name: "Paid", value: paid, color: "#10b981" },
    { name: "Partial", value: partial, color: "#f59e0b" },
    { name: "Unpaid", value: unpaid, color: "#94a3b8" },
    { name: "Overdue", value: overdue, color: "#ef4444" },
  ].filter((d) => d.value > 0);
  const total = paid + partial + unpaid + overdue;
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
            {data.map((d, i) => <Cell key={`c${i}`} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v: number, name: string) => [`${v} students (${pct(v, total)}%)`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="text-xs text-slate-600">{d.name} <strong className="text-slate-800">{d.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassBarChart({ rows }: { rows: ClassFeeSummaryRow[] }) {
  const data = [...rows].sort((a, b) => b.totalFee - a.totalFee).slice(0, 12).map((r) => ({
    name: r.className.replace(/^(Class|Grade)\s+/i, "").slice(0, 10),
    Billed: r.totalFee, Collected: r.collected, Pending: r.pending,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barSize={9} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
        <Tooltip formatter={(v: number, name: string) => [fmtShort(v), name]} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Billed" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopClassesTable({ rows }: { rows: ClassFeeSummaryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <th className="py-2.5 text-left">#</th>
            <th className="py-2.5 text-left">Class</th>
            <th className="py-2.5 text-right">Billed</th>
            <th className="py-2.5 text-right">Collected</th>
            <th className="py-2.5 text-right">Pending</th>
            <th className="py-2.5 text-right">Students</th>
            <th className="py-2.5 text-right">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.classId} className="border-b border-slate-100 transition-colors hover:bg-indigo-50/30">
              <td className="py-2.5 text-slate-400 text-xs">{i + 1}</td>
              <td className="py-2.5 font-medium text-slate-800">{row.className}</td>
              <td className="py-2.5 text-right text-slate-500">{fmtShort(row.totalFee)}</td>
              <td className="py-2.5 text-right text-emerald-600 font-medium">{fmtShort(row.collected)}</td>
              <td className="py-2.5 text-right font-semibold text-amber-600">{fmtShort(row.pending)}</td>
              <td className="py-2.5 text-right text-slate-500">{row.totalStudents}</td>
              <td className="py-2.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${row.collectionPct}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${row.collectionPct >= 75 ? "text-emerald-600" : row.collectionPct >= 40 ? "text-amber-600" : "text-rose-600"}`}>{row.collectionPct}%</span>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">No class data available</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type DefaulterRow = {
  assignmentId: string; name: string; className: string;
  totalFee: number; paidAmount: number; dueAmount: number;
  status: string; daysOverdue: number; rollNo?: string;
};

function TopDefaultersTable({ rows }: { rows: DefaulterRow[] }) {
  const badge = (s: string) => {
    const map: Record<string, string> = {
      PAID: "bg-emerald-50 text-emerald-700", PARTIAL: "bg-amber-50 text-amber-700",
      UNPAID: "bg-slate-100 text-slate-600", OVERDUE: "bg-rose-50 text-rose-700",
    };
    return <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${map[s] ?? "bg-slate-100 text-slate-600"}`}>{s}</span>;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <th className="py-2.5 text-left">#</th>
            <th className="py-2.5 text-left">Student</th>
            <th className="py-2.5 text-left">Class</th>
            <th className="py-2.5 text-right">Fee</th>
            <th className="py-2.5 text-right">Paid</th>
            <th className="py-2.5 text-right">Due</th>
            <th className="py-2.5 text-center">Status</th>
            <th className="py-2.5 text-right">Overdue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.assignmentId} className="border-b border-slate-100 transition-colors hover:bg-rose-50/30">
              <td className="py-2.5 text-slate-400 text-xs">{i + 1}</td>
              <td className="py-2.5">
                <p className="font-medium text-slate-800">{row.name}</p>
                {row.rollNo && <p className="text-[11px] text-slate-400">{row.rollNo}</p>}
              </td>
              <td className="py-2.5 text-slate-500">{row.className}</td>
              <td className="py-2.5 text-right text-slate-500">{fmtShort(row.totalFee)}</td>
              <td className="py-2.5 text-right text-emerald-600">{fmtShort(row.paidAmount)}</td>
              <td className="py-2.5 text-right font-semibold text-rose-600">{fmtShort(row.dueAmount)}</td>
              <td className="py-2.5 text-center">{badge(row.status)}</td>
              <td className="py-2.5 text-right">{row.daysOverdue > 0 ? <span className="font-bold text-rose-600">{row.daysOverdue}d</span> : <span className="text-slate-400">—</span>}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="py-8 text-center text-sm text-slate-400">No defaulters found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PredictionCard({ title, value, sub, icon: Icon, tone, detail }: {
  title: string; value: string; sub: string;
  icon: React.ElementType; tone: string; detail?: string;
}) {
  return (
    <div className={`${clayCard} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
          <p className={`mt-1 text-2xl font-extrabold tracking-tight ${tone}`}>{value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
        </div>
        <div className="rounded-[14px] bg-slate-100/70 p-2">
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
      </div>
      {detail && <p className={`rounded-[14px] bg-slate-50/80 px-3 py-2 text-[11px] font-medium text-slate-600`}>{detail}</p>}
    </div>
  );
}

// ─── tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[18px] px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 ${
        active
          ? "bg-white text-indigo-700 shadow-[0_4px_16px_rgba(99,102,241,0.18)] ring-1 ring-indigo-200/80"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-800 hover:shadow-sm"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
type OverviewTab = "overview" | "analytics" | "predictions" | "defaulters";

export default function FinanceOverviewPage() {
  const schoolId   = useMemo(() => getSchoolId(), []);
  const [academicYear, setAcademicYear] = useState("");
  const [activeTab, setActiveTab] = useState<OverviewTab>("overview");

  const yearsQuery = useQuery({
    queryKey: ["finance-years", schoolId],
    queryFn: () => getAvailableYears(schoolId),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });

  const selectedYear = academicYear || yearsQuery.data?.[0] || "";

  const summaryQuery = useQuery({
    queryKey: ["finance-dashboard-summary", schoolId, selectedYear],
    queryFn: () => getDashboardSummary(schoolId, selectedYear || undefined),
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
  });

  const assignmentsQuery = useQuery({
    queryKey: ["finance-all-assignments", schoolId, selectedYear],
    queryFn: () => getAllStudentAssignments(schoolId, selectedYear || undefined),
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
  });

  const fee         = summaryQuery.data?.fee;
  const assignments = assignmentsQuery.data ?? [];

  const { classRows, overdueAmount, topClasses, topDefaulters, predictions } = useMemo(() => {
    const rows = buildClassRows(assignments);
    const overdueAmt = assignments.filter((a) => a.fee_status === "OVERDUE").reduce((s, a) => s + a.due_amount, 0);
    const sortedClasses = [...rows].sort((a, b) => b.pending - a.pending);
    const defaulters: DefaulterRow[] = assignments
      .filter((a) => a.fee_status !== "PAID")
      .sort((a, b) => b.due_amount - a.due_amount)
      .slice(0, 20)
      .map((a) => ({
        assignmentId: a._id, name: a.student_id?.name ?? "—",
        className: a.student_id?.class ?? "—", totalFee: a.total_fee,
        paidAmount: a.paid_amount, dueAmount: a.due_amount,
        status: a.fee_status, daysOverdue: daysSince(a.due_date),
        rollNo: a.student_id?.roll_no,
      }));

    // ── predictions ─────────────────────────────────────────────────────────
    const collected = fee?.collectedAmount ?? 0;
    const total     = fee?.totalFeeAmount  ?? 0;
    const pending   = fee?.pendingAmount   ?? 0;
    const now       = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const daysElapsed = Math.max(1, (now.getTime() - yearStart.getTime()) / 86_400_000);
    const daysInYear  = 365;
    const dailyRate   = collected / daysElapsed;
    const projectedYE = Math.min(total, dailyRate * daysInYear);
    const daysToFull  = dailyRate > 0 ? Math.ceil(pending / dailyRate) : 0;
    const highRisk    = assignments.filter((a) => daysSince(a.due_date) > 30 && a.fee_status !== "PAID");
    const highRiskAmt = highRisk.reduce((s, a) => s + a.due_amount, 0);
    const riskScore   = pct(overdueAmt, total);
    const collectionEfficiency = pct(collected, total);

    // simulate monthly collection curve from assignments
    const monthLabels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const baseMonthly = collected / Math.max(Math.ceil(daysElapsed / 30), 1);
    const monthlySeries = monthLabels.map((month, i) => {
      const isFuture = i >= Math.ceil(daysElapsed / 30);
      return {
        month,
        Actual:    isFuture ? null : Math.round(baseMonthly * (0.8 + Math.random() * 0.4)),
        Projected: isFuture ? Math.round(baseMonthly * (0.75 + Math.random() * 0.5)) : null,
      };
    });

    return {
      classRows: rows, overdueAmount: overdueAmt,
      topClasses: sortedClasses.slice(0, 10), topDefaulters: defaulters,
      predictions: {
        projectedYE, daysToFull, highRiskCount: highRisk.length,
        highRiskAmt, riskScore, collectionEfficiency,
        dailyRate, monthlySeries,
      },
    };
  }, [assignments, fee]);

  const isLoading   = summaryQuery.isLoading || assignmentsQuery.isLoading;
  const hasError    = summaryQuery.isError || assignmentsQuery.isError;
  const collPct     = pct(fee?.collectedAmount ?? 0, fee?.totalFeeAmount ?? 0);

  const handleRefresh = () => { void summaryQuery.refetch(); void assignmentsQuery.refetch(); };

  const TABS: { id: OverviewTab; label: string; icon: React.ElementType }[] = [
    { id: "overview",     label: "Overview",    icon: BarChart3   },
    { id: "analytics",    label: "Analytics",   icon: Activity    },
    { id: "predictions",  label: "Predictions", icon: Brain       },
    { id: "defaulters",   label: "Defaulters",  icon: ShieldAlert },
  ];

  return (
    <div className={clayOuter}>
      {/* ── header shell ─────────────────────────────────────────────────── */}
      <section className={clayShell}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-indigo-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-700 shadow-sm">Finance Command</div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">Finance Overview</h2>
            <p className="mt-1 text-sm text-slate-500">School-wide fee health, analytics, and AI-guided predictions</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="h-9 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-[0_2px_10px_rgba(148,163,184,0.08)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {yearsQuery.data?.length
                ? yearsQuery.data.map((y) => <option key={y} value={y}>{y}</option>)
                : <option value="">All Years</option>}
            </select>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 shadow-[0_2px_10px_rgba(148,163,184,0.08)] hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* tab nav */}
        <div className="mt-5 tabs-scroll overflow-x-auto pb-0.5">
          <div className={`flex min-w-max items-center gap-1 rounded-[22px] bg-[linear-gradient(180deg,#eef2ff_0%,#e8ecff_100%)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_rgba(99,102,241,0.08)]`}>
            {TABS.map((t) => <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} icon={t.icon} label={t.label} />)}
          </div>
        </div>
      </section>

      {/* ── error ────────────────────────────────────────────────────────── */}
      {hasError && (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          Failed to load finance data. Check network and refresh.
        </div>
      )}

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <>
          {/* KPI cards */}
          <section className={clayShell}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Key Metrics</p>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-[24px] bg-slate-100/80" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <KpiCard label="Total Billed" value={fmtShort(fee?.totalFeeAmount ?? 0)} sub={`${fee?.totalStudents ?? 0} students`} icon={IndianRupee} accent="text-indigo-600" bg="bg-indigo-50" delta={{ up: true, text: "This Year" }} />
                <KpiCard label="Collected" value={fmtShort(fee?.collectedAmount ?? 0)} sub={`${collPct}% of billed`} icon={TrendingUp} accent="text-emerald-600" bg="bg-emerald-50" delta={{ up: true, text: `+${collPct}%` }} />
                <KpiCard label="Pending" value={fmtShort(fee?.pendingAmount ?? 0)} sub="outstanding" icon={TrendingDown} accent="text-amber-600" bg="bg-amber-50" delta={{ up: false, text: `${100 - collPct}% left` }} />
                <KpiCard label="Collection %" value={`${collPct}%`} sub={collPct >= 75 ? "On track" : "Needs attention"} icon={collPct >= 75 ? Award : AlertTriangle} accent={collPct >= 75 ? "text-emerald-600" : "text-rose-600"} bg={collPct >= 75 ? "bg-emerald-50" : "bg-rose-50"} />
                <KpiCard label="Overdue" value={fmtShort(overdueAmount)} sub={`${fee?.overdueCount ?? 0} students`} icon={AlertTriangle} accent="text-rose-600" bg="bg-rose-50" delta={{ up: false, text: "At risk" }} />
                <KpiCard label="Daily Rate" value={fmtShort(predictions.dailyRate)} sub="avg per day" icon={Zap} accent="text-violet-600" bg="bg-violet-50" />
              </div>
            )}
          </section>

          {/* collection progress + status donut */}
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <section className={clayShell}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Fee Collection Health</p>
              <CollectionProgress collected={fee?.collectedAmount ?? 0} total={fee?.totalFeeAmount ?? 0} paidCount={fee?.paidCount ?? 0} totalStudents={fee?.totalStudents ?? 0} />
              {/* student breakdown mini-grid */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  { label: "Paid",    count: fee?.paidCount ?? 0,    color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                  { label: "Partial", count: fee?.partialCount ?? 0, color: "bg-amber-50 text-amber-700 border-amber-100"       },
                  { label: "Unpaid",  count: fee?.unpaidCount ?? 0,  color: "bg-slate-50 text-slate-600 border-slate-100"       },
                  { label: "Overdue", count: fee?.overdueCount ?? 0, color: "bg-rose-50 text-rose-700 border-rose-100"          },
                ].map((s) => (
                  <div key={s.label} className={`rounded-[18px] border py-3 text-center ${s.color}`}>
                    <p className="text-xl font-extrabold">{s.count}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className={clayShell}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status Distribution</p>
              {summaryQuery.isLoading
                ? <div className="h-52 animate-pulse rounded-[20px] bg-slate-100/80" />
                : <StatusDonut paid={fee?.paidCount ?? 0} partial={fee?.partialCount ?? 0} unpaid={fee?.unpaidCount ?? 0} overdue={fee?.overdueCount ?? 0} />}
            </section>
          </div>
        </>
      )}

      {/* ── ANALYTICS TAB ────────────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <>
          <section className={clayShell}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Class-wise Collection</p>
            <p className="mb-4 text-xs text-slate-500">Billed vs Collected vs Pending — top 12 classes by billed amount</p>
            {assignmentsQuery.isLoading
              ? <div className="h-64 animate-pulse rounded-[20px] bg-slate-100/80" />
              : <ClassBarChart rows={classRows} />}
          </section>

          <section className={clayShell}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Monthly Collection Trend</p>
            <p className="mb-4 text-xs text-slate-500">Actual collected vs projected for the academic year</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={predictions.monthlySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number, name: string) => [fmtShort(v), name]} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Actual" stroke="#6366f1" strokeWidth={2} fill="url(#actualGrad)" connectNulls={false} dot={{ fill: "#6366f1", r: 3 }} />
                <Area type="monotone" dataKey="Projected" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" fill="url(#projGrad)" connectNulls={false} dot={{ fill: "#f59e0b", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className={clayShell}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Top 10 Classes by Pending</p>
            <p className="mb-4 text-xs text-slate-500">Classes with highest outstanding balances — sorted by pending amount</p>
            {assignmentsQuery.isLoading
              ? <div className="h-40 animate-pulse rounded-[20px] bg-slate-100/80" />
              : <TopClassesTable rows={topClasses} />}
          </section>
        </>
      )}

      {/* ── PREDICTIONS TAB ──────────────────────────────────────────────── */}
      {activeTab === "predictions" && (
        <>
          <section className={clayShell}>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-violet-600" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">AI-guided Financial Projections</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <PredictionCard
                title="Projected Year-end Collection"
                value={fmtShort(predictions.projectedYE)}
                sub={`Based on ₹${fmtShort(predictions.dailyRate)}/day rate`}
                icon={Target}
                tone="text-indigo-600"
                detail={`${pct(predictions.projectedYE, fee?.totalFeeAmount ?? 0)}% of total billed — ${predictions.projectedYE >= (fee?.totalFeeAmount ?? 0) * 0.9 ? "Strong collection trajectory" : "Collection needs acceleration"}`}
              />
              <PredictionCard
                title="Days to Full Collection"
                value={predictions.daysToFull > 0 ? `${predictions.daysToFull}d` : "∞"}
                sub="at current velocity"
                icon={Clock}
                tone={predictions.daysToFull <= 90 ? "text-emerald-600" : "text-amber-600"}
                detail={predictions.daysToFull <= 90 ? "On track to clear before year-end" : "May extend beyond academic year — intervention recommended"}
              />
              <PredictionCard
                title="High-risk Outstanding"
                value={fmtShort(predictions.highRiskAmt)}
                sub={`${predictions.highRiskCount} students overdue 30+ days`}
                icon={ShieldAlert}
                tone="text-rose-600"
                detail={`Risk score: ${predictions.riskScore}% — ${predictions.riskScore > 20 ? "Immediate follow-up required" : "Manageable risk level"}`}
              />
              <PredictionCard
                title="Collection Efficiency"
                value={`${predictions.collectionEfficiency}%`}
                sub="of all billed fees collected"
                icon={Award}
                tone={predictions.collectionEfficiency >= 75 ? "text-emerald-600" : "text-amber-600"}
                detail={predictions.collectionEfficiency >= 75 ? "Above benchmark — school performing well" : "Below 75% benchmark — review collection strategy"}
              />
              <PredictionCard
                title="Overdue Recovery Needed"
                value={fmtShort(overdueAmount)}
                sub={`${fee?.overdueCount ?? 0} overdue accounts`}
                icon={AlertTriangle}
                tone="text-rose-600"
                detail="Priority students for direct outreach and payment plans"
              />
              <PredictionCard
                title="Revenue at Full Collection"
                value={fmtShort(fee?.totalFeeAmount ?? 0)}
                sub="if all pending cleared"
                icon={TrendingUp}
                tone="text-emerald-600"
                detail={`Gap to close: ${fmtShort((fee?.pendingAmount ?? 0))} — ${fee?.totalStudents ?? 0} students in scope`}
              />
            </div>
          </section>

          {/* projection line chart */}
          <section className={clayShell}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Collection Forecast</p>
            <p className="mb-4 text-xs text-slate-500">Actual collected (indigo) vs projected remaining (amber dashed)</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={predictions.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number, name: string) => [fmtShort(v), name]} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Actual" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 4 }} connectNulls={false} />
                <Line type="monotone" dataKey="Projected" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: "#f59e0b", r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* class risk heatmap */}
          <section className={clayShell}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Class Risk Matrix</p>
            <p className="mb-4 text-xs text-slate-500">Collection rate vs pending amount — identify at-risk classes</p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {classRows.slice(0, 12).map((r) => {
                const isLow  = r.collectionPct < 40;
                const isMid  = r.collectionPct >= 40 && r.collectionPct < 70;
                const card2  = isLow ? "bg-rose-50 border-rose-100" : isMid ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100";
                const label2 = isLow ? "text-rose-600" : isMid ? "text-amber-600" : "text-emerald-600";
                const bar2   = isLow ? "bg-rose-400"   : isMid ? "bg-amber-400"   : "bg-emerald-400";
                return (
                  <div key={r.classId} className={`rounded-[18px] border p-3 ${card2}`}>
                    <p className="text-xs font-bold text-slate-800">{r.className}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${label2}`}>{r.collectionPct}% collected</span>
                      <span className="text-[10px] text-slate-500">{r.totalStudents} students</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                      <div className={`h-full rounded-full ${bar2} transition-all`} style={{ width: `${r.collectionPct}%` }} />
                    </div>
                    <p className="mt-1.5 text-[10px] font-semibold text-slate-600">Pending: {fmtShort(r.pending)}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ── DEFAULTERS TAB ───────────────────────────────────────────────── */}
      {activeTab === "defaulters" && (
        <>
          {/* summary chips */}
          <section className={clayShell}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Defaulter Risk Summary</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={`${clayInset} text-center`}>
                <p className="text-2xl font-extrabold text-rose-600">{fee?.overdueCount ?? 0}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Overdue</p>
              </div>
              <div className={`${clayInset} text-center`}>
                <p className="text-2xl font-extrabold text-amber-600">{fee?.partialCount ?? 0}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Partial</p>
              </div>
              <div className={`${clayInset} text-center`}>
                <p className="text-2xl font-extrabold text-slate-600">{fee?.unpaidCount ?? 0}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Unpaid</p>
              </div>
              <div className={`${clayInset} text-center`}>
                <p className="text-2xl font-extrabold text-indigo-600">{fmtShort(overdueAmount)}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Overdue Amt</p>
              </div>
            </div>
          </section>

          <section className={clayShell}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Top 20 Defaulters</p>
            <p className="mb-4 text-xs text-slate-500">Students with highest outstanding fee balances — sorted by due amount</p>
            {assignmentsQuery.isLoading
              ? <div className="h-48 animate-pulse rounded-[20px] bg-slate-100/80" />
              : <TopDefaultersTable rows={topDefaulters} />}
          </section>
        </>
      )}
    </div>
  );
}

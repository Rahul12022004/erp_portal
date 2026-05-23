import { useEffect, useMemo, useState } from "react";
import {
  Users, BookOpen, GraduationCap, Clock, Bell, CalendarDays, X,
  TrendingUp, TrendingDown, IndianRupee, BarChart3,
  ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle,
  Check, FileText, ClipboardList,
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { type DateClickArg, type EventInput, type EventClickArg } from "@fullcalendar/core";
import { readStoredSchoolSession } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";

// ─── clay tokens ──────────────────────────────────────────────────────────────
const clayOuter  = "rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(18,165,136,0.08),transparent_40%),linear-gradient(180deg,#f0faf8_0%,#f1f8f6_50%,#f8fbff_100%)] p-3 space-y-5";
const clayShell  = "rounded-[28px] border border-[#12A588]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2faf8_100%)] p-5 shadow-[0_18px_45px_rgba(18,165,136,0.08)]";
const clayCard   = "rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]";
const clayInset  = "rounded-[22px] border border-slate-200/75 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_20px_rgba(148,163,184,0.10)]";

const fmtINR = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

// ─── types ────────────────────────────────────────────────────────────────────
type DashboardStats  = { totalClasses: number; totalStudents: number; totalTeachers: number; attendance: number };
type ClassData       = { name: string; students: number };
type FinanceData     = { month: string; fees: number; expense: number; profit: number };
type NotificationItem = { id?: string; title: string; desc: string; time: string; author?: string };
type ExamItem = { _id: string; title: string; examType: string; className: string; subject: string; examDate: string; startTime: string; endTime: string };
type CalendarFeedItem = { id: string; title: string; start: Date; end?: Date; allDay?: boolean; type: "exam" | "finance"; meta: string };
type DashTab = "overview" | "approval" | "finance" | "calendar";
type LeaveApplication = {
  _id: string; title: string; description: string;
  leaveType: "Paid" | "Unpaid" | "Emergency";
  fileName?: string; fileData?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  teacherId?: { _id: string; name: string; email: string; position: string };
};
type FinDueDateItem = {
  studentName: string; className: string;
  dueAmount: number; dueDate: string; daysLeft: number;
  status: string;
};
type FinMetrics = {
  totalStudents: number; currentTotalFee: number; currentPaidAmount: number;
  currentPendingAmount: number; paidCount: number; partialCount: number;
  pendingCount: number; overdueCount: number;
};

const API_BASE = API_URL;
const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

const getDismissedKey = (schoolId: string) => `school-dashboard-dismissed-announcements:${schoolId}`;
const loadDismissed   = (schoolId: string): string[] => {
  try { const r = localStorage.getItem(getDismissedKey(schoolId)); return Array.isArray(JSON.parse(r || "null")) ? JSON.parse(r!) : []; } catch { return []; }
};
const saveDismissed = (schoolId: string, ids: string[]) => localStorage.setItem(getDismissedKey(schoolId), JSON.stringify(ids));

const parseDateTime = (v: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
const toDateKey     = (d: Date)   => d.toLocaleDateString("en-CA");
const fmtCalDate    = (d: Date)   => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ─── sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, bg, delta }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; bg: string;
  delta?: { up: boolean; text: string };
}) {
  return (
    <div className={`${clayCard} relative overflow-hidden`}>
      <div className={`pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full ${bg} opacity-30 blur-2xl`} />
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-[14px] ${bg} ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{value}</p>
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

// ─── main component ───────────────────────────────────────────────────────────
export default function SchoolAdminDashboard() {
  const [stats, setStats]       = useState<DashboardStats>({ totalClasses: 0, totalStudents: 0, totalTeachers: 0, attendance: 0 });
  const [classData, setClassData]     = useState<ClassData[]>([]);
  const [financeData, setFinanceData] = useState<FinanceData[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [exams, setExams]       = useState<ExamItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [slidingId, setSlidingId]       = useState<string | null>(null);
  const [activeSchoolId, setActiveSchoolId] = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [leaves, setLeaves]           = useState<LeaveApplication[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [updatingLeaveId, setUpdatingLeaveId] = useState<string | null>(null);
  const [finMetrics, setFinMetrics]     = useState<FinMetrics | null>(null);
  const [finDueDates, setFinDueDates]   = useState<FinDueDateItem[]>([]);
  const [finStudentsLoading, setFinStudentsLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const school = readStoredSchoolSession();
        if (!school?._id) { setError("School not found. Please log in again."); return; }
        const schoolId = String(school._id);
        setActiveSchoolId(schoolId);
        setDismissedIds(loadDismissed(schoolId));

        const [dashRes, examsRes] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/${schoolId}`),
          fetch(`${API_BASE}/api/exams/school/${schoolId}`),
        ]);
        if (!dashRes.ok) throw new Error(`Failed to load dashboard (${dashRes.status})`);
        const data = await dashRes.json();

        setStats({ totalClasses: data.stats?.totalClasses || 0, totalStudents: data.stats?.totalStudents || 0, totalTeachers: data.stats?.totalTeachers || 0, attendance: data.stats?.attendance || 0 });
        setClassData(Array.isArray(data.classData) ? data.classData : []);
        setFinanceData(Array.isArray(data.financeData) ? data.financeData : []);
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        if (examsRes.ok) { const ed = await examsRes.json(); setExams(Array.isArray(ed) ? ed : []); }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    window.addEventListener("announcements-updated", fetchDashboard);
    return () => window.removeEventListener("announcements-updated", fetchDashboard);
  }, []);

  useEffect(() => {
    const school = readStoredSchoolSession();
    if (!school?._id) return;
    const schoolId = String(school._id);
    setLeavesLoading(true);
    fetch(`${API_BASE}/api/leaves/school/${schoolId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setLeaves(Array.isArray(d) ? d : []))
      .catch(() => setLeaves([]))
      .finally(() => setLeavesLoading(false));
  }, []);

  useEffect(() => {
    const school = readStoredSchoolSession();
    if (!school?._id) return;
    const schoolId = String(school._id);
    setFinStudentsLoading(true);
    fetch(`${API_BASE}/api/finance/${schoolId}/students/summary?limit=50`)
      .then((r) => r.ok ? r.json() : null)
      .then((resp) => {
        if (!resp?.success || !resp?.data) return;
        const { items, metrics } = resp.data as { items: unknown[]; metrics: FinMetrics };
        if (metrics) setFinMetrics(metrics);
        const now = Date.now();
        const dues: FinDueDateItem[] = (Array.isArray(items) ? items : [])
          .filter((s: unknown) => {
            const item = s as Record<string, unknown>;
            return (item.status as string) !== "paid" && item.dueDate;
          })
          .sort((a, b) => new Date((a as Record<string,unknown>).dueDate as string).getTime() - new Date((b as Record<string,unknown>).dueDate as string).getTime())
          .slice(0, 8)
          .map((s: unknown) => {
            const item = s as Record<string, unknown>;
            const student = (item.student || {}) as Record<string, unknown>;
            const dueDate = String(item.dueDate || "");
            return {
              studentName: String(student.name || ""),
              className: String(student.class || ""),
              dueAmount: Number(item.currentDueAmount ?? item.remainingAmount ?? 0),
              status: String(item.status || "unpaid"),
              dueDate,
              daysLeft: dueDate ? Math.ceil((new Date(dueDate).getTime() - now) / 86_400_000) : 0,
            };
          });
        setFinDueDates(dues);
      })
      .catch(() => {})
      .finally(() => setFinStudentsLoading(false));
  }, []);

  const handleDismiss = (id?: string) => {
    if (!id) return;
    setSlidingId(id);
    window.setTimeout(() => {
      setDismissedIds((cur) => { const next = cur.includes(id) ? cur : [...cur, id]; saveDismissed(activeSchoolId, next); return next; });
      setSlidingId(null);
    }, 220);
  };

  const updateLeaveStatus = async (leaveId: string, status: LeaveApplication["status"]) => {
    try {
      setUpdatingLeaveId(leaveId);
      const res = await fetch(`${API_BASE}/api/leaves/${leaveId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to update");
      setLeaves((cur) => cur.map((l) => l._id === leaveId ? { ...l, status: data.data.status } : l));
    } catch { /* leave error silent on dashboard */ }
    finally { setUpdatingLeaveId(null); }
  };

  const visibleNotifications = useMemo(() => notifications.filter((n) => !n.id || !dismissedIds.includes(n.id)), [notifications, dismissedIds]);

  const calendarFeed = useMemo<CalendarFeedItem[]>(() => {
    const examEvents: CalendarFeedItem[] = exams.map((e) => {
      const start = parseDateTime(`${e.examDate}T${e.startTime || "09:00"}:00`);
      if (!start) return null;
      return { id: `exam-${e._id}`, title: `${e.subject} (${e.className})`, start, end: parseDateTime(`${e.examDate}T${e.endTime || "10:00"}:00`) || undefined, allDay: false, type: "exam", meta: `${e.examType} • ${e.title}` } as CalendarFeedItem;
    }).filter(Boolean) as CalendarFeedItem[];

    const finEvents: CalendarFeedItem[] = financeData.map((f, i) => {
      const start = new Date(); start.setDate(1); start.setHours(9, 0, 0, 0); start.setMonth(start.getMonth() - (financeData.length - 1 - i));
      return { id: `fin-${f.month}-${i}`, title: `Finance: ${f.month}`, start, allDay: false, type: "finance", meta: `Fees ${fmtINR(f.fees)} | Exp ${fmtINR(f.expense)} | Profit ${fmtINR(f.profit)}` };
    });

    return [...examEvents, ...finEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [exams, financeData]);

  const calendarEvents = useMemo<EventInput[]>(() =>
    calendarFeed.map((f) => ({ id: f.id, title: f.title, start: f.start, end: f.end, allDay: f.allDay, classNames: [`event-${f.type}`], extendedProps: { meta: f.meta, type: f.type } })),
    [calendarFeed]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarFeedItem[]>();
    calendarFeed.forEach((f) => { const k = toDateKey(f.start); map.set(k, [...(map.get(k) || []), f]); });
    return map;
  }, [calendarFeed]);

  const selectedDateEvents = useMemo(() => selectedDate ? (eventsByDate.get(toDateKey(selectedDate)) || []) : [], [selectedDate, eventsByDate]);
  const upcomingEvents     = useMemo(() => calendarFeed.filter((f) => f.start.getTime() >= Date.now()).slice(0, 6), [calendarFeed]);

  // ── finance insights ──────────────────────────────────────────────────────
  const finInsights = useMemo(() => {
    if (!financeData.length) return { totalFees: 0, totalExpense: 0, totalProfit: 0, profitMargin: 0, latestMonth: null as FinanceData | null };
    const totalFees    = financeData.reduce((s, f) => s + f.fees, 0);
    const totalExpense = financeData.reduce((s, f) => s + f.expense, 0);
    const totalProfit  = financeData.reduce((s, f) => s + f.profit, 0);
    return { totalFees, totalExpense, totalProfit, profitMargin: Math.round((totalProfit / Math.max(totalFees, 1)) * 100), latestMonth: financeData[financeData.length - 1] };
  }, [financeData]);

  const upcomingExamCount = exams.filter((e) => new Date(`${e.examDate}T${e.startTime || "09:00"}`) >= new Date()).length;
  const studentPerClass   = stats.totalClasses > 0 ? Math.round(stats.totalStudents / stats.totalClasses) : 0;
  const topClass          = classData.length > 0 ? [...classData].sort((a, b) => b.students - a.students)[0] : null;

  const finStats = useMemo(() => ({
    total:     finMetrics?.currentTotalFee     ?? 0,
    collected: finMetrics?.currentPaidAmount   ?? 0,
    pending:   finMetrics?.currentPendingAmount ?? 0,
    paid:      finMetrics?.paidCount    ?? 0,
    partial:   finMetrics?.partialCount ?? 0,
    unpaid:    finMetrics?.pendingCount ?? 0,
    overdue:   finMetrics?.overdueCount ?? 0,
  }), [finMetrics]);

  const TABS: { id: DashTab; label: string; icon: React.ElementType }[] = [
    { id: "overview",  label: "Overview",  icon: BarChart3      },
    { id: "approval",  label: "Approval",  icon: ClipboardList  },
    { id: "finance",   label: "Finance",   icon: IndianRupee    },
    { id: "calendar",  label: "Calendar",  icon: CalendarDays   },
  ];

  const skeleton = (h = "h-48") => <div className={`${h} animate-pulse rounded-[20px] bg-slate-100/80`} />;

  return (
    <div className={clayOuter}>

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <section className={clayShell}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-950">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className={`${clayInset} flex items-center gap-2 !py-2 !px-3`}>
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-bold text-slate-800">{stats.totalStudents}</span>
              <span className="text-slate-400">students</span>
            </div>
            <div className={`${clayInset} flex items-center gap-2 !py-2 !px-3`}>
              <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-bold text-slate-800">{stats.totalClasses}</span>
              <span className="text-slate-400">classes</span>
            </div>
            {upcomingExamCount > 0 && (
              <div className={`${clayInset} flex items-center gap-2 !py-2 !px-3`}>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-bold text-slate-800">{upcomingExamCount}</span>
                <span className="text-slate-400">exams upcoming</span>
              </div>
            )}
          </div>
        </div>

        {/* tab bar */}
        <div className="mt-5 tabs-scroll overflow-x-auto pb-0.5">
          <div className="flex min-w-max items-center gap-1 rounded-[22px] bg-[linear-gradient(180deg,#eef2ff_0%,#e8ecff_100%)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_rgba(99,102,241,0.08)]">
            {TABS.map((t) => <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} icon={t.icon} label={t.label} />)}
          </div>
        </div>
      </section>

      {error && <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

      {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <>
          {/* KPI row */}
          <section className={clayShell}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Key Metrics</p>
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-[24px] bg-slate-100/80" />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Total Classes"  value={stats.totalClasses}  sub="Active this year"  icon={BookOpen}      accent="text-indigo-600"  bg="bg-indigo-50"  delta={{ up: true, text: "Active" }} />
                <KpiCard label="Total Students" value={stats.totalStudents} sub={`${studentPerClass} per class avg`} icon={Users} accent="text-emerald-600" bg="bg-emerald-50" delta={{ up: true, text: "Enrolled" }} />
                <KpiCard label="Total Teachers" value={stats.totalTeachers} sub={`1 : ${stats.totalTeachers > 0 ? Math.round(stats.totalStudents / stats.totalTeachers) : 0} ratio`} icon={GraduationCap} accent="text-amber-600" bg="bg-amber-50" />
                <KpiCard label="Avg Attendance" value={`${stats.attendance}%`} sub={stats.attendance >= 75 ? "On target" : "Below target"} icon={Clock} accent={stats.attendance >= 75 ? "text-emerald-600" : "text-rose-600"} bg={stats.attendance >= 75 ? "bg-emerald-50" : "bg-rose-50"} delta={{ up: stats.attendance >= 75, text: stats.attendance >= 75 ? "Good" : "Low" }} />
              </div>
            )}
          </section>

          {/* charts + announcements */}
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <section className={clayShell}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Class Distribution</p>
              <p className="mb-4 text-xs text-slate-500">Students enrolled per class</p>
              {loading ? skeleton("h-72") : classData.length === 0 ? (
                <p className="py-16 text-center text-sm text-slate-400">No class data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={classData} dataKey="students" nameKey="name" innerRadius={65} outerRadius={110} paddingAngle={3}>
                      {classData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {topClass && (
                <div className={`mt-4 ${clayInset}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Largest Class</p>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <p className="mt-1 text-base font-bold text-slate-800">{topClass.name}</p>
                  <p className="text-xs text-slate-500">{topClass.students} students</p>
                </div>
              )}
            </section>

            <section className={clayShell}>
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-indigo-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Announcements</p>
              </div>
              {loading ? skeleton("h-40") : visibleNotifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No announcements yet.</p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {visibleNotifications.map((n, i) => (
                    <div key={n.id || i} className={`${clayInset} transition-all duration-200 ${slidingId === n.id ? "-translate-x-4 opacity-0" : "translate-x-0 opacity-100"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                        <button onClick={() => handleDismiss(n.id)} disabled={!n.id} className="text-slate-400 hover:text-rose-500 disabled:opacity-40 shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{n.desc}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{n.time}{n.author ? ` · ${n.author}` : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* finance snapshot */}
          {!loading && financeData.length > 0 && (
            <section className={clayShell}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Finance Snapshot</p>
              <p className="mb-4 text-xs text-slate-500">Monthly fees, expenses, and profit trend</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={financeData} barSize={10} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
                  <Tooltip formatter={(v: number, name: string) => [fmtShort(v), name]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="fees"    fill="#6366f1" radius={[4, 4, 0, 0]} name="Fees"    />
                  <Bar dataKey="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Expense" />
                  <Bar dataKey="profit"  fill="#10b981" radius={[4, 4, 0, 0]} name="Profit"  />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}
        </>
      )}

      {/* ── APPROVAL TAB ───────────────────────────────────────────────────── */}
      {activeTab === "approval" && (
        <>
          <section className={clayShell}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Leave Request Summary</p>
            <div className="grid grid-cols-3 gap-3">
              <div className={`${clayInset} text-center`}>
                <p className="text-2xl font-extrabold text-amber-600">{leaves.filter((l) => l.status === "Pending").length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Pending</p>
              </div>
              <div className={`${clayInset} text-center`}>
                <p className="text-2xl font-extrabold text-emerald-600">{leaves.filter((l) => l.status === "Approved").length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Approved</p>
              </div>
              <div className={`${clayInset} text-center`}>
                <p className="text-2xl font-extrabold text-rose-600">{leaves.filter((l) => l.status === "Rejected").length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Rejected</p>
              </div>
            </div>
          </section>

          <section className={clayShell}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Teacher Leave Requests</p>
            {leavesLoading ? skeleton("h-40") : leaves.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No leave requests yet.</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {leaves.map((leave) => {
                  const statusClr: Record<string, string> = { Approved: "bg-emerald-50 text-emerald-700 border-emerald-100", Pending: "bg-amber-50 text-amber-700 border-amber-100", Rejected: "bg-rose-50 text-rose-700 border-rose-100" };
                  return (
                    <div key={leave._id} className={`${clayInset}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{leave.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{leave.description}</p>
                        </div>
                        <span className={`shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusClr[leave.status] ?? "bg-slate-50 text-slate-600"}`}>{leave.status}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Teacher</p>
                          <p className="mt-0.5 font-semibold text-slate-800">{leave.teacherId?.name ?? "Unknown"}</p>
                          <p className="text-[11px] text-slate-400">{leave.teacherId?.email ?? ""}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Type · Applied</p>
                          <p className="mt-0.5 font-semibold text-slate-800">{leave.leaveType}</p>
                          <p className="text-[11px] text-slate-400">{new Date(leave.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        {leave.fileData
                          ? <a href={leave.fileData} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"><FileText className="h-3.5 w-3.5" />{leave.fileName ?? "Attachment"}</a>
                          : <span className="text-xs text-slate-400">No attachment</span>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateLeaveStatus(leave._id, "Approved")}
                            disabled={updatingLeaveId === leave._id || leave.status === "Approved"}
                            className="inline-flex items-center gap-1.5 rounded-[14px] bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => updateLeaveStatus(leave._id, "Rejected")}
                            disabled={updatingLeaveId === leave._id || leave.status === "Rejected"}
                            className="inline-flex items-center gap-1.5 rounded-[14px] bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── FINANCE TAB ────────────────────────────────────────────────────── */}
      {activeTab === "finance" && (
        <>
          {/* collection KPIs from real student data */}
          <section className={clayShell}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Fee Collection Summary</p>
            {finStudentsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-[24px] bg-slate-100/80" />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Total Billed"  value={fmtShort(finStats.total)}     sub={`${finMetrics?.totalStudents ?? 0} students`} icon={IndianRupee} accent="text-indigo-600"  bg="bg-indigo-50"  delta={{ up: true,  text: "Billed" }} />
                <KpiCard label="Collected"     value={fmtShort(finStats.collected)} sub={finStats.total > 0 ? `${Math.round((finStats.collected / finStats.total) * 100)}% of billed` : "—"} icon={TrendingUp} accent="text-emerald-600" bg="bg-emerald-50" delta={{ up: true, text: "Paid" }} />
                <KpiCard label="Pending"       value={fmtShort(finStats.pending)}   sub="Outstanding" icon={TrendingDown} accent="text-amber-600" bg="bg-amber-50" delta={{ up: false, text: "Due" }} />
                <KpiCard label="Overdue"       value={String(finStats.overdue)}     sub="Students overdue" icon={AlertTriangle} accent="text-rose-600" bg="bg-rose-50" delta={{ up: false, text: "At risk" }} />
              </div>
            )}
          </section>

          {/* student status breakdown */}
          <section className={clayShell}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Student Payment Status</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Paid",    count: finStats.paid,    color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                { label: "Partial", count: finStats.partial, color: "bg-amber-50 text-amber-700 border-amber-100"       },
                { label: "Unpaid",  count: finStats.unpaid,  color: "bg-slate-50 text-slate-600 border-slate-200"       },
                { label: "Overdue", count: finStats.overdue, color: "bg-rose-50 text-rose-700 border-rose-100"          },
              ].map((s) => (
                <div key={s.label} className={`rounded-[18px] border py-4 text-center ${s.color}`}>
                  <p className="text-2xl font-extrabold">{s.count}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{s.label}</p>
                </div>
              ))}
            </div>
            {finMetrics !== null && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-500">Collection progress</p>
                  <p className="text-xs font-bold text-slate-800">{finStats.total > 0 ? Math.round((finStats.collected / finStats.total) * 100) : 0}%</p>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                    style={{ width: `${finStats.total > 0 ? Math.round((finStats.collected / finStats.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* important dates */}
          <section className={clayShell}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Important Dates</p>
            <p className="mb-4 text-xs text-slate-500">Upcoming fee due dates for unpaid students</p>
            {finStudentsLoading ? skeleton("h-40") : finDueDates.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No upcoming due dates.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {finDueDates.map((s, i) => {
                  const isOverdue = s.daysLeft < 0;
                  const isUrgent  = s.daysLeft >= 0 && s.daysLeft <= 7;
                  const cardClr   = isOverdue ? "border-rose-100 bg-rose-50/60" : isUrgent ? "border-amber-100 bg-amber-50/60" : "";
                  const dateClr   = isOverdue ? "text-rose-600" : isUrgent ? "text-amber-600" : "text-indigo-600";
                  const badge     = isOverdue ? `${Math.abs(s.daysLeft)}d overdue` : `${s.daysLeft}d left`;
                  const badgeClr  = isOverdue ? "bg-rose-100 text-rose-700" : isUrgent ? "bg-amber-100 text-amber-700" : "bg-indigo-50 text-indigo-700";
                  return (
                    <div key={s.studentName + i} className={`${clayInset} ${cardClr}`}>
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${dateClr}`}>
                          {new Date(s.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${badgeClr}`}>{badge}</span>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-slate-800">{s.studentName ?? "Student"}</p>
                      <p className="text-[11px] text-slate-500">{s.className ?? ""}</p>
                      <p className="mt-1.5 text-xs font-bold text-slate-700">{fmtShort(s.dueAmount)} <span className="font-normal text-slate-400">due</span></p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── CALENDAR TAB ───────────────────────────────────────────────────── */}
      {activeTab === "calendar" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          <section className={clayShell}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">School Calendar</p>
                <p className="mt-0.5 text-xs text-slate-500">Exams and finance checkpoints</p>
              </div>
              <div className={`${clayInset} !py-1.5 !px-3 text-[10px] font-bold text-slate-500`}>
                <CalendarDays className="inline h-3 w-3 mr-1" />{calendarEvents.length} events
              </div>
            </div>
            {loading ? skeleton("h-[500px]") : (
              <div className="rounded-[20px] border border-slate-200/70 overflow-hidden p-2 bg-white">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }}
                  height={480}
                  events={calendarEvents}
                  eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
                  dayMaxEvents={3}
                  eventDisplay="block"
                  dateClick={(info: DateClickArg) => setSelectedDate(info.date)}
                  eventClick={(info: EventClickArg) => setSelectedDate(info.event.start || new Date())}
                />
              </div>
            )}
          </section>

          <section className={clayShell}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Upcoming Events</p>
            {upcomingEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No upcoming events.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className={`${clayInset}`}>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">{ev.title}</p>
                      <span className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-bold uppercase ${ev.type === "exam" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>{ev.type}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{fmtCalDate(ev.start)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{ev.meta}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── date detail modal ───────────────────────────────────────────────── */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setSelectedDate(null)}>
          <div className={`w-full max-w-lg ${clayShell} shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date Details</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">{selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</h3>
              </div>
              <button className={`${clayInset} !py-1.5 !px-3 text-xs font-semibold text-slate-600`} onClick={() => setSelectedDate(null)}>Close</button>
            </div>
            <div className="mt-4 space-y-2">
              {selectedDateEvents.length === 0 ? (
                <p className={`${clayInset} text-sm text-slate-400 text-center`}>No events on this date.</p>
              ) : selectedDateEvents.map((ev) => (
                <div key={ev.id} className={`${clayInset}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${ev.type === "exam" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>{ev.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{fmtCalDate(ev.start)}</p>
                  <p className="text-xs text-slate-400">{ev.meta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fc { --fc-border-color: rgba(148,163,184,0.3); --fc-page-bg-color: transparent; --fc-neutral-bg-color: #f8fbff; --fc-today-bg-color: rgba(99,102,241,0.08); }
        .fc .fc-toolbar-title { color: #0f172a; font-size: 0.95rem; font-weight: 800; }
        .fc .fc-button { background: #6366f1; border-color: #6366f1; color: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(99,102,241,0.2); font-size: 12px; }
        .fc .fc-button:hover, .fc .fc-button.fc-button-active { background: #4f46e5; border-color: #4f46e5; }
        .fc .event-exam    { background: #6366f1; border-color: #6366f1; color: #fff; border-radius: 8px; }
        .fc .event-finance { background: #f59e0b; border-color: #f59e0b; color: #fff; border-radius: 8px; }
      `}</style>
    </div>
  );
}

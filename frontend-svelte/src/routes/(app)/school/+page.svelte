<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    Users, BookOpen, GraduationCap, Clock, Bell, CalendarDays, X,
    TrendingUp, TrendingDown, IndianRupee, BarChart3,
    ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle,
    Check, FileText, ClipboardList,
  } from 'lucide-svelte';
  import {
    Chart,
    ArcElement, PieController,
    BarElement, BarController,
    CategoryScale, LinearScale,
    Tooltip, Legend,
  } from 'chart.js';
  Chart.register(
    ArcElement, PieController,
    BarElement, BarController,
    CategoryScale, LinearScale,
    Tooltip, Legend,
  );

  // ─── clay tokens ──────────────────────────────────────────────────────────────
  const clayOuter = 'rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(18,165,136,0.08),transparent_40%),linear-gradient(180deg,#f0faf8_0%,#f1f8f6_50%,#f8fbff_100%)] p-3 space-y-5';
  const clayShell = 'rounded-[28px] border border-[#12A588]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2faf8_100%)] p-5 shadow-[0_18px_45px_rgba(18,165,136,0.08)]';
  const clayCard  = 'rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]';
  const clayInset = 'rounded-[22px] border border-slate-200/75 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_20px_rgba(148,163,184,0.10)]';

  const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

  // ─── types ────────────────────────────────────────────────────────────────────
  type DashboardStats   = { totalClasses: number; totalStudents: number; totalTeachers: number; attendance: number };
  type ClassData        = { name: string; students: number };
  type FinanceData      = { month: string; fees: number; expense: number; profit: number };
  type NotificationItem = { id?: string; title: string; desc: string; time: string; author?: string };
  type ExamItem         = { _id: string; title: string; examType: string; className: string; subject: string; examDate: string; startTime: string; endTime: string };
  type CalendarFeedItem = { id: string; title: string; start: Date; end?: Date; allDay?: boolean; type: 'exam' | 'finance'; meta: string };
  type DashTab          = 'overview' | 'approval' | 'finance' | 'calendar';
  type LeaveApplication = {
    _id: string; title: string; description: string;
    leaveType: 'Paid' | 'Unpaid' | 'Emergency';
    fileName?: string; fileData?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
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

  // ─── helpers ──────────────────────────────────────────────────────────────────
  const fmtINR = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const fmtShort = (v: number) => {
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
    if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
    if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  };

  const getDismissedKey = (sid: string) => `school-dashboard-dismissed-announcements:${sid}`;
  const loadDismissed   = (sid: string): string[] => {
    try {
      const r = localStorage.getItem(getDismissedKey(sid));
      const parsed = JSON.parse(r || 'null');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };
  const saveDismissed = (sid: string, ids: string[]) =>
    localStorage.setItem(getDismissedKey(sid), JSON.stringify(ids));

  function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const m = typeof document !== 'undefined' && document.cookie.match(/(?:^|;\s*)client_token=([^;]*)/);
    const token = m ? decodeURIComponent(m[1]) : null;
    return fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  }

  function normalizeLeave(raw: Record<string, unknown>): LeaveApplication {
    return {
      _id: String(raw.ID ?? raw._id ?? ''),
      title: String(raw.Title ?? raw.title ?? ''),
      description: String(raw.Description ?? raw.description ?? ''),
      leaveType: String(raw.LeaveType ?? raw.leaveType ?? 'Paid') as LeaveApplication['leaveType'],
      status: String(raw.Status ?? raw.status ?? 'Pending') as LeaveApplication['status'],
      fileName: String(raw.FileName ?? raw.fileName ?? '') || undefined,
      fileData: String(raw.FileData ?? raw.fileData ?? '') || undefined,
      createdAt: String(raw.CreatedAt ?? raw.createdAt ?? ''),
    };
  }

  const parseDateTime = (v: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
  const toDateKey     = (d: Date)   => d.toLocaleDateString('en-CA');
  const fmtCalDate    = (d: Date)   =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ─── state ────────────────────────────────────────────────────────────────────
  let stats: DashboardStats      = $state({ totalClasses: 0, totalStudents: 0, totalTeachers: 0, attendance: 0 });
  let classData: ClassData[]     = $state([]);
  let financeData: FinanceData[] = $state([]);
  let notifications: NotificationItem[] = $state([]);
  let exams: ExamItem[]          = $state([]);
  let selectedDate: Date | null  = $state(null);
  let dismissedIds: string[]     = $state([]);
  let slidingId: string | null   = $state(null);
  let activeSchoolId: string     = $state('');
  let loading: boolean           = $state(true);
  let error: string              = $state('');
  let activeTab: DashTab         = $state('overview');

  let leaves: LeaveApplication[]    = $state([]);
  let leavesLoading: boolean        = $state(false);
  let updatingLeaveId: string | null = $state(null);

  let finMetrics = $state<FinMetrics | null>(null);
  let finDueDates: FinDueDateItem[]   = $state([]);
  let finStudentsLoading: boolean     = $state(false);

  // ─── auth ─────────────────────────────────────────────────────────────────────
  const schoolId = $derived($page.data.user?.schoolId ?? '');

  // ─── derived ──────────────────────────────────────────────────────────────────
  const visibleNotifications = $derived(
    notifications.filter((n) => !n.id || !dismissedIds.includes(n.id))
  );

  const calendarFeed = $derived.by<CalendarFeedItem[]>(() => {
    const examEvents: CalendarFeedItem[] = exams
      .map((e) => {
        const start = parseDateTime(`${e.examDate}T${e.startTime || '09:00'}:00`);
        if (!start) return null;
        return {
          id: `exam-${e._id}`,
          title: `${e.subject} (${e.className})`,
          start,
          end: parseDateTime(`${e.examDate}T${e.endTime || '10:00'}:00`) ?? undefined,
          allDay: false,
          type: 'exam' as const,
          meta: `${e.examType} • ${e.title}`,
        };
      })
      .filter(Boolean) as CalendarFeedItem[];

    const finEvents: CalendarFeedItem[] = financeData.map((f, i) => {
      const start = new Date();
      start.setDate(1);
      start.setHours(9, 0, 0, 0);
      start.setMonth(start.getMonth() - (financeData.length - 1 - i));
      return {
        id: `fin-${f.month}-${i}`,
        title: `Finance: ${f.month}`,
        start,
        allDay: false,
        type: 'finance' as const,
        meta: `Fees ${fmtINR(f.fees)} | Exp ${fmtINR(f.expense)} | Profit ${fmtINR(f.profit)}`,
      };
    });

    return [...examEvents, ...finEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  const eventsByDate = $derived.by(() => {
    const map = new Map<string, CalendarFeedItem[]>();
    for (const f of calendarFeed) {
      const k = toDateKey(f.start);
      map.set(k, [...(map.get(k) ?? []), f]);
    }
    return map;
  });

  const selectedDateEvents = $derived(
    selectedDate ? (eventsByDate.get(toDateKey(selectedDate)) ?? []) : []
  );
  const upcomingEvents = $derived(
    calendarFeed.filter((f) => f.start.getTime() >= Date.now()).slice(0, 6)
  );

  const finInsights = $derived.by(() => {
    if (!financeData.length) return { totalFees: 0, totalExpense: 0, totalProfit: 0, profitMargin: 0, latestMonth: null as FinanceData | null };
    const totalFees    = financeData.reduce((s, f) => s + f.fees, 0);
    const totalExpense = financeData.reduce((s, f) => s + f.expense, 0);
    const totalProfit  = financeData.reduce((s, f) => s + f.profit, 0);
    return {
      totalFees, totalExpense, totalProfit,
      profitMargin: Math.round((totalProfit / Math.max(totalFees, 1)) * 100),
      latestMonth: financeData[financeData.length - 1],
    };
  });

  const upcomingExamCount = $derived(
    exams.filter((e) => new Date(`${e.examDate}T${e.startTime || '09:00'}`) >= new Date()).length
  );
  const studentPerClass = $derived(
    stats.totalClasses > 0 ? Math.round(stats.totalStudents / stats.totalClasses) : 0
  );
  const topClass = $derived(
    classData.length > 0 ? [...classData].sort((a, b) => b.students - a.students)[0] : null
  );

  const finStats = $derived({
    total:     finMetrics?.currentTotalFee      ?? 0,
    collected: finMetrics?.currentPaidAmount    ?? 0,
    pending:   finMetrics?.currentPendingAmount ?? 0,
    paid:      finMetrics?.paidCount     ?? 0,
    partial:   finMetrics?.partialCount  ?? 0,
    unpaid:    finMetrics?.pendingCount  ?? 0,
    overdue:   finMetrics?.overdueCount  ?? 0,
  });

  // ─── chart canvas refs ────────────────────────────────────────────────────────
  let pieCanvas: HTMLCanvasElement | undefined = $state();
  let barCanvas: HTMLCanvasElement | undefined = $state();

  // ─── chart effects ────────────────────────────────────────────────────────────
  $effect(() => {
    if (!pieCanvas || classData.length === 0) return;
    const chart = new Chart(pieCanvas, {
      type: 'pie',
      data: {
        labels: classData.map((c) => c.name),
        datasets: [{
          data: classData.map((c) => c.students),
          backgroundColor: classData.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} students` } },
        },
      },
    });
    return () => chart.destroy();
  });

  $effect(() => {
    if (!barCanvas || financeData.length === 0) return;
    const chart = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: financeData.map((f) => f.month),
        datasets: [
          { label: 'Fees',    data: financeData.map((f) => f.fees),    backgroundColor: '#6366f1', borderRadius: 4 },
          { label: 'Expense', data: financeData.map((f) => f.expense), backgroundColor: '#f59e0b', borderRadius: 4 },
          { label: 'Profit',  data: financeData.map((f) => f.profit),  backgroundColor: '#10b981', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${fmtShort(ctx.parsed.y as number)}`,
            },
          },
        },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v) => fmtShort(Number(v)) } },
        },
      },
    });
    return () => chart.destroy();
  });

  // ─── data fetching ────────────────────────────────────────────────────────────
  const fetchDashboard = async () => {
    if (!schoolId) { error = 'School not found. Please log in again.'; loading = false; return; }
    try {
      loading = true;
      error = '';
      activeSchoolId = schoolId;
      dismissedIds = loadDismissed(schoolId);

      const [analyticsRes, classesRes, announcementsRes, feeTrendRes, examsRes] = await Promise.all([
        authedFetch(`/api/analytics/dashboard?schoolId=${schoolId}`),
        authedFetch(`/api/classes?schoolId=${schoolId}`),
        authedFetch(`/api/announcements?schoolId=${schoolId}`),
        authedFetch(`/api/analytics/fee/trend?schoolId=${schoolId}`),
        authedFetch(`/api/exams/school/${schoolId}`),
      ]);

      let totalStudents = 0, totalTeachers = 0;
      if (analyticsRes.ok) {
        const ad = await analyticsRes.json();
        const d = ad?.data ?? {};
        totalStudents = Number(d.students ?? 0);
        totalTeachers = Number(d.staff ?? 0);
      }

      if (classesRes.ok) {
        const cd = await classesRes.json();
        const list: Record<string, unknown>[] = Array.isArray(cd?.data) ? cd.data : [];
        classData = list.map((c) => ({
          name: String(c.Name ?? '') + (c.Section ? `-${String(c.Section)}` : ''),
          students: Number(c.StudentCount ?? 0),
        }));
        stats = { totalClasses: list.length, totalStudents, totalTeachers, attendance: 0 };
      } else {
        stats = { totalClasses: 0, totalStudents, totalTeachers, attendance: 0 };
      }

      if (announcementsRes.ok) {
        const ad = await announcementsRes.json();
        const annList: Record<string, unknown>[] = Array.isArray(ad?.data) ? ad.data : [];
        notifications = annList.map((a) => ({
          id:     String(a.ID ?? a._id ?? ''),
          title:  String(a.Title ?? a.title ?? ''),
          desc:   String(a.Message ?? a.message ?? ''),
          time:   (a.CreatedAt ?? a.createdAt) ? new Date(String(a.CreatedAt ?? a.createdAt)).toLocaleDateString('en-IN') : '',
          author: String(a.Author ?? a.author ?? ''),
        }));
      }

      if (feeTrendRes.ok) {
        const ft = await feeTrendRes.json();
        const trendList: Record<string, unknown>[] = Array.isArray(ft?.data) ? ft.data : [];
        financeData = trendList.map((r) => ({
          month:   String(r._id ?? ''),
          fees:    Number(r.collected ?? 0) + Number(r.pending ?? 0),
          expense: Number(r.pending ?? 0),
          profit:  Number(r.collected ?? 0),
        }));
      }

      if (examsRes.ok) {
        const ed = await examsRes.json();
        exams = Array.isArray(ed?.data) ? ed.data : [];
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  };

  const fetchLeaves = async () => {
    if (!schoolId) return;
    leavesLoading = true;
    try {
      const r = await authedFetch(`/api/leaves/school/${schoolId}`);
      const d = r.ok ? await r.json() : null;
      const list: Record<string, unknown>[] = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
      leaves = list.map(normalizeLeave);
    } catch { leaves = []; }
    finally { leavesLoading = false; }
  };

  const fetchFinStudents = async () => {
    if (!schoolId) return;
    finStudentsLoading = true;
    try {
      const r = await authedFetch(`/api/finance/assignments?schoolId=${schoolId}&limit=50`);
      if (!r.ok) return;
      const resp = await r.json();
      // Go returns { success, data: { data: [...assignments], total, page, limit } }
      const assignments: Record<string, unknown>[] = Array.isArray(resp?.data?.data) ? resp.data.data : [];
      const paidCount    = assignments.filter((a) => String(a.FeeStatus ?? a.feeStatus) === 'PAID').length;
      const partialCount = assignments.filter((a) => String(a.FeeStatus ?? a.feeStatus) === 'PARTIAL').length;
      const pendingCount = assignments.filter((a) => String(a.FeeStatus ?? a.feeStatus) === 'UNPAID').length;
      const overdueCount = assignments.filter((a) => String(a.FeeStatus ?? a.feeStatus) === 'OVERDUE').length;
      const currentTotalFee      = assignments.reduce((s, a) => s + Number(a.TotalFee   ?? a.totalFee   ?? 0), 0);
      const currentPaidAmount    = assignments.reduce((s, a) => s + Number(a.PaidAmount  ?? a.paidAmount  ?? 0), 0);
      const currentPendingAmount = assignments.reduce((s, a) => s + Number(a.DueAmount   ?? a.dueAmount   ?? 0), 0);
      finMetrics = { totalStudents: assignments.length, currentTotalFee, currentPaidAmount, currentPendingAmount, paidCount, partialCount, pendingCount, overdueCount };
      const now = Date.now();
      finDueDates = assignments
        .filter((a) => String(a.FeeStatus ?? a.feeStatus) !== 'PAID' && (a.DueDate ?? a.dueDate))
        .sort((a, b) =>
          new Date(String(a.DueDate ?? a.dueDate ?? '')).getTime() -
          new Date(String(b.DueDate ?? b.dueDate ?? '')).getTime()
        )
        .slice(0, 8)
        .map((a) => {
          const dueDate = String(a.DueDate ?? a.dueDate ?? '');
          return {
            studentName: String(a.StudentID ?? a.studentId ?? 'Student'),
            className:   String(a.ClassID   ?? a.classId   ?? ''),
            dueAmount:   Number(a.DueAmount  ?? a.dueAmount  ?? 0),
            status:      String(a.FeeStatus  ?? a.feeStatus  ?? 'UNPAID').toLowerCase(),
            dueDate,
            daysLeft: dueDate ? Math.ceil((new Date(dueDate).getTime() - now) / 86_400_000) : 0,
          };
        });
    } catch { /* silent */ }
    finally { finStudentsLoading = false; }
  };

  onMount(() => {
    fetchDashboard();
    fetchLeaves();
    fetchFinStudents();

    const handler = () => fetchDashboard();
    window.addEventListener('announcements-updated', handler);
    return () => window.removeEventListener('announcements-updated', handler);
  });

  // ─── handlers ─────────────────────────────────────────────────────────────────
  const handleDismiss = (id?: string) => {
    if (!id) return;
    slidingId = id;
    window.setTimeout(() => {
      if (!dismissedIds.includes(id)) {
        dismissedIds = [...dismissedIds, id];
        saveDismissed(activeSchoolId, dismissedIds);
      }
      slidingId = null;
    }, 220);
  };

  const updateLeaveStatus = async (leaveId: string, status: LeaveApplication['status']) => {
    try {
      updatingLeaveId = leaveId;
      const res = await authedFetch(`/api/leaves/${leaveId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to update');
      const updated = data?.data ?? {};
      const newStatus = String(updated?.Status ?? updated?.status ?? status) as LeaveApplication['status'];
      leaves = leaves.map((l) => l._id === leaveId ? { ...l, status: newStatus } : l);
    } catch { /* silent on dashboard */ }
    finally { updatingLeaveId = null; }
  };

  const TABS: { id: DashTab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview',  label: 'Overview',  icon: BarChart3     },
    { id: 'approval',  label: 'Approval',  icon: ClipboardList },
    { id: 'finance',   label: 'Finance',   icon: IndianRupee   },
    { id: 'calendar',  label: 'Calendar',  icon: CalendarDays  },
  ];
</script>

<svelte:head><title>Admin Dashboard — ERP Portal</title></svelte:head>

<div class={clayOuter}>

  <!-- ── header ──────────────────────────────────────────────────────────────── -->
  <section class={clayShell}>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-[-0.03em] text-slate-950">Admin Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <div class="{clayInset} flex items-center gap-2 !py-2 !px-3">
          <Users class="h-3.5 w-3.5 text-indigo-500" />
          <span class="font-bold text-slate-800">{stats.totalStudents}</span>
          <span class="text-slate-400">students</span>
        </div>
        <div class="{clayInset} flex items-center gap-2 !py-2 !px-3">
          <BookOpen class="h-3.5 w-3.5 text-emerald-500" />
          <span class="font-bold text-slate-800">{stats.totalClasses}</span>
          <span class="text-slate-400">classes</span>
        </div>
        {#if upcomingExamCount > 0}
          <div class="{clayInset} flex items-center gap-2 !py-2 !px-3">
            <AlertTriangle class="h-3.5 w-3.5 text-amber-500" />
            <span class="font-bold text-slate-800">{upcomingExamCount}</span>
            <span class="text-slate-400">exams upcoming</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- tab bar -->
    <div class="mt-5 overflow-x-auto pb-0.5">
      <div class="flex min-w-max items-center gap-1 rounded-[22px] bg-[linear-gradient(180deg,#eef2ff_0%,#e8ecff_100%)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_rgba(99,102,241,0.08)]">
        {#each TABS as t}
          <button
            onclick={() => (activeTab = t.id)}
            class="inline-flex items-center gap-1.5 rounded-[18px] px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 {activeTab === t.id ? 'bg-white text-indigo-700 shadow-[0_4px_16px_rgba(99,102,241,0.18)] ring-1 ring-indigo-200/80' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800 hover:shadow-sm'}"
          >
            <t.icon class="h-3.5 w-3.5 shrink-0" />
            {t.label}
          </button>
        {/each}
      </div>
    </div>
  </section>

  {#if error}
    <div class="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
  {/if}

  <!-- ── OVERVIEW TAB ─────────────────────────────────────────────────────────── -->
  {#if activeTab === 'overview'}

    <!-- KPI row -->
    <section class={clayShell}>
      <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Key Metrics</p>
      {#if loading}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {#each { length: 4 } as _}
            <div class="h-28 animate-pulse rounded-[24px] bg-slate-100/80"></div>
          {/each}
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <!-- Total Classes -->
          <div class="{clayCard} relative overflow-hidden">
            <div class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-indigo-50 opacity-30 blur-2xl"></div>
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-600">
              <BookOpen class="h-4 w-4" />
            </div>
            <p class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{stats.totalClasses}</p>
            <p class="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Classes</p>
            <p class="mt-0.5 text-[11px] text-slate-500">Active this year</p>
            <div class="mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700">
              <ArrowUpRight class="h-2.5 w-2.5" />Active
            </div>
          </div>

          <!-- Total Students -->
          <div class="{clayCard} relative overflow-hidden">
            <div class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-emerald-50 opacity-30 blur-2xl"></div>
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-600">
              <Users class="h-4 w-4" />
            </div>
            <p class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{stats.totalStudents}</p>
            <p class="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Students</p>
            <p class="mt-0.5 text-[11px] text-slate-500">{studentPerClass} per class avg</p>
            <div class="mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700">
              <ArrowUpRight class="h-2.5 w-2.5" />Enrolled
            </div>
          </div>

          <!-- Total Teachers -->
          <div class="{clayCard} relative overflow-hidden">
            <div class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-amber-50 opacity-30 blur-2xl"></div>
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-amber-50 text-amber-600">
              <GraduationCap class="h-4 w-4" />
            </div>
            <p class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{stats.totalTeachers}</p>
            <p class="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Teachers</p>
            <p class="mt-0.5 text-[11px] text-slate-500">1 : {stats.totalTeachers > 0 ? Math.round(stats.totalStudents / stats.totalTeachers) : 0} ratio</p>
          </div>

          <!-- Avg Attendance -->
          <div class="{clayCard} relative overflow-hidden">
            <div class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full {stats.attendance >= 75 ? 'bg-emerald-50' : 'bg-rose-50'} opacity-30 blur-2xl"></div>
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-[14px] {stats.attendance >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
              <Clock class="h-4 w-4" />
            </div>
            <p class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{stats.attendance}%</p>
            <p class="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg Attendance</p>
            <p class="mt-0.5 text-[11px] text-slate-500">{stats.attendance >= 75 ? 'On target' : 'Below target'}</p>
            <div class="mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold {stats.attendance >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
              {#if stats.attendance >= 75}
                <ArrowUpRight class="h-2.5 w-2.5" />Good
              {:else}
                <ArrowDownRight class="h-2.5 w-2.5" />Low
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </section>

    <!-- charts + announcements -->
    <div class="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section class={clayShell}>
        <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Class Distribution</p>
        <p class="mb-4 text-xs text-slate-500">Students enrolled per class</p>
        {#if loading}
          <div class="h-72 animate-pulse rounded-[20px] bg-slate-100/80"></div>
        {:else if classData.length === 0}
          <p class="py-16 text-center text-sm text-slate-400">No class data yet.</p>
        {:else}
          <div class="relative" style="height:280px">
            <canvas bind:this={pieCanvas}></canvas>
          </div>
        {/if}
        {#if topClass}
          <div class="mt-4 {clayInset}">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Largest Class</p>
              <CheckCircle2 class="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p class="mt-1 text-base font-bold text-slate-800">{topClass.name}</p>
            <p class="text-xs text-slate-500">{topClass.students} students</p>
          </div>
        {/if}
      </section>

      <section class={clayShell}>
        <div class="mb-4 flex items-center gap-2">
          <Bell class="h-3.5 w-3.5 text-indigo-500" />
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Announcements</p>
        </div>
        {#if loading}
          <div class="h-40 animate-pulse rounded-[20px] bg-slate-100/80"></div>
        {:else if visibleNotifications.length === 0}
          <p class="py-8 text-center text-sm text-slate-400">No announcements yet.</p>
        {:else}
          <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {#each visibleNotifications as n, i (n.id ?? i)}
              <div class="{clayInset} transition-all duration-200 {slidingId === n.id ? '-translate-x-4 opacity-0' : 'translate-x-0 opacity-100'}">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-semibold text-slate-800">{n.title}</p>
                  <button
                    onclick={() => handleDismiss(n.id)}
                    disabled={!n.id}
                    class="text-slate-400 hover:text-rose-500 disabled:opacity-40 shrink-0"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </div>
                <p class="mt-1 text-xs text-slate-500">{n.desc}</p>
                <p class="mt-1 text-[10px] text-slate-400">{n.time}{n.author ? ` · ${n.author}` : ''}</p>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </div>

    <!-- finance snapshot -->
    {#if !loading && financeData.length > 0}
      <section class={clayShell}>
        <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Finance Snapshot</p>
        <p class="mb-4 text-xs text-slate-500">Monthly fees, expenses, and profit trend</p>
        <div class="relative" style="height:220px">
          <canvas bind:this={barCanvas}></canvas>
        </div>
      </section>
    {/if}

  {/if}

  <!-- ── APPROVAL TAB ──────────────────────────────────────────────────────────── -->
  {#if activeTab === 'approval'}

    <section class={clayShell}>
      <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Leave Request Summary</p>
      <div class="grid grid-cols-3 gap-3">
        <div class="{clayInset} text-center">
          <p class="text-2xl font-extrabold text-amber-600">{leaves.filter((l) => l.status === 'Pending').length}</p>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Pending</p>
        </div>
        <div class="{clayInset} text-center">
          <p class="text-2xl font-extrabold text-emerald-600">{leaves.filter((l) => l.status === 'Approved').length}</p>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Approved</p>
        </div>
        <div class="{clayInset} text-center">
          <p class="text-2xl font-extrabold text-rose-600">{leaves.filter((l) => l.status === 'Rejected').length}</p>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Rejected</p>
        </div>
      </div>
    </section>

    <section class={clayShell}>
      <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Teacher Leave Requests</p>
      {#if leavesLoading}
        <div class="h-40 animate-pulse rounded-[20px] bg-slate-100/80"></div>
      {:else if leaves.length === 0}
        <p class="py-10 text-center text-sm text-slate-400">No leave requests yet.</p>
      {:else}
        <div class="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {#each leaves as leave (leave._id)}
            {@const statusClr = leave.status === 'Approved'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : leave.status === 'Pending'
              ? 'bg-amber-50 text-amber-700 border-amber-100'
              : 'bg-rose-50 text-rose-700 border-rose-100'}
            <div class={clayInset}>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-slate-800">{leave.title}</p>
                  <p class="mt-0.5 text-xs text-slate-500 line-clamp-2">{leave.description}</p>
                </div>
                <span class="shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[11px] font-bold {statusClr}">{leave.status}</span>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Teacher</p>
                  <p class="mt-0.5 font-semibold text-slate-800">{leave.teacherId?.name ?? 'Unknown'}</p>
                  <p class="text-[11px] text-slate-400">{leave.teacherId?.email ?? ''}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Type · Applied</p>
                  <p class="mt-0.5 font-semibold text-slate-800">{leave.leaveType}</p>
                  <p class="text-[11px] text-slate-400">{new Date(leave.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                {#if leave.fileData}
                  <a href={leave.fileData} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline">
                    <FileText class="h-3.5 w-3.5" />{leave.fileName ?? 'Attachment'}
                  </a>
                {:else}
                  <span class="text-xs text-slate-400">No attachment</span>
                {/if}
                <div class="flex gap-2">
                  <button
                    onclick={() => updateLeaveStatus(leave._id, 'Approved')}
                    disabled={updatingLeaveId === leave._id || leave.status === 'Approved'}
                    class="inline-flex items-center gap-1.5 rounded-[14px] bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check class="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onclick={() => updateLeaveStatus(leave._id, 'Rejected')}
                    disabled={updatingLeaveId === leave._id || leave.status === 'Rejected'}
                    class="inline-flex items-center gap-1.5 rounded-[14px] bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <X class="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

  {/if}

  <!-- ── FINANCE TAB ───────────────────────────────────────────────────────────── -->
  {#if activeTab === 'finance'}

    <!-- collection KPIs -->
    <section class={clayShell}>
      <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Fee Collection Summary</p>
      {#if finStudentsLoading}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {#each { length: 4 } as _}
            <div class="h-28 animate-pulse rounded-[24px] bg-slate-100/80"></div>
          {/each}
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <!-- Total Billed -->
          <div class="{clayCard} relative overflow-hidden">
            <div class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-indigo-50 opacity-30 blur-2xl"></div>
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-600">
              <IndianRupee class="h-4 w-4" />
            </div>
            <p class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{fmtShort(finStats.total)}</p>
            <p class="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Billed</p>
            <p class="mt-0.5 text-[11px] text-slate-500">{finMetrics?.totalStudents ?? 0} students</p>
            <div class="mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700">
              <ArrowUpRight class="h-2.5 w-2.5" />Billed
            </div>
          </div>

          <!-- Collected -->
          <div class="{clayCard} relative overflow-hidden">
            <div class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-emerald-50 opacity-30 blur-2xl"></div>
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-600">
              <TrendingUp class="h-4 w-4" />
            </div>
            <p class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{fmtShort(finStats.collected)}</p>
            <p class="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Collected</p>
            <p class="mt-0.5 text-[11px] text-slate-500">{finStats.total > 0 ? `${Math.round((finStats.collected / finStats.total) * 100)}% of billed` : '—'}</p>
            <div class="mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700">
              <ArrowUpRight class="h-2.5 w-2.5" />Paid
            </div>
          </div>

          <!-- Pending -->
          <div class="{clayCard} relative overflow-hidden">
            <div class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-amber-50 opacity-30 blur-2xl"></div>
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-amber-50 text-amber-600">
              <TrendingDown class="h-4 w-4" />
            </div>
            <p class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{fmtShort(finStats.pending)}</p>
            <p class="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending</p>
            <p class="mt-0.5 text-[11px] text-slate-500">Outstanding</p>
            <div class="mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700">
              <ArrowDownRight class="h-2.5 w-2.5" />Due
            </div>
          </div>

          <!-- Overdue -->
          <div class="{clayCard} relative overflow-hidden">
            <div class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-rose-50 opacity-30 blur-2xl"></div>
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-rose-50 text-rose-600">
              <AlertTriangle class="h-4 w-4" />
            </div>
            <p class="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{finStats.overdue}</p>
            <p class="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Overdue</p>
            <p class="mt-0.5 text-[11px] text-slate-500">Students overdue</p>
            <div class="mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700">
              <ArrowDownRight class="h-2.5 w-2.5" />At risk
            </div>
          </div>
        </div>
      {/if}
    </section>

    <!-- student status breakdown -->
    <section class={clayShell}>
      <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Student Payment Status</p>
      <div class="grid grid-cols-4 gap-2">
        {#each [
          { label: 'Paid',    count: finStats.paid,    color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Partial', count: finStats.partial, color: 'bg-amber-50 text-amber-700 border-amber-100'       },
          { label: 'Unpaid',  count: finStats.unpaid,  color: 'bg-slate-50 text-slate-600 border-slate-200'       },
          { label: 'Overdue', count: finStats.overdue, color: 'bg-rose-50 text-rose-700 border-rose-100'          },
        ] as s}
          <div class="rounded-[18px] border py-4 text-center {s.color}">
            <p class="text-2xl font-extrabold">{s.count}</p>
            <p class="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{s.label}</p>
          </div>
        {/each}
      </div>
      {#if finMetrics !== null}
        <div class="mt-4">
          <div class="flex items-center justify-between mb-1.5">
            <p class="text-xs font-semibold text-slate-500">Collection progress</p>
            <p class="text-xs font-bold text-slate-800">{finStats.total > 0 ? Math.round((finStats.collected / finStats.total) * 100) : 0}%</p>
          </div>
          <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70">
            <div
              class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
              style="width: {finStats.total > 0 ? Math.round((finStats.collected / finStats.total) * 100) : 0}%"
            ></div>
          </div>
        </div>
      {/if}
    </section>

    <!-- important dates -->
    <section class={clayShell}>
      <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Important Dates</p>
      <p class="mb-4 text-xs text-slate-500">Upcoming fee due dates for unpaid students</p>
      {#if finStudentsLoading}
        <div class="h-40 animate-pulse rounded-[20px] bg-slate-100/80"></div>
      {:else if finDueDates.length === 0}
        <p class="py-8 text-center text-sm text-slate-400">No upcoming due dates.</p>
      {:else}
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {#each finDueDates as s, i (s.studentName + i)}
            {@const isOverdue = s.daysLeft < 0}
            {@const isUrgent  = s.daysLeft >= 0 && s.daysLeft <= 7}
            {@const cardClr   = isOverdue ? 'border-rose-100 bg-rose-50/60' : isUrgent ? 'border-amber-100 bg-amber-50/60' : ''}
            {@const dateClr   = isOverdue ? 'text-rose-600' : isUrgent ? 'text-amber-600' : 'text-indigo-600'}
            {@const badge     = isOverdue ? `${Math.abs(s.daysLeft)}d overdue` : `${s.daysLeft}d left`}
            {@const badgeClr  = isOverdue ? 'bg-rose-100 text-rose-700' : isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'}
            <div class="{clayInset} {cardClr}">
              <div class="flex items-start justify-between gap-1">
                <p class="text-[10px] font-bold uppercase tracking-wide {dateClr}">
                  {new Date(s.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold {badgeClr}">{badge}</span>
              </div>
              <p class="mt-1.5 text-xs font-semibold text-slate-800">{s.studentName || 'Student'}</p>
              <p class="text-[11px] text-slate-500">{s.className || ''}</p>
              <p class="mt-1.5 text-xs font-bold text-slate-700">{fmtShort(s.dueAmount)} <span class="font-normal text-slate-400">due</span></p>
            </div>
          {/each}
        </div>
      {/if}
    </section>

  {/if}

  <!-- ── CALENDAR TAB ──────────────────────────────────────────────────────────── -->
  {#if activeTab === 'calendar'}
    <div class="grid gap-5 xl:grid-cols-[1fr_300px]">

      <!-- events table -->
      <section class={clayShell}>
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">School Calendar</p>
            <p class="mt-0.5 text-xs text-slate-500">Exams and finance checkpoints</p>
          </div>
          <div class="{clayInset} !py-1.5 !px-3 text-[10px] font-bold text-slate-500">
            <CalendarDays class="inline h-3 w-3 mr-1" />{calendarFeed.length} events
          </div>
        </div>
        {#if loading}
          <div class="h-[400px] animate-pulse rounded-[20px] bg-slate-100/80"></div>
        {:else if calendarFeed.length === 0}
          <p class="py-16 text-center text-sm text-slate-400">No calendar events found.</p>
        {:else}
          <div class="overflow-hidden rounded-[20px] border border-slate-200/70">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200/70">
                  <th class="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Event</th>
                  <th class="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Date &amp; Time</th>
                  <th class="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Type</th>
                  <th class="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 hidden sm:table-cell">Details</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each calendarFeed as ev (ev.id)}
                  <tr
                    class="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onclick={() => (selectedDate = ev.start)}
                  >
                    <td class="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">{ev.title}</td>
                    <td class="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{fmtCalDate(ev.start)}</td>
                    <td class="px-4 py-3">
                      <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase {ev.type === 'exam' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}">{ev.type}</span>
                    </td>
                    <td class="px-4 py-3 text-[11px] text-slate-400 hidden sm:table-cell max-w-[200px] truncate">{ev.meta}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <!-- upcoming events sidebar -->
      <section class={clayShell}>
        <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Upcoming Events</p>
        {#if upcomingEvents.length === 0}
          <p class="py-8 text-center text-sm text-slate-400">No upcoming events.</p>
        {:else}
          <div class="space-y-2">
            {#each upcomingEvents as ev (ev.id)}
              <button
                class="{clayInset} w-full text-left hover:shadow-md transition-shadow"
                onclick={() => (selectedDate = ev.start)}
              >
                <div class="flex items-start justify-between gap-1">
                  <p class="text-xs font-semibold text-slate-800 leading-snug">{ev.title}</p>
                  <span class="shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-bold uppercase {ev.type === 'exam' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}">{ev.type}</span>
                </div>
                <p class="mt-1 text-[10px] text-slate-500">{fmtCalDate(ev.start)}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">{ev.meta}</p>
              </button>
            {/each}
          </div>
        {/if}
      </section>

    </div>
  {/if}

  <!-- ── date detail modal ─────────────────────────────────────────────────────── -->
  {#if selectedDate}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onclick={() => (selectedDate = null)}
      ></button>
      <div class="relative w-full max-w-lg {clayShell} shadow-2xl" role="dialog" aria-modal="true" aria-label="Date details">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date Details</p>
            <h3 class="mt-1 text-base font-bold text-slate-900">
              {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <button
            class="{clayInset} !py-1.5 !px-3 text-xs font-semibold text-slate-600"
            onclick={() => (selectedDate = null)}
          >Close</button>
        </div>
        <div class="mt-4 space-y-2">
          {#if selectedDateEvents.length === 0}
            <p class="{clayInset} text-sm text-slate-400 text-center">No events on this date.</p>
          {:else}
            {#each selectedDateEvents as ev (ev.id)}
              <div class={clayInset}>
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-slate-800">{ev.title}</p>
                  <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold {ev.type === 'exam' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}">{ev.type}</span>
                </div>
                <p class="mt-1 text-xs text-slate-500">{fmtCalDate(ev.start)}</p>
                <p class="text-xs text-slate-400">{ev.meta}</p>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}

</div>

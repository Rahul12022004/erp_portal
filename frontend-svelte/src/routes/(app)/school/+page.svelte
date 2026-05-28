<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    Users, BookOpen, GraduationCap, Clock, Bell, CalendarDays, X,
    TrendingUp, TrendingDown, IndianRupee, BarChart3,
    ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle,
    Check, FileText, ClipboardList, Sparkles,
    ChevronLeft, ChevronRight,
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
  let finError: string                = $state('');

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const schoolName = $derived($page.data.user?.schoolName ?? 'School');

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

  const collectionPct = $derived(
    finStats.total > 0 ? Math.round((finStats.collected / finStats.total) * 100) : 0
  );

  // ─── chart refs ───────────────────────────────────────────────────────────────
  let pieCanvas: HTMLCanvasElement | undefined = $state();
  let barCanvas: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    const canvas   = pieCanvas;
    const labels   = classData.map((c) => c.name);
    const values   = classData.map((c) => c.students);
    if (!canvas || labels.length === 0) return;
    let chart: Chart | undefined;
    const raf = requestAnimationFrame(() => {
      chart = new Chart(canvas, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#f97316','#14b8a6'],
            borderWidth: 3,
            borderColor: '#fff',
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 11, family: 'Inter' }, padding: 14, usePointStyle: true, pointStyleWidth: 8 } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} students` } },
          },
        },
      });
    });
    return () => { cancelAnimationFrame(raf); chart?.destroy(); };
  });

  $effect(() => {
    const canvas   = barCanvas;
    const labels   = financeData.map((f) => f.month);
    const fees     = financeData.map((f) => f.fees);
    const expenses = financeData.map((f) => f.expense);
    const profits  = financeData.map((f) => f.profit);
    if (!canvas || labels.length === 0) return;
    let chart: Chart | undefined;
    const raf = requestAnimationFrame(() => {
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Fees',    data: fees,     backgroundColor: '#6366f1cc', borderRadius: 6 },
            { label: 'Expense', data: expenses, backgroundColor: '#f59e0bcc', borderRadius: 6 },
            { label: 'Profit',  data: profits,  backgroundColor: '#10b981cc', borderRadius: 6 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 11, family: 'Inter' }, padding: 14, usePointStyle: true, pointStyleWidth: 8 } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtShort(ctx.parsed.y as number)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { grid: { color: '#f1f5f9' }, border: { dash: [4,2] }, ticks: { font: { size: 11 }, callback: (v) => fmtShort(Number(v)) } },
          },
        },
      });
    });
    return () => { cancelAnimationFrame(raf); chart?.destroy(); };
  });

  // ─── data fetching ────────────────────────────────────────────────────────────
  const fetchDashboard = async () => {
    if (!schoolId) { error = 'School not found. Please log in again.'; loading = false; return; }
    try {
      loading = true; error = '';
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
    finError = '';
    try {
      // Use the purpose-built dashboard-summary endpoint for aggregated metrics
      const summaryRes = await authedFetch(`/api/finance/${schoolId}/dashboard-summary`);
      if (summaryRes.ok) {
        const sd = await summaryRes.json();
        const fee = (sd?.data?.fee ?? {}) as Record<string, number>;
        finMetrics = {
          totalStudents:        Number(fee.totalStudents   ?? 0),
          currentTotalFee:      Number(fee.totalFeeAmount  ?? 0),
          currentPaidAmount:    Number(fee.collectedAmount ?? 0),
          currentPendingAmount: Number(fee.pendingAmount   ?? 0),
          paidCount:    Number(fee.paidCount    ?? 0),
          partialCount: Number(fee.partialCount ?? 0),
          pendingCount: Number(fee.unpaidCount  ?? 0),
          overdueCount: Number(fee.overdueCount ?? 0),
        };
      } else {
        const errBody = await summaryRes.json().catch(() => ({})) as Record<string, unknown>;
        finError = String(errBody?.error ?? errBody?.message ?? `Finance API error ${summaryRes.status}`);
      }

      // Fetch upcoming due dates separately
      const listRes = await authedFetch(`/api/finance/assignments?schoolId=${schoolId}&limit=50`);
      if (listRes.ok) {
        const resp = await listRes.json();
        const assignments: Record<string, unknown>[] = Array.isArray(resp?.data?.data) ? resp.data.data : [];
        const now = Date.now();
        finDueDates = assignments
          .filter((a) => String(a.feeStatus ?? '') !== 'PAID' && a.dueDate)
          .sort((a, b) => new Date(String(a.dueDate ?? '')).getTime() - new Date(String(b.dueDate ?? '')).getTime())
          .slice(0, 8)
          .map((a) => {
            const dueDate = String(a.dueDate ?? '');
            return {
              studentName: String(a.studentId ?? 'Student'),
              className:   String(a.classFeeStructureId ?? ''),
              dueAmount:   Number(a.dueAmount  ?? 0),
              status:      String(a.feeStatus  ?? 'UNPAID').toLowerCase(),
              dueDate,
              daysLeft: dueDate ? Math.ceil((new Date(dueDate).getTime() - now) / 86_400_000) : 0,
            };
          });
      }
    } catch (err) {
      finError = err instanceof Error ? err.message : 'Failed to load finance data';
    } finally {
      finStudentsLoading = false;
    }
  };

  onMount(() => {
    fetchDashboard();
    fetchLeaves();
    fetchFinStudents();
    const handler = () => fetchDashboard();
    window.addEventListener('announcements-updated', handler);
    return () => window.removeEventListener('announcements-updated', handler);
  });

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
    } catch { /* silent */ }
    finally { updatingLeaveId = null; }
  };

  const TABS: { id: DashTab; label: string }[] = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'approval',  label: 'Approvals' },
    { id: 'finance',   label: 'Finance'   },
    { id: 'calendar',  label: 'Calendar'  },
  ];

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ─── calendar grid ────────────────────────────────────────────────────────────
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  let calendarMonth = $state(new Date().getMonth());
  let calendarYear  = $state(new Date().getFullYear());

  const calendarGrid = $derived.by(() => {
    const firstDow = new Date(calendarYear, calendarMonth, 1).getDay();
    const lastDate  = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= lastDate; d++) days.push(new Date(calendarYear, calendarMonth, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  });

  function prevMonth() {
    if (calendarMonth === 0) { calendarMonth = 11; calendarYear--; }
    else calendarMonth--;
  }
  function nextMonth() {
    if (calendarMonth === 11) { calendarMonth = 0; calendarYear++; }
    else calendarMonth++;
  }
</script>

<svelte:head><title>Dashboard — {schoolName}</title></svelte:head>

<div class="space-y-5">

  <!-- ── PAGE HEADER ─────────────────────────────────────────────────────────── -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <div class="flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-primary" />
        <p class="text-xs font-medium text-muted-foreground">{today}</p>
      </div>
      <h1 class="mt-1 text-2xl font-bold text-foreground">School Dashboard</h1>
      <p class="text-sm text-muted-foreground">{schoolName}</p>
    </div>

    <!-- quick stats pills -->
    <div class="flex flex-wrap gap-2">
      {#if loading}
        {#each { length: 3 } as _}
          <div class="h-8 w-24 animate-pulse rounded-full bg-muted"></div>
        {/each}
      {:else}
        <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          <Users class="h-3 w-3" />{stats.totalStudents} Students
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <BookOpen class="h-3 w-3" />{stats.totalClasses} Classes
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
          <GraduationCap class="h-3 w-3" />{stats.totalTeachers} Teachers
        </span>
        {#if upcomingExamCount > 0}
          <span class="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
            <AlertTriangle class="h-3 w-3" />{upcomingExamCount} Exams Upcoming
          </span>
        {/if}
      {/if}
    </div>
  </div>

  {#if error}
    <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  {/if}

  <!-- ── TAB NAVIGATION ──────────────────────────────────────────────────────── -->
  <div class="flex border-b border-border">
    {#each TABS as t}
      <button
        onclick={() => (activeTab = t.id)}
        class="px-5 py-3 text-sm font-medium border-b-2 transition-colors
          {activeTab === t.id
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}"
      >
        {t.label}
      </button>
    {/each}
  </div>

  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  <!-- OVERVIEW TAB                                                               -->
  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'overview'}
  <div class="tab-content-enter space-y-5">

    <!-- KPI Cards -->
    {#if loading}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {#each { length: 4 } as _}
          <div class="h-32 animate-pulse rounded-xl bg-muted"></div>
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">

        <!-- Classes -->
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div class="h-1 bg-indigo-500"></div>
          <div class="p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <BookOpen class="h-4 w-4 text-indigo-600" />
              </div>
              <span class="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                <ArrowUpRight class="h-3 w-3" />Active
              </span>
            </div>
            <p class="text-3xl font-bold text-foreground">{stats.totalClasses}</p>
            <p class="text-xs font-medium text-muted-foreground mt-0.5">Total Classes</p>
            <p class="text-xs text-muted-foreground mt-1">{studentPerClass} students/class avg</p>
          </div>
        </div>

        <!-- Students -->
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div class="h-1 bg-emerald-500"></div>
          <div class="p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <Users class="h-4 w-4 text-emerald-600" />
              </div>
              <span class="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                <ArrowUpRight class="h-3 w-3" />Enrolled
              </span>
            </div>
            <p class="text-3xl font-bold text-foreground">{stats.totalStudents}</p>
            <p class="text-xs font-medium text-muted-foreground mt-0.5">Total Students</p>
            <p class="text-xs text-muted-foreground mt-1">Across {stats.totalClasses} classes</p>
          </div>
        </div>

        <!-- Teachers -->
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div class="h-1 bg-amber-500"></div>
          <div class="p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <GraduationCap class="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p class="text-3xl font-bold text-foreground">{stats.totalTeachers}</p>
            <p class="text-xs font-medium text-muted-foreground mt-0.5">Teachers</p>
            <p class="text-xs text-muted-foreground mt-1">
              1:{stats.totalTeachers > 0 ? Math.round(stats.totalStudents / stats.totalTeachers) : 0} student ratio
            </p>
          </div>
        </div>

        <!-- Finance snapshot -->
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div class="h-1 {finStats.total > 0 && collectionPct >= 70 ? 'bg-teal-500' : 'bg-rose-400'}"></div>
          <div class="p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
                <IndianRupee class="h-4 w-4 text-teal-600" />
              </div>
              <span class="text-xs font-semibold {collectionPct >= 70 ? 'text-emerald-600' : 'text-rose-600'}">{collectionPct}%</span>
            </div>
            <p class="text-3xl font-bold text-foreground">{fmtShort(finStats.collected)}</p>
            <p class="text-xs font-medium text-muted-foreground mt-0.5">Fees Collected</p>
            <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div class="h-full rounded-full {collectionPct >= 70 ? 'bg-emerald-500' : 'bg-rose-400'} transition-all duration-700"
                style="width:{collectionPct}%"></div>
            </div>
          </div>
        </div>

      </div>
    {/if}

    <!-- Charts + Announcements -->
    <div class="grid gap-5 lg:grid-cols-[1fr_320px]">

      <!-- Class distribution chart -->
      <div class="bg-white rounded-xl border border-border shadow-sm p-5">
        <h3 class="text-sm font-semibold text-foreground mb-0.5">Class Distribution</h3>
        <p class="text-xs text-muted-foreground mb-4">Students enrolled per class</p>
        {#if loading}
          <div class="h-64 animate-pulse rounded-lg bg-muted"></div>
        {:else if classData.length === 0}
          <div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BookOpen class="h-10 w-10 mb-2 opacity-30" />
            <p class="text-sm">No class data yet</p>
          </div>
        {:else}
          <div class="relative" style="height:256px">
            <canvas bind:this={pieCanvas}></canvas>
          </div>
          {#if topClass}
            <div class="mt-4 flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <CheckCircle2 class="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <p class="text-xs font-semibold text-foreground">Largest class: {topClass.name}</p>
                <p class="text-xs text-muted-foreground">{topClass.students} students</p>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Announcements -->
      <div class="bg-white rounded-xl border border-border shadow-sm p-5">
        <div class="flex items-center gap-2 mb-4">
          <Bell class="h-4 w-4 text-primary" />
          <h3 class="text-sm font-semibold text-foreground">Announcements</h3>
          {#if visibleNotifications.length > 0}
            <span class="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {visibleNotifications.length}
            </span>
          {/if}
        </div>
        {#if loading}
          <div class="space-y-3">
            {#each { length: 3 } as _}
              <div class="h-16 animate-pulse rounded-lg bg-muted"></div>
            {/each}
          </div>
        {:else if visibleNotifications.length === 0}
          <div class="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Bell class="h-10 w-10 mb-2 opacity-20" />
            <p class="text-sm">No announcements</p>
          </div>
        {:else}
          <div class="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {#each visibleNotifications as n, i (n.id ?? i)}
              <div class="rounded-lg border border-border bg-background p-3 transition-all duration-200
                {slidingId === n.id ? '-translate-x-4 opacity-0' : 'translate-x-0 opacity-100'}">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-semibold text-foreground leading-snug">{n.title}</p>
                  <button onclick={() => handleDismiss(n.id)} disabled={!n.id}
                    class="text-muted-foreground hover:text-destructive disabled:opacity-30 shrink-0">
                    <X class="h-3.5 w-3.5" />
                  </button>
                </div>
                <p class="mt-1 text-xs text-muted-foreground line-clamp-2">{n.desc}</p>
                <p class="mt-1 text-[10px] text-muted-foreground/70">{n.time}{n.author ? ` · ${n.author}` : ''}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Finance trend chart -->
    {#if !loading && financeData.length > 0}
      <div class="bg-white rounded-xl border border-border shadow-sm p-5">
        <h3 class="text-sm font-semibold text-foreground mb-0.5">Finance Trend</h3>
        <p class="text-xs text-muted-foreground mb-4">Monthly fees, expenses, and profit</p>
        <div class="relative" style="height:220px">
          <canvas bind:this={barCanvas}></canvas>
        </div>
      </div>
    {/if}

  </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  <!-- APPROVAL TAB                                                               -->
  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'approval'}
  <div class="tab-content-enter space-y-5">

    <!-- Summary row -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-amber-200 shadow-sm p-5 text-center">
        <p class="text-3xl font-bold text-amber-600">{leaves.filter((l) => l.status === 'Pending').length}</p>
        <p class="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wide">Pending</p>
      </div>
      <div class="bg-white rounded-xl border border-emerald-200 shadow-sm p-5 text-center">
        <p class="text-3xl font-bold text-emerald-600">{leaves.filter((l) => l.status === 'Approved').length}</p>
        <p class="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wide">Approved</p>
      </div>
      <div class="bg-white rounded-xl border border-red-200 shadow-sm p-5 text-center">
        <p class="text-3xl font-bold text-red-600">{leaves.filter((l) => l.status === 'Rejected').length}</p>
        <p class="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wide">Rejected</p>
      </div>
    </div>

    <!-- Leave list -->
    <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-border">
        <h3 class="text-sm font-semibold text-foreground">Teacher Leave Requests</h3>
      </div>
      {#if leavesLoading}
        <div class="p-5 space-y-3">
          {#each { length: 3 } as _}
            <div class="h-24 animate-pulse rounded-lg bg-muted"></div>
          {/each}
        </div>
      {:else if leaves.length === 0}
        <div class="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <ClipboardList class="h-10 w-10 mb-2 opacity-20" />
          <p class="text-sm">No leave requests yet</p>
        </div>
      {:else}
        <div class="divide-y divide-border max-h-[560px] overflow-y-auto">
          {#each leaves as leave (leave._id)}
            {@const isPending  = leave.status === 'Pending'}
            {@const isApproved = leave.status === 'Approved'}
            <div class="p-5 hover:bg-muted/30 transition-colors">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-sm font-semibold text-foreground">{leave.title}</p>
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold
                      {isApproved ? 'bg-emerald-100 text-emerald-700'
                       : isPending ? 'bg-amber-100 text-amber-700'
                       : 'bg-red-100 text-red-700'}">
                      {leave.status}
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-muted-foreground line-clamp-2">{leave.description}</p>
                </div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-x-4 text-xs">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Teacher</p>
                  <p class="mt-0.5 font-semibold text-foreground">{leave.teacherId?.name ?? 'Unknown'}</p>
                  <p class="text-[11px] text-muted-foreground">{leave.teacherId?.email ?? ''}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type · Applied</p>
                  <p class="mt-0.5 font-semibold text-foreground">{leave.leaveType}</p>
                  <p class="text-[11px] text-muted-foreground">
                    {new Date(leave.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between gap-2">
                {#if leave.fileData}
                  <a href={leave.fileData} target="_blank" rel="noreferrer"
                    class="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <FileText class="h-3.5 w-3.5" />{leave.fileName ?? 'Attachment'}
                  </a>
                {:else}
                  <span class="text-xs text-muted-foreground">No attachment</span>
                {/if}
                <div class="flex gap-2">
                  <button
                    onclick={() => updateLeaveStatus(leave._id, 'Approved')}
                    disabled={updatingLeaveId === leave._id || isApproved}
                    class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    <Check class="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onclick={() => updateLeaveStatus(leave._id, 'Rejected')}
                    disabled={updatingLeaveId === leave._id || leave.status === 'Rejected'}
                    class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                    <X class="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  <!-- FINANCE TAB                                                                -->
  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'finance'}
  <div class="tab-content-enter space-y-5">

    {#if finError}
      <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{finError}</div>
    {/if}

    <!-- Finance KPIs -->
    {#if finStudentsLoading}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {#each { length: 4 } as _}
          <div class="h-32 animate-pulse rounded-xl bg-muted"></div>
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div class="h-1 bg-indigo-500"></div>
          <div class="p-4">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 mb-3">
              <IndianRupee class="h-4 w-4 text-indigo-600" />
            </div>
            <p class="text-2xl font-bold text-foreground">{fmtShort(finStats.total)}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Total Billed</p>
            <p class="text-xs text-muted-foreground mt-1">{finMetrics?.totalStudents ?? 0} students</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div class="h-1 bg-emerald-500"></div>
          <div class="p-4">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 mb-3">
              <TrendingUp class="h-4 w-4 text-emerald-600" />
            </div>
            <p class="text-2xl font-bold text-foreground">{fmtShort(finStats.collected)}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Collected</p>
            <p class="text-xs text-emerald-600 font-semibold mt-1">{collectionPct}% of billed</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div class="h-1 bg-amber-500"></div>
          <div class="p-4">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 mb-3">
              <TrendingDown class="h-4 w-4 text-amber-600" />
            </div>
            <p class="text-2xl font-bold text-foreground">{fmtShort(finStats.pending)}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Outstanding</p>
            <p class="text-xs text-muted-foreground mt-1">Yet to collect</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div class="h-1 bg-red-500"></div>
          <div class="p-4">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 mb-3">
              <AlertTriangle class="h-4 w-4 text-red-600" />
            </div>
            <p class="text-2xl font-bold text-foreground">{finStats.overdue}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Overdue</p>
            <p class="text-xs text-red-600 font-semibold mt-1">Needs attention</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- Payment status + progress -->
    <div class="bg-white rounded-xl border border-border shadow-sm p-5">
      <h3 class="text-sm font-semibold text-foreground mb-4">Payment Status Breakdown</h3>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        {#each [
          { label: 'Paid',    count: finStats.paid,    cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'Partial', count: finStats.partial, cls: 'bg-amber-50 border-amber-200 text-amber-700'       },
          { label: 'Unpaid',  count: finStats.unpaid,  cls: 'bg-gray-50 border-gray-200 text-gray-600'          },
          { label: 'Overdue', count: finStats.overdue, cls: 'bg-red-50 border-red-200 text-red-700'              },
        ] as s}
          <div class="rounded-xl border py-4 text-center {s.cls}">
            <p class="text-2xl font-bold">{s.count}</p>
            <p class="mt-1 text-[11px] font-semibold uppercase tracking-wide">{s.label}</p>
          </div>
        {/each}
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-medium text-muted-foreground">Collection progress</p>
          <p class="text-xs font-bold text-foreground">{collectionPct}%</p>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div class="h-full rounded-full transition-all duration-700
            {collectionPct >= 80 ? 'bg-emerald-500' : collectionPct >= 50 ? 'bg-amber-500' : 'bg-red-400'}"
            style="width:{collectionPct}%"></div>
        </div>
        <div class="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{fmtShort(finStats.collected)} collected</span>
          <span>{fmtShort(finStats.pending)} pending</span>
        </div>
      </div>
    </div>

    <!-- Upcoming due dates -->
    <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-border">
        <h3 class="text-sm font-semibold text-foreground">Upcoming Fee Due Dates</h3>
        <p class="text-xs text-muted-foreground mt-0.5">Students with pending payments</p>
      </div>
      {#if finStudentsLoading}
        <div class="p-5 space-y-2">
          {#each { length: 4 } as _}
            <div class="h-12 animate-pulse rounded-lg bg-muted"></div>
          {/each}
        </div>
      {:else if finDueDates.length === 0}
        <div class="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <CheckCircle2 class="h-8 w-8 mb-1.5 text-emerald-500 opacity-50" />
          <p class="text-sm">No upcoming due dates</p>
        </div>
      {:else}
        <div class="divide-y divide-border">
          {#each finDueDates as s, i (s.studentName + i)}
            {@const isOverdue = s.daysLeft < 0}
            {@const isUrgent  = !isOverdue && s.daysLeft <= 7}
            <div class="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div class="shrink-0 w-12 text-center">
                <p class="text-sm font-bold {isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-indigo-600'}">
                  {isOverdue ? `+${Math.abs(s.daysLeft)}d` : `${s.daysLeft}d`}
                </p>
                <p class="text-[9px] text-muted-foreground uppercase">{isOverdue ? 'overdue' : 'left'}</p>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground">{s.studentName}</p>
                <p class="text-xs text-muted-foreground">{s.className} · {new Date(s.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-sm font-semibold text-foreground">{fmtShort(s.dueAmount)}</p>
                <span class="text-[10px] font-semibold uppercase
                  {isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'}">
                  {s.status}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  <!-- CALENDAR TAB                                                               -->
  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'calendar'}
  <div class="tab-content-enter grid gap-5 xl:grid-cols-[1fr_280px]">

    <!-- Month grid -->
    <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <!-- Month nav header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-border">
        <button onclick={prevMonth}
          class="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft class="h-4 w-4" />
        </button>
        <div class="text-center">
          <p class="text-sm font-semibold text-foreground">{MONTH_NAMES[calendarMonth]} {calendarYear}</p>
          <p class="text-xs text-muted-foreground">{calendarFeed.length} events total</p>
        </div>
        <button onclick={nextMonth}
          class="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <!-- Day-of-week headers -->
      <div class="grid grid-cols-7 border-b border-border bg-muted/40">
        {#each DAY_NAMES as d}
          <div class="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
        {/each}
      </div>

      <!-- Calendar grid cells -->
      <div class="grid grid-cols-7">
        {#each calendarGrid as day, i (i)}
          {@const todayKey   = toDateKey(new Date())}
          {@const isToday    = !!day && toDateKey(day) === todayKey}
          {@const isSelected = !!day && !!selectedDate && toDateKey(day) === toDateKey(selectedDate)}
          {@const dayEvents  = day ? (eventsByDate.get(toDateKey(day)) ?? []) : []}
          <div
            role="button"
            tabindex={day ? 0 : -1}
            onclick={() => day && (selectedDate = day)}
            onkeydown={(e) => e.key === 'Enter' && day && (selectedDate = day)}
            class="min-h-[72px] p-1 border-b border-r border-border select-none
              {i % 7 === 6 ? 'border-r-0' : ''}
              {day ? 'cursor-pointer hover:bg-muted/40 transition-colors' : 'bg-muted/10 cursor-default'}
              {isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}"
          >
            {#if day}
              <div class="flex justify-end mb-0.5">
                <span class="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                  {isToday ? 'bg-primary text-primary-foreground font-bold' : isSelected ? 'bg-primary/20 text-primary font-semibold' : 'text-foreground'}">
                  {day.getDate()}
                </span>
              </div>
              {#each dayEvents.slice(0, 2) as ev (ev.id)}
                <div class="mb-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight
                  {ev.type === 'exam' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}">
                  {ev.title}
                </div>
              {/each}
              {#if dayEvents.length > 2}
                <div class="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 2} more</div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Upcoming sidebar -->
    <div class="bg-white rounded-xl border border-border shadow-sm p-5">
      <h3 class="text-sm font-semibold text-foreground mb-4">Upcoming Events</h3>
      {#if upcomingEvents.length === 0}
        <div class="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <CalendarDays class="h-8 w-8 mb-1.5 opacity-20" />
          <p class="text-sm">No upcoming events</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each upcomingEvents as ev (ev.id)}
            <button class="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
              onclick={() => (selectedDate = ev.start)}>
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs font-semibold text-foreground leading-snug">{ev.title}</p>
                <span class="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded
                  {ev.type === 'exam' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}">
                  {ev.type}
                </span>
              </div>
              <p class="mt-1 text-[10px] text-muted-foreground">{fmtCalDate(ev.start)}</p>
            </button>
          {/each}
        </div>
      {/if}
    </div>

  </div>
  {/if}

</div>

<!-- ── Date detail modal ─────────────────────────────────────────────────────── -->
{#if selectedDate}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" aria-label="Close" class="absolute inset-0 bg-black/40 backdrop-blur-sm"
      onclick={() => (selectedDate = null)}></button>
    <div class="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-border p-6">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events on</p>
          <h3 class="mt-0.5 text-base font-bold text-foreground">
            {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <button onclick={() => (selectedDate = null)}
          class="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
          <X class="h-4 w-4" />
        </button>
      </div>
      <div class="space-y-2">
        {#if selectedDateEvents.length === 0}
          <p class="text-sm text-muted-foreground text-center py-6">No events on this date.</p>
        {:else}
          {#each selectedDateEvents as ev (ev.id)}
            <div class="rounded-lg border border-border p-3">
              <div class="flex items-center justify-between gap-2 mb-1">
                <p class="text-sm font-semibold text-foreground">{ev.title}</p>
                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded
                  {ev.type === 'exam' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}">
                  {ev.type}
                </span>
              </div>
              <p class="text-xs text-muted-foreground">{fmtCalDate(ev.start)}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{ev.meta}</p>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

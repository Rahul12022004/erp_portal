<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    CalendarDays, Download, Users, GraduationCap, Search,
    CheckCircle2, XCircle, Clock, BarChart3, Settings2,
    ChevronDown, Filter, MapPin, AlertCircle, RefreshCw,
  } from 'lucide-svelte';
  import { api } from '$lib/api/client';

  import GeofenceCard    from '$lib/components/attendance/GeofenceCard.svelte';
  import TeacherCard     from '$lib/components/attendance/TeacherCard.svelte';
  import SchoolCalendar  from '$lib/components/attendance/SchoolCalendar.svelte';
  import TeacherCalendarPanel from '$lib/components/attendance/TeacherCalendarPanel.svelte';

  // ─── Types ────────────────────────────────────────────────────────────────────
  type TeacherAttendance = {
    attendanceId: string | null; remarks: string;
    staffId: string; name: string; position: string; status: string | null;
  };
  type AttendanceRecord = {
    _id: string; date: string;
    status: 'Present' | 'Absent' | 'Leave' | 'Half Day';
    remarks?: string; staffId: string | { _id?: string };
  };
  type LeaveRecord = {
    _id: string; leaveType: 'Paid' | 'Unpaid' | 'Emergency';
    status: 'Pending' | 'Approved' | 'Rejected';
    teacherId: string | { _id?: string }; createdAt?: string;
    title?: string; description?: string;
  };
  type TeacherMonthlyStat = {
    staffId: string; name: string; position: string;
    present: number; absent: number; leaveDays: number; halfDay: number;
    totalMarkedDays: number; attendancePercent: number;
    monthLeavesTaken: number; yearLeavesTaken: number;
    paidTaken: number; unpaidTaken: number; emergencyTaken: number;
    paidRemaining: number; unpaidRemaining: number; emergencyRemaining: number;
  };
  type StaffRecord    = { _id: string; name: string; position: string; department?: string };
  type ClassItem      = { _id: string; name: string; section?: string };
  type StudentRow     = { _id: string; name: string; rollNumber: string; gender?: string };
  type StudentAttRow  = { studentId: string; status: string | null };
  type TeacherCalendarTarget = { staffId: string; name: string; position: string };

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const LEAVE_LIMITS = { Paid: 12, Unpaid: 4, Emergency: 3 } as const;
  const STATUS_COLORS: Record<string, string> = {
    present:  'bg-green-100 text-green-700 border-green-200',
    absent:   'bg-red-100 text-red-700 border-red-200',
    leave:    'bg-amber-100 text-amber-700 border-amber-200',
    'half day': 'bg-blue-100 text-blue-700 border-blue-200',
  };

  // ─── Auth ─────────────────────────────────────────────────────────────────────
  const schoolId = $derived($page.data.user?.schoolId ?? '');

  // ─── Navigation ───────────────────────────────────────────────────────────────
  type MainTab  = 'daily' | 'monthly' | 'reports' | 'settings';
  type DailyTab = 'staff' | 'students';

  let mainTab  = $state<MainTab>('daily');
  let dailyTab = $state<DailyTab>('staff');

  // ─── Date / period ────────────────────────────────────────────────────────────
  const now = new Date();
  let selectedDate       = $state(now.toISOString().split('T')[0]);
  let selectedYear       = $state(now.getFullYear());
  let selectedMonthNum   = $state(now.getMonth() + 1);
  const selectedMonth    = $derived(`${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`);
  const yearOptions      = $derived(Array.from({ length: 8 }, (_, i) => now.getFullYear() - 5 + i));
  const monthEnd         = $derived(new Date(selectedYear, selectedMonthNum, 0).toISOString().slice(0, 10));
  const monthStart       = $derived(`${selectedMonth}-01`);

  // ─── Staff daily ──────────────────────────────────────────────────────────────
  let teachers     = $state<TeacherAttendance[]>([]);
  let staffLoading = $state(false);
  let staffError   = $state('');

  // ─── Staff monthly ────────────────────────────────────────────────────────────
  let monthlyStats         = $state<TeacherMonthlyStat[]>([]);
  let teacherLeavesMap     = $state<Record<string, LeaveRecord[]>>({});
  let teacherAttendanceMap = $state<Record<string, AttendanceRecord[]>>({});
  let monthlyLoading       = $state(false);
  let monthlyLoaded        = $state(false);
  let monthlyRefreshKey    = $state(0);

  // ─── Student daily ────────────────────────────────────────────────────────────
  let classes          = $state<ClassItem[]>([]);
  let classesLoading   = $state(false);
  let selectedClassId  = $state('');
  let students         = $state<StudentRow[]>([]);
  let studentsLoading  = $state(false);
  let studentAtt       = $state<Record<string, string | null>>({});
  let studentAttLoading= $state(false);
  let studentMarking   = $state<Record<string, boolean>>({});

  // ─── Slide-over ───────────────────────────────────────────────────────────────
  let slideoverTeacher = $state<TeacherCalendarTarget | null>(null);

  // ─── Reports ──────────────────────────────────────────────────────────────────
  let reportStart = $state(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`);
  let reportEnd   = $state(now.toISOString().split('T')[0]);
  let downloadOpen= $state(false);

  // ─── Filters ──────────────────────────────────────────────────────────────────
  let staffSearch    = $state('');
  let statusFilter   = $state<'all'|'present'|'absent'|'leave'|'unmarked'>('all');
  let studentSearch  = $state('');

  // ─── Derived ──────────────────────────────────────────────────────────────────
  const monthlyStatsMap = $derived(Object.fromEntries(monthlyStats.map(s => [s.staffId, s])));
  const mergedTeacherCards = $derived(teachers.map(t => ({ ...t, monthly: monthlyStatsMap[String(t.staffId)] ?? null })));
  const monthlyAvgPercent = $derived(monthlyStats.length ? Math.round(monthlyStats.reduce((s, t) => s + t.attendancePercent, 0) / monthlyStats.length) : 0);

  const filteredStaff = $derived(mergedTeacherCards.filter(t => {
    const q = staffSearch.toLowerCase();
    if (q && !t.name.toLowerCase().includes(q) && !t.position?.toLowerCase().includes(q)) return false;
    if (statusFilter === 'present')  return t.status?.toLowerCase() === 'present';
    if (statusFilter === 'absent')   return t.status?.toLowerCase() === 'absent';
    if (statusFilter === 'leave')    return t.status?.toLowerCase() === 'leave';
    if (statusFilter === 'unmarked') return !t.status;
    return true;
  }));

  const filteredStudents = $derived(
    students.filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  const staffStats = $derived({
    total:    teachers.length,
    present:  teachers.filter(t => t.status?.toLowerCase() === 'present').length,
    absent:   teachers.filter(t => t.status?.toLowerCase() === 'absent').length,
    leave:    teachers.filter(t => ['leave','half day'].includes(t.status?.toLowerCase() ?? '')).length,
    unmarked: teachers.filter(t => !t.status).length,
  });
  const staffPercent = $derived(staffStats.total ? Math.round((staffStats.present / staffStats.total) * 100) : 0);

  const studentStats = $derived({
    total:    students.length,
    present:  Object.values(studentAtt).filter(s => s?.toLowerCase() === 'present').length,
    absent:   Object.values(studentAtt).filter(s => s?.toLowerCase() === 'absent').length,
    unmarked: students.filter(s => !studentAtt[s._id]).length,
  });

  const selectedClass = $derived(classes.find(c => c._id === selectedClassId));

  // ─── Effects ──────────────────────────────────────────────────────────────────
  $effect(() => { void schoolId; void selectedDate; if (mainTab === 'daily' && dailyTab === 'staff') fetchStaff(); });
  $effect(() => { void schoolId; void selectedMonth; void monthlyRefreshKey; if (mainTab === 'monthly') fetchMonthly(); });
  $effect(() => { void schoolId; if ((mainTab === 'daily' && dailyTab === 'students') && classes.length === 0) fetchClasses(); });
  $effect(() => { void selectedClassId; void selectedDate; if (selectedClassId) fetchStudentAttendance(); });

  onMount(() => {
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  });

  // ─── Fetchers ─────────────────────────────────────────────────────────────────
  function unwrap(d: unknown): unknown[] {
    if (Array.isArray((d as {data?: unknown[]})?.data)) return (d as {data: unknown[]}).data;
    if (Array.isArray(d)) return d;
    return [];
  }

  async function fetchStaff() {
    if (!schoolId || !selectedDate) { teachers = []; return; }
    staffLoading = true; staffError = '';
    try {
      const data = await api.get<unknown>(`/api/attendance/${schoolId}/${selectedDate}?position=Teacher`);
      teachers = unwrap(data) as TeacherAttendance[];
    } catch (e) { staffError = 'Failed to load attendance.'; teachers = []; }
    staffLoading = false;
  }

  async function fetchMonthly() {
    if (!schoolId || !selectedMonth || monthlyLoading) return;
    monthlyLoading = true;
    try {
      const yearStart = `${selectedYear}-01-01`, yearEnd = `${selectedYear}-12-31`;
      const [staffRaw, attRaw, leaveRaw] = await Promise.all([
        api.get<unknown>(`/api/staff/${schoolId}`),
        api.get<unknown>(`/api/attendance/report/${schoolId}?startDate=${monthStart}&endDate=${monthEnd}&position=Teacher`),
        api.get<unknown>(`/api/leaves/school/${schoolId}`),
      ]);
      const staffData  = unwrap(staffRaw)  as StaffRecord[];
      const attData    = unwrap(attRaw)    as AttendanceRecord[];
      const leaveData  = unwrap(leaveRaw)  as LeaveRecord[];
      const teachersOnly = staffData.filter(s => String(s.position ?? '').toLowerCase() === 'teacher');
      const leavesByTeacher: Record<string, LeaveRecord[]> = {};
      const attByTeacher:   Record<string, AttendanceRecord[]> = {};
      teachersOnly.forEach(t => { leavesByTeacher[t._id] = []; attByTeacher[t._id] = []; });
      leaveData.filter(l => l.status === 'Approved').forEach(l => {
        const tid = typeof l.teacherId === 'string' ? l.teacherId : (l.teacherId?._id ?? '');
        if (!tid) return;
        (leavesByTeacher[tid] ??= []).push(l);
      });
      attData.forEach(r => {
        const tid = typeof r.staffId === 'string' ? r.staffId : ((r.staffId as {_id?:string})?._id ?? '');
        if (!tid) return;
        (attByTeacher[tid] ??= []).push(r);
      });
      monthlyStats = teachersOnly.map(teacher => {
        const records = attByTeacher[teacher._id] ?? [];
        const present = records.filter(r => r.status === 'Present').length;
        const absent  = records.filter(r => r.status === 'Absent').length;
        const leaveDays = records.filter(r => r.status === 'Leave').length;
        const halfDay   = records.filter(r => r.status === 'Half Day').length;
        const totalMarkedDays   = records.length;
        const attendancePercent = totalMarkedDays ? Math.round(((present + halfDay * 0.5) / totalMarkedDays) * 100) : 0;
        const approvedAll   = leavesByTeacher[teacher._id] ?? [];
        const approvedYear  = approvedAll.filter(l => { const d = l.createdAt?.slice(0,10) ?? ''; return d >= `${selectedYear}-01-01` && d <= `${selectedYear}-12-31`; });
        const approvedMonth = approvedAll.filter(l => { const d = l.createdAt?.slice(0,10) ?? ''; return d >= monthStart && d <= monthEnd; });
        const paidTaken = approvedYear.filter(l => l.leaveType === 'Paid').length;
        const unpaidTaken = approvedYear.filter(l => l.leaveType === 'Unpaid').length;
        const emergencyTaken = approvedYear.filter(l => l.leaveType === 'Emergency').length;
        return {
          staffId: teacher._id, name: teacher.name, position: teacher.department ?? teacher.position,
          present, absent, leaveDays, halfDay, totalMarkedDays, attendancePercent,
          monthLeavesTaken: approvedMonth.length, yearLeavesTaken: approvedYear.length,
          paidTaken, unpaidTaken, emergencyTaken,
          paidRemaining: Math.max(LEAVE_LIMITS.Paid - paidTaken, 0),
          unpaidRemaining: Math.max(LEAVE_LIMITS.Unpaid - unpaidTaken, 0),
          emergencyRemaining: Math.max(LEAVE_LIMITS.Emergency - emergencyTaken, 0),
        };
      });
      teacherLeavesMap = leavesByTeacher;
      teacherAttendanceMap = attByTeacher;
      monthlyLoaded = true;
    } catch { /* ignore */ }
    monthlyLoading = false;
  }

  async function fetchClasses() {
    if (!schoolId) return;
    classesLoading = true;
    try {
      const data = await api.get<unknown>(`/api/classes?schoolId=${schoolId}`);
      classes = (Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? data : []) as ClassItem[];
      if (classes.length && !selectedClassId) selectedClassId = classes[0]._id;
    } catch { classes = []; }
    classesLoading = false;
  }

  async function fetchStudentAttendance() {
    if (!schoolId || !selectedClassId || !selectedDate) return;
    studentAttLoading = true;
    try {
      // Load students for the class
      const sData = await api.get<unknown>(`/api/students/${schoolId}?classId=${selectedClassId}&limit=200`);
      students = ((sData as any)?.data?.students ?? []) as StudentRow[];

      // Load their attendance for this date
      const aData = await api.get<unknown>(`/api/attendance/students/${schoolId}/${selectedClassId}/${selectedDate}`);
      const rows = unwrap(aData) as StudentAttRow[];
      const map: Record<string, string | null> = {};
      students.forEach(s => { map[s._id] = null; });
      rows.forEach(r => { if (r.studentId) map[r.studentId] = r.status; });
      studentAtt = map;
    } catch { students = []; studentAtt = {}; }
    studentAttLoading = false;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────
  async function markStaff(staffId: string, status: 'Present' | 'Absent' | 'Leave' | 'Half Day') {
    if (!schoolId || !selectedDate) return;
    try {
      const data = await api.post<{success: boolean; data: {_id: string}}>('/api/attendance', { staffId, schoolId, date: selectedDate, status });
      teachers = teachers.map(t => t.staffId === staffId ? { ...t, attendanceId: (data as any)?.data?._id ?? t.attendanceId, status } : t);
      monthlyRefreshKey++;
    } catch { /* ignore */ }
  }

  async function markAllPresent() {
    const unmarked = teachers.filter(t => !t.status);
    await Promise.all(unmarked.map(t => markStaff(String(t.staffId), 'Present')));
  }

  async function markStudent(studentId: string, status: 'Present' | 'Absent' | 'Leave' | 'Half Day') {
    if (!schoolId || !selectedDate || !selectedClassId) return;
    studentMarking = { ...studentMarking, [studentId]: true };
    try {
      await api.post('/api/attendance/students', { studentId, schoolId, classId: selectedClassId, date: selectedDate, status });
      studentAtt = { ...studentAtt, [studentId]: status };
    } catch { /* ignore */ }
    studentMarking = { ...studentMarking, [studentId]: false };
  }

  async function markAllStudentsPresent() {
    const unmarked = students.filter(s => !studentAtt[s._id]);
    await Promise.all(unmarked.map(s => markStudent(s._id, 'Present')));
  }

  function handleDocClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('[data-dl-dropdown]')) downloadOpen = false;
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
</script>

<svelte:head><title>Attendance — ERP Portal</title></svelte:head>

<div class="space-y-0">

  <!-- ══ Header ════════════════════════════════════════════════════════════════ -->
  <div class="flex items-start justify-between gap-4 pb-5">
    <div>
      <h1 class="font-display text-2xl font-bold text-foreground">Attendance</h1>
      <p class="text-sm text-muted-foreground">Track staff & student attendance, configure geofence, export reports.</p>
    </div>
    <span class="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
      {fmtDate(selectedDate)}
    </span>
  </div>

  <!-- ══ Main tab bar ═══════════════════════════════════════════════════════════ -->
  <div class="flex border-b border-border">
    {#each ([['daily','Daily','CalendarDays'],['monthly','Monthly','BarChart3'],['reports','Reports','Download'],['settings','Settings','Settings2']] as const) as [tab, label]}
      <button
        type="button"
        onclick={() => { mainTab = tab; if (tab === 'monthly' && !monthlyLoaded) fetchMonthly(); if (tab === 'daily' && dailyTab === 'students' && classes.length === 0) fetchClasses(); }}
        class="flex items-center gap-1.5 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors {mainTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        {#if tab === 'daily'}<CalendarDays class="h-4 w-4" />
        {:else if tab === 'monthly'}<BarChart3 class="h-4 w-4" />
        {:else if tab === 'reports'}<Download class="h-4 w-4" />
        {:else}<Settings2 class="h-4 w-4" />
        {/if}
        {label}
      </button>
    {/each}
  </div>

  <!-- ══════════════════════════════════════════════════ DAILY TAB ══════════════ -->
  {#if mainTab === 'daily'}
    <div class="pt-5 space-y-5">

      <!-- Date picker row -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
          <CalendarDays class="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onchange={(e) => (selectedDate = (e.currentTarget as HTMLInputElement).value)}
            class="bg-transparent text-sm font-medium text-foreground outline-none"
          />
        </div>
        <button
          type="button"
          onclick={() => (selectedDate = now.toISOString().split('T')[0])}
          class="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground shadow-sm transition-colors"
        >
          Today
        </button>
      </div>

      <!-- Staff / Students sub-toggle -->
      <div class="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        <button
          type="button"
          onclick={() => { dailyTab = 'staff'; }}
          class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all {dailyTab === 'staff' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          <GraduationCap class="h-4 w-4" /> Staff
        </button>
        <button
          type="button"
          onclick={() => { dailyTab = 'students'; if (classes.length === 0) fetchClasses(); }}
          class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all {dailyTab === 'students' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          <Users class="h-4 w-4" /> Students
        </button>
      </div>

      <!-- ─────────────────────── STAFF TAB ─────────────────────────────────── -->
      {#if dailyTab === 'staff'}

        <!-- Stats row -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {#snippet statCard(label: string, value: number | string, tone: string, sub?: string)}
            <div class="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p class="mt-1 text-2xl font-bold {tone}">{value}</p>
              {#if sub}<p class="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>{/if}
            </div>
          {/snippet}
          {@render statCard('Total Staff', staffStats.total, 'text-foreground')}
          {@render statCard('Present', staffStats.present, 'text-green-600')}
          {@render statCard('Absent', staffStats.absent, 'text-red-600')}
          {@render statCard('Leave / Half', staffStats.leave, 'text-amber-600')}
          {@render statCard('Attd. %', `${staffPercent}%`, staffPercent >= 80 ? 'text-green-600' : staffPercent >= 60 ? 'text-amber-600' : 'text-red-600', `${staffStats.unmarked} unmarked`)}
        </div>

        <!-- Action bar: search + filter + mark all -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Search -->
          <div class="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm flex-1 min-w-[180px]">
            <Search class="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search staff…"
              bind:value={staffSearch}
              class="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <!-- Status filter chips -->
          <div class="flex items-center gap-1.5">
            {#each (['all','present','absent','leave','unmarked'] as const) as f}
              <button
                type="button"
                onclick={() => (statusFilter = f)}
                class="rounded-full border px-3 py-1 text-xs font-semibold transition-all capitalize {statusFilter === f
                  ? f === 'all' ? 'border-primary bg-primary text-primary-foreground'
                  : f === 'present' ? 'border-green-500 bg-green-500 text-white'
                  : f === 'absent' ? 'border-red-500 bg-red-500 text-white'
                  : f === 'leave' ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-slate-500 bg-slate-500 text-white'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'}"
              >{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            {/each}
          </div>

          <!-- Mark all present -->
          {#if staffStats.unmarked > 0}
            <button
              type="button"
              onclick={markAllPresent}
              class="ml-auto flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 shadow-sm transition-colors"
            >
              <CheckCircle2 class="h-4 w-4" />
              Mark {staffStats.unmarked} Present
            </button>
          {:else}
            <button
              type="button"
              onclick={fetchStaff}
              class="ml-auto flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground shadow-sm"
            >
              <RefreshCw class="h-3.5 w-3.5" /> Refresh
            </button>
          {/if}
        </div>

        <!-- Staff list -->
        {#if staffLoading}
          <div class="space-y-3">
            {#each [1,2,3,4,5] as _}
              <div class="h-24 animate-pulse rounded-2xl bg-muted"></div>
            {/each}
          </div>
        {:else if staffError}
          <div class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle class="h-5 w-5 shrink-0 text-red-500" />
            <p class="text-sm text-red-700">{staffError}</p>
            <button onclick={fetchStaff} class="ml-auto text-xs font-semibold text-red-600 hover:underline">Retry</button>
          </div>
        {:else if filteredStaff.length === 0}
          <div class="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <GraduationCap class="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p class="text-sm font-semibold text-foreground">
              {staffSearch || statusFilter !== 'all' ? 'No staff match filters' : 'No attendance data for this date'}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {staffSearch || statusFilter !== 'all' ? 'Try clearing the search or filter.' : 'Ensure staff are added to the school.'}
            </p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each filteredStaff as teacher (teacher.staffId)}
              <TeacherCard
                {teacher}
                onMark={(id, s) => markStaff(id, s)}
                onOpenCalendar={(t) => (slideoverTeacher = t)}
              />
            {/each}
          </div>
        {/if}

      <!-- ─────────────────────── STUDENTS TAB ──────────────────────────────── -->
      {:else if dailyTab === 'students'}

        <!-- Class selector + date -->
        <div class="flex flex-wrap items-center gap-3">
          {#if classesLoading}
            <div class="h-10 w-48 animate-pulse rounded-xl bg-muted"></div>
          {:else if classes.length === 0}
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">No classes found.</div>
          {:else}
            <div class="flex items-center gap-2">
              <label for="cls-sel" class="text-sm font-medium text-foreground">Class</label>
              <select
                id="cls-sel"
                bind:value={selectedClassId}
                class="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm outline-none focus:ring-1 focus:ring-primary"
              >
                {#each classes as cls (cls._id)}
                  <option value={cls._id}>{cls.name}{cls.section ? ` — ${cls.section}` : ''}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>

        <!-- Student stats row -->
        {#if selectedClassId && !studentAttLoading}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {#snippet sStat(label: string, value: number, tone: string)}
              <div class="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p class="mt-1 text-2xl font-bold {tone}">{value}</p>
              </div>
            {/snippet}
            {@render sStat('Total Students', studentStats.total, 'text-foreground')}
            {@render sStat('Present', studentStats.present, 'text-green-600')}
            {@render sStat('Absent', studentStats.absent, 'text-red-600')}
            {@render sStat('Unmarked', studentStats.unmarked, studentStats.unmarked > 0 ? 'text-amber-600' : 'text-muted-foreground')}
          </div>
        {/if}

        <!-- Student action bar -->
        {#if selectedClassId}
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm flex-1 min-w-[160px]">
              <Search class="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search students…"
                bind:value={studentSearch}
                class="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            {#if studentStats.unmarked > 0}
              <button
                type="button"
                onclick={markAllStudentsPresent}
                class="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 shadow-sm"
              >
                <CheckCircle2 class="h-4 w-4" />
                Mark {studentStats.unmarked} Present
              </button>
            {/if}
          </div>
        {/if}

        <!-- Student list -->
        {#if studentAttLoading}
          <div class="space-y-2">
            {#each [1,2,3,4,5] as _}
              <div class="h-16 animate-pulse rounded-2xl bg-muted"></div>
            {/each}
          </div>
        {:else if !selectedClassId}
          <div class="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <Users class="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p class="text-sm font-semibold text-foreground">Select a class to view students</p>
          </div>
        {:else if filteredStudents.length === 0}
          <div class="rounded-2xl border border-dashed border-border bg-muted/30 py-12 text-center">
            <Users class="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p class="text-sm text-foreground">{studentSearch ? 'No students match search' : 'No students in this class'}</p>
          </div>
        {:else}
          <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <!-- Table header -->
            <div class="grid grid-cols-[2rem_1fr_auto] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>#</span>
              <span>Student</span>
              <span>Mark Attendance</span>
            </div>
            <!-- Rows -->
            <div class="divide-y divide-border">
              {#each filteredStudents as student, i (student._id)}
                {@const status = studentAtt[student._id]}
                {@const marking = studentMarking[student._id]}
                <div class="grid grid-cols-[2rem_1fr_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30">
                  <span class="text-xs text-muted-foreground">{i + 1}</span>
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {student.name[0]?.toUpperCase()}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-foreground">{student.name}</p>
                      {#if student.rollNumber}<p class="text-xs text-muted-foreground">Roll: {student.rollNumber}</p>{/if}
                    </div>
                    {#if status}
                      <span class="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize {STATUS_COLORS[status.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'}">
                        {status}
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1.5">
                    {#each (['Present','Absent','Leave','Half Day'] as const) as s}
                      <button
                        type="button"
                        disabled={marking}
                        onclick={() => markStudent(student._id, s)}
                        title={s}
                        class="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 {status === s
                          ? s === 'Present' ? 'border-green-500 bg-green-500 text-white'
                          : s === 'Absent'  ? 'border-red-500 bg-red-500 text-white'
                          : s === 'Leave'   ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-blue-500 bg-blue-500 text-white'
                          : s === 'Present' ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                          : s === 'Absent'  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : s === 'Leave'   ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}"
                      >
                        {s === 'Half Day' ? 'H/D' : s[0]}
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </div>

  <!-- ══════════════════════════════════════════════════ MONTHLY TAB ══════════ -->
  {:else if mainTab === 'monthly'}
    <div class="pt-5 space-y-5">

      <!-- Month / Year picker -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <label for="m-year" class="text-sm font-medium text-foreground">Year</label>
          <select id="m-year" bind:value={selectedYear} onchange={() => { monthlyLoaded = false; fetchMonthly(); }}
            class="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm outline-none focus:ring-1 focus:ring-primary">
            {#each yearOptions as y (y)}<option value={y}>{y}</option>{/each}
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label for="m-month" class="text-sm font-medium text-foreground">Month</label>
          <select id="m-month" bind:value={selectedMonthNum} onchange={() => { monthlyLoaded = false; fetchMonthly(); }}
            class="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm outline-none focus:ring-1 focus:ring-primary">
            {#each MONTH_NAMES as name, i (name)}<option value={i+1}>{name}</option>{/each}
          </select>
        </div>
        <button onclick={() => { monthlyLoaded = false; fetchMonthly(); }}
          class="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground shadow-sm">
          <RefreshCw class="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {#if monthlyLoading}
        <div class="space-y-3">{#each [1,2,3] as _}<div class="h-28 animate-pulse rounded-2xl bg-muted"></div>{/each}</div>
      {:else if monthlyStats.length === 0}
        <div class="rounded-2xl border border-dashed border-border bg-muted/30 py-14 text-center">
          <BarChart3 class="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
          <p class="text-sm font-semibold text-foreground">No monthly data</p>
          <p class="mt-1 text-xs text-muted-foreground">Select a month and click Refresh.</p>
        </div>
      {:else}
        <!-- Summary strip -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {#snippet mCard(label: string, val: string|number, tone: string)}
            <div class="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p class="mt-1 text-2xl font-bold {tone}">{val}</p>
            </div>
          {/snippet}
          {@render mCard('Staff Tracked', monthlyStats.length, 'text-foreground')}
          {@render mCard('Avg. Attd. %', `${monthlyAvgPercent}%`, monthlyAvgPercent >= 80 ? 'text-green-600' : monthlyAvgPercent >= 60 ? 'text-amber-600' : 'text-red-600')}
          {@render mCard('Month', MONTH_NAMES[selectedMonthNum-1], 'text-foreground')}
          {@render mCard('Year', selectedYear, 'text-foreground')}
        </div>

        <!-- Calendar heatmap -->
        <SchoolCalendar
          {teacherAttendanceMap}
          year={selectedYear}
          month={selectedMonthNum}
          onMonthChange={(y, m) => { selectedYear = y; selectedMonthNum = m; monthlyLoaded = false; fetchMonthly(); }}
          onSelectDay={(iso) => { selectedDate = iso; mainTab = 'daily'; }}
        />

        <!-- Per-teacher rows -->
        <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div class="border-b border-border bg-muted/40 px-5 py-3">
            <p class="text-sm font-semibold text-foreground">Staff Breakdown — {MONTH_NAMES[selectedMonthNum-1]} {selectedYear}</p>
          </div>
          <div class="divide-y divide-border">
            {#each monthlyStats as stat (stat.staffId)}
              <div class="flex flex-wrap items-center gap-4 px-5 py-3">
                <div class="flex items-center gap-3 min-w-[180px]">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {stat.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-foreground">{stat.name}</p>
                    <p class="text-xs text-muted-foreground">{stat.position}</p>
                  </div>
                </div>
                <!-- Stat chips -->
                <div class="flex flex-wrap gap-1.5">
                  {#snippet chip(label: string, val: number|string, cls: string)}
                    <span class="rounded-lg border px-2 py-1 text-xs font-semibold {cls}">{label}: {val}</span>
                  {/snippet}
                  {@render chip('P', stat.present, 'border-green-200 bg-green-50 text-green-700')}
                  {@render chip('A', stat.absent, 'border-red-200 bg-red-50 text-red-700')}
                  {@render chip('L', stat.leaveDays, 'border-amber-200 bg-amber-50 text-amber-700')}
                  {@render chip('H', stat.halfDay, 'border-blue-200 bg-blue-50 text-blue-700')}
                  {@render chip('%', `${stat.attendancePercent}%`, stat.attendancePercent >= 80 ? 'border-green-200 bg-green-50 text-green-700' : stat.attendancePercent >= 60 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700')}
                </div>
                <!-- Leave balance -->
                <div class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span class="font-medium text-foreground">Leave balance:</span>
                  <span class="rounded-full px-2 py-0.5 {stat.paidRemaining <= 2 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}">Paid {stat.paidRemaining}</span>
                  <span class="rounded-full px-2 py-0.5 bg-muted text-muted-foreground">Unpaid {stat.unpaidRemaining}</span>
                </div>
                <!-- Calendar button -->
                <button
                  type="button"
                  onclick={() => (slideoverTeacher = { staffId: stat.staffId, name: stat.name, position: stat.position })}
                  class="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <CalendarDays class="h-3.5 w-3.5" /> Calendar
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

  <!-- ══════════════════════════════════════════════════ REPORTS TAB ══════════ -->
  {:else if mainTab === 'reports'}
    <div class="pt-5 space-y-5">

      <!-- Date range picker -->
      <div class="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <p class="text-sm font-semibold text-foreground">Date Range</p>
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</label>
            <input type="date" bind:value={reportStart}
              class="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</label>
            <input type="date" bind:value={reportEnd}
              class="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <p class="text-xs text-muted-foreground">
            {Math.max(0, Math.round((new Date(reportEnd).getTime() - new Date(reportStart).getTime()) / 86400000))} days selected
          </p>
        </div>
      </div>

      <!-- Download options -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {#snippet dlCard(title: string, desc: string, icon: string, kind: string)}
          <div class="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{icon}</span>
              <div>
                <p class="text-sm font-semibold text-foreground">{title}</p>
                <p class="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button type="button"
                onclick={() => alert('PDF export coming soon')}
                class="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                <Download class="h-3.5 w-3.5" /> PDF
              </button>
              <button type="button"
                onclick={() => alert('Excel export coming soon')}
                class="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                <Download class="h-3.5 w-3.5" /> Excel
              </button>
            </div>
          </div>
        {/snippet}
        {@render dlCard('Staff Report', 'Teacher attendance for selected date range', '👨‍🏫', 'staff')}
        {@render dlCard('Student Report', 'Class-wise student attendance', '🎓', 'student')}
        {@render dlCard('Monthly Summary', 'Month-by-month staff summary', '📅', 'monthly')}
        {@render dlCard('Leave Report', 'Leave balances and utilisation', '🗓️', 'leave')}
      </div>

      <!-- Info note -->
      <div class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <AlertCircle class="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <p class="text-xs text-blue-700">Export functionality will generate reports for the selected date range ({reportStart} to {reportEnd}).</p>
      </div>
    </div>

  <!-- ══════════════════════════════════════════════════ SETTINGS TAB ═════════ -->
  {:else if mainTab === 'settings'}
    <div class="pt-5 space-y-5">
      <div>
        <h2 class="text-base font-semibold text-foreground">Geofence Configuration</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">Set school location and radius for GPS-based self-attendance marking.</p>
      </div>
      {#if schoolId}
        <GeofenceCard {schoolId} />
      {:else}
        <div class="rounded-2xl border border-dashed border-border bg-muted/30 py-10 text-center">
          <MapPin class="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p class="text-sm text-muted-foreground">School ID not found.</p>
        </div>
      {/if}
    </div>
  {/if}

</div>

<!-- ─── Teacher calendar slide-over ─────────────────────────────────────────── -->
{#if slideoverTeacher}
  <TeacherCalendarPanel
    teacher={slideoverTeacher}
    year={selectedYear}
    month={selectedMonthNum}
    attendanceRecords={teacherAttendanceMap[slideoverTeacher.staffId] ?? []}
    leaveRecords={teacherLeavesMap[slideoverTeacher.staffId] ?? []}
    {schoolId}
    onClose={() => (slideoverTeacher = null)}
    onUpdate={() => { monthlyLoaded = false; monthlyRefreshKey++; }}
  />
{/if}

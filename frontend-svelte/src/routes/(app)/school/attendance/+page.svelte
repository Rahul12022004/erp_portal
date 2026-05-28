<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Chart from 'chart.js/auto';

  // ─── Types ────────────────────────────────────────────────────────────────

  type TeacherAttendance = {
    attendanceId: string | null;
    remarks: string;
    staffId: string;
    name: string;
    position: string;
    status: string | null;
  };

  type AttendanceRecord = {
    _id: string;
    date: string;
    status: 'Present' | 'Absent' | 'Leave' | 'Half Day';
    remarks?: string;
    staffId: string | { _id?: string; name?: string; position?: string };
  };

  type LeaveRecord = {
    _id: string;
    leaveType: 'Paid' | 'Unpaid' | 'Emergency';
    status: 'Pending' | 'Approved' | 'Rejected';
    teacherId: string | { _id?: string };
    createdAt?: string;
    title?: string;
    description?: string;
  };

  type TeacherMonthlyStat = {
    staffId: string;
    name: string;
    position: string;
    present: number;
    absent: number;
    leaveDays: number;
    halfDay: number;
    totalMarkedDays: number;
    attendancePercent: number;
    monthLeavesTaken: number;
    yearLeavesTaken: number;
    paidTaken: number;
    unpaidTaken: number;
    emergencyTaken: number;
    paidRemaining: number;
    unpaidRemaining: number;
    emergencyRemaining: number;
  };

  type StaffRecord = {
    _id: string;
    name: string;
    position: string;
    department?: string;
  };

  type TeacherCalendarTarget = {
    staffId: string;
    name: string;
    position: string;
  };

  type CalendarDayCell = {
    date: Date | null;
    iso: string | null;
    status: string | null;
    remarks?: string;
  };

  // ─── Constants ────────────────────────────────────────────────────────────

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const LEAVE_LIMITS = { Paid: 12, Unpaid: 4, Emergency: 3 } as const;

  // ─── Auth / schoolId ──────────────────────────────────────────────────────

  const schoolId = $derived($page.data.user?.schoolId ?? '');

  // ─── Date / period state ──────────────────────────────────────────────────

  const now = new Date();
  let selectedDate = $state(now.toISOString().split('T')[0]);
  let selectedYear = $state(now.getFullYear());
  let selectedMonthNumber = $state(now.getMonth() + 1);

  const selectedMonth = $derived(
    `${selectedYear}-${String(selectedMonthNumber).padStart(2, '0')}`
  );

  const yearOptions = $derived(
    Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i)
  );

  // ─── Daily attendance state ───────────────────────────────────────────────

  let teachers = $state<TeacherAttendance[]>([]);
  let loading = $state(false);

  // ─── Monthly stats state ──────────────────────────────────────────────────

  let monthlyStats = $state<TeacherMonthlyStat[]>([]);
  let teacherLeavesMap = $state<Record<string, LeaveRecord[]>>({});
  let teacherAttendanceMap = $state<Record<string, AttendanceRecord[]>>({});
  let monthlyRefreshKey = $state(0);

  // ─── Calendar modal state ─────────────────────────────────────────────────

  let selectedTeacherForCalendar = $state<TeacherCalendarTarget | null>(null);
  let calendarEditingDate = $state<string | null>(null);
  let calendarEditStatus = $state<AttendanceRecord['status']>('Present');
  let calendarEditReason = $state('');
  let calendarSaving = $state(false);
  let calendarMessage = $state('');

  // ─── Geofence state ───────────────────────────────────────────────────────

  let geoLatitude = $state('');
  let geoLongitude = $state('');
  let geoRadiusMeters = $state('200');
  let geoLocked = $state(false);
  let savingGeofence = $state(false);
  let geofenceMessage = $state('');

  // ─── Download dropdown state ──────────────────────────────────────────────

  let downloadOpen = $state(false);

  // ─── Chart.js ─────────────────────────────────────────────────────────────

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let chartInstance: Chart | undefined;

  // ─── Derived counts ───────────────────────────────────────────────────────

  const presentCount = $derived(
    teachers.filter((t) => t.status?.toLowerCase() === 'present').length
  );
  const absentCount = $derived(
    teachers.filter((t) => t.status?.toLowerCase() === 'absent').length
  );
  const total = $derived(teachers.length);
  const percent = $derived(total ? Math.round((presentCount / total) * 100) : 0);

  const monthlyStatsMap = $derived(
    Object.fromEntries(monthlyStats.map((s) => [s.staffId, s]))
  );

  const mergedTeacherCards = $derived(
    teachers.map((t) => ({ ...t, monthly: monthlyStatsMap[String(t.staffId)] ?? null }))
  );

  // ─── Calendar derived values ──────────────────────────────────────────────

  const selectedTeacherLeaves = $derived(
    selectedTeacherForCalendar
      ? (teacherLeavesMap[selectedTeacherForCalendar.staffId] ?? []).filter(
          (l) => l.createdAt?.startsWith(String(selectedYear))
        )
      : []
  );

  const selectedTeacherMonthAttendance = $derived(
    selectedTeacherForCalendar
      ? (teacherAttendanceMap[selectedTeacherForCalendar.staffId] ?? []).filter((r) =>
          r.date.startsWith(selectedMonth)
        )
      : []
  );

  const calendarDays = $derived.by<CalendarDayCell[]>(() => {
    if (!selectedTeacherForCalendar) return [];

    const firstDay = new Date(selectedYear, selectedMonthNumber - 1, 1);
    const daysInMonth = new Date(selectedYear, selectedMonthNumber, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const approvedLeaveDates = new Set(
      (teacherLeavesMap[selectedTeacherForCalendar.staffId] ?? [])
        .filter((l) => l.status === 'Approved' && l.createdAt)
        .map((l) => l.createdAt!.slice(0, 10))
        .filter((iso) => iso.startsWith(selectedMonth))
    );

    const attendanceByDate = new Map(
      (teacherAttendanceMap[selectedTeacherForCalendar.staffId] ?? [])
        .filter((r) => r.date.startsWith(selectedMonth))
        .map((r) => [r.date, r.status])
    );

    const remarksByDate = new Map(
      (teacherAttendanceMap[selectedTeacherForCalendar.staffId] ?? [])
        .filter((r) => r.date.startsWith(selectedMonth))
        .map((r) => [r.date, r.remarks ?? ''])
    );

    const cells: CalendarDayCell[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, iso: null, status: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      let status: string | null = attendanceByDate.get(iso) ?? null;
      if (approvedLeaveDates.has(iso)) status = 'Approved Leave';
      cells.push({
        date: new Date(selectedYear, selectedMonthNumber - 1, day),
        iso,
        status,
        remarks: remarksByDate.get(iso) ?? '',
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, iso: null, status: null });
    }

    return cells;
  });

  // ─── Chart effect ─────────────────────────────────────────────────────────

  $effect(() => {
    if (!canvasEl) return;
    chartInstance?.destroy();
    chartInstance = new Chart(canvasEl, {
      type: 'pie',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [
          {
            data: [presentCount, absentCount],
            backgroundColor: ['#22c55e', '#ef4444'],
          },
        ],
      },
      options: {
        responsive: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });
    return () => chartInstance?.destroy();
  });

  // ─── Close download dropdown on outside click ─────────────────────────────

  function handleDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-download-dropdown]')) {
      downloadOpen = false;
    }
  }

  // ─── Fetch school location ────────────────────────────────────────────────

  async function fetchSchoolLocation() {
    if (!schoolId) return;
    try {
      const res = await fetch(`/api/schools/${schoolId}`);
      if (!res.ok) return;
      const schoolData = await res.json() as {
        schoolInfo?: { location?: { latitude?: number; longitude?: number; radiusMeters?: number; locked?: boolean } };
      };
      const loc = schoolData?.schoolInfo?.location;
      if (!loc) return;
      if (typeof loc.latitude === 'number') geoLatitude = String(loc.latitude);
      if (typeof loc.longitude === 'number') geoLongitude = String(loc.longitude);
      if (typeof loc.radiusMeters === 'number') geoRadiusMeters = String(loc.radiusMeters);
      geoLocked = Boolean(loc.locked);
    } catch (err) {
      console.error('Failed to fetch school geofence:', err);
    }
  }

  // ─── Fetch daily attendance ───────────────────────────────────────────────

  async function fetchAttendance() {
    if (!schoolId || !selectedDate) {
      teachers = [];
      return;
    }
    try {
      loading = true;
      const res = await fetch(`/api/attendance/${schoolId}/${selectedDate}?position=Teacher`);
      if (!res.ok) throw new Error(`Failed to load attendance (${res.status})`);
      const data = await res.json();
      teachers = Array.isArray((data as {data?: unknown[]})?.data) ? (data as {data: typeof teachers}).data : (Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Attendance fetch error:', err);
      teachers = [];
    } finally {
      loading = false;
    }
  }

  // ─── Fetch monthly stats ──────────────────────────────────────────────────

  async function fetchMonthlyStats() {
    if (!schoolId || !selectedMonth) {
      monthlyStats = [];
      teacherLeavesMap = {};
      teacherAttendanceMap = {};
      return;
    }

    try {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(selectedYear, selectedMonthNumber, 0).toISOString().slice(0, 10);
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;

      const [staffRes, attendanceRes, leavesRes] = await Promise.all([
        fetch(`/api/staff/${schoolId}`),
        fetch(`/api/attendance/report/${schoolId}?startDate=${monthStart}&endDate=${monthEnd}&position=Teacher`),
        fetch(`/api/leaves/school/${schoolId}`),
      ]);

      if (!staffRes.ok || !attendanceRes.ok || !leavesRes.ok) {
        throw new Error('Failed to load monthly attendance insights');
      }

      const unwrap = (d: unknown): unknown[] => Array.isArray((d as {data?: unknown[]})?.data) ? (d as {data: unknown[]}).data : (Array.isArray(d) ? d : []);
      const staffData = unwrap(await staffRes.json()) as StaffRecord[];
      const attendanceData = unwrap(await attendanceRes.json()) as AttendanceRecord[];
      const leaveData = unwrap(await leavesRes.json()) as LeaveRecord[];

      const teachersOnly = staffData.filter(
        (s) => String(s.position ?? '').toLowerCase() === 'teacher'
      );

      const leavesByTeacher: Record<string, LeaveRecord[]> = {};
      const attendanceByTeacher: Record<string, AttendanceRecord[]> = {};

      teachersOnly.forEach((t) => {
        leavesByTeacher[t._id] = [];
        attendanceByTeacher[t._id] = [];
      });

      leaveData
        .filter((l) => l.status === 'Approved')
        .forEach((l) => {
          const tid = typeof l.teacherId === 'string' ? l.teacherId : (l.teacherId?._id ?? '');
          if (!tid) return;
          if (!leavesByTeacher[tid]) leavesByTeacher[tid] = [];
          leavesByTeacher[tid].push(l);
        });

      attendanceData.forEach((r) => {
        const tid = typeof r.staffId === 'string' ? r.staffId : (r.staffId?._id ?? '');
        if (!tid) return;
        if (!attendanceByTeacher[tid]) attendanceByTeacher[tid] = [];
        attendanceByTeacher[tid].push(r);
      });

      const stats: TeacherMonthlyStat[] = teachersOnly.map((teacher) => {
        const records = attendanceByTeacher[teacher._id] ?? [];
        const present = records.filter((r) => r.status === 'Present').length;
        const absent = records.filter((r) => r.status === 'Absent').length;
        const leaveDays = records.filter((r) => r.status === 'Leave').length;
        const halfDay = records.filter((r) => r.status === 'Half Day').length;
        const totalMarkedDays = records.length;
        const attendancePercent = totalMarkedDays
          ? Math.round(((present + halfDay * 0.5) / totalMarkedDays) * 100)
          : 0;

        const approvedAll = leavesByTeacher[teacher._id] ?? [];
        const approvedMonth = approvedAll.filter((l) => {
          if (!l.createdAt) return false;
          const d = l.createdAt.slice(0, 10);
          return d >= monthStart && d <= monthEnd;
        });
        const approvedYear = approvedAll.filter((l) => {
          if (!l.createdAt) return false;
          const d = l.createdAt.slice(0, 10);
          return d >= yearStart && d <= yearEnd;
        });

        const paidTaken = approvedYear.filter((l) => l.leaveType === 'Paid').length;
        const unpaidTaken = approvedYear.filter((l) => l.leaveType === 'Unpaid').length;
        const emergencyTaken = approvedYear.filter((l) => l.leaveType === 'Emergency').length;

        return {
          staffId: teacher._id,
          name: teacher.name,
          position: teacher.department ?? teacher.position,
          present,
          absent,
          leaveDays,
          halfDay,
          totalMarkedDays,
          attendancePercent,
          monthLeavesTaken: approvedMonth.length,
          yearLeavesTaken: approvedYear.length,
          paidTaken,
          unpaidTaken,
          emergencyTaken,
          paidRemaining: Math.max(LEAVE_LIMITS.Paid - paidTaken, 0),
          unpaidRemaining: Math.max(LEAVE_LIMITS.Unpaid - unpaidTaken, 0),
          emergencyRemaining: Math.max(LEAVE_LIMITS.Emergency - emergencyTaken, 0),
        };
      });

      teacherLeavesMap = leavesByTeacher;
      teacherAttendanceMap = attendanceByTeacher;
      monthlyStats = stats;
    } catch (err) {
      console.error('Monthly stats fetch error:', err);
      teacherLeavesMap = {};
      teacherAttendanceMap = {};
      monthlyStats = [];
    }
  }

  // ─── Effects: reactive fetches ────────────────────────────────────────────

  $effect(() => {
    // Re-runs when schoolId changes
    if (schoolId) fetchSchoolLocation();
  });

  $effect(() => {
    // Re-runs when schoolId or selectedDate changes
    void schoolId;
    void selectedDate;
    fetchAttendance();
  });

  $effect(() => {
    // Re-runs when schoolId, selectedMonth, selectedYear, selectedMonthNumber, or monthlyRefreshKey changes
    void schoolId;
    void selectedMonth;
    void selectedYear;
    void selectedMonthNumber;
    void monthlyRefreshKey;
    fetchMonthlyStats();
  });

  onMount(() => {
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  });

  // ─── Mark attendance ──────────────────────────────────────────────────────

  async function markAttendance(teacherId: string, status: 'Present' | 'Absent') {
    if (!schoolId || !selectedDate) {
      alert('Please select date');
      return;
    }
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: teacherId, schoolId, date: selectedDate, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Failed to mark attendance');
      teachers = teachers.map((t) =>
        t.staffId === teacherId
          ? { ...t, attendanceId: data.data?._id ?? t.attendanceId, status }
          : t
      );
      monthlyRefreshKey += 1;
    } catch (err) {
      console.error('Mark attendance error:', err);
      alert('Failed to save attendance');
    }
  }

  // ─── Calendar helpers ─────────────────────────────────────────────────────

  function getCalendarTone(status: string | null): string {
    if (status === 'Approved Leave' || status === 'Leave')
      return 'bg-red-100 border-red-300 text-red-700';
    if (status === 'Present') return 'bg-green-100 border-green-300 text-green-700';
    if (status) return 'bg-yellow-100 border-yellow-300 text-yellow-700';
    return 'bg-white border-slate-200 text-slate-400';
  }

  function changeCalendarMonth(direction: -1 | 1) {
    const next = new Date(selectedYear, selectedMonthNumber - 1 + direction, 1);
    selectedYear = next.getFullYear();
    selectedMonthNumber = next.getMonth() + 1;
    calendarEditingDate = null;
    calendarEditReason = '';
    calendarMessage = '';
  }

  function startCalendarEdit(cell: CalendarDayCell) {
    if (!cell.iso) return;
    calendarEditingDate = cell.iso;
    calendarEditStatus = (cell.status as AttendanceRecord['status']) ?? 'Present';
    calendarEditReason = cell.remarks ?? '';
    calendarMessage = '';
  }

  async function saveCalendarEdit() {
    if (!selectedTeacherForCalendar || !calendarEditingDate) return;
    const trimmedReason = calendarEditReason.trim();
    if (!trimmedReason) {
      calendarMessage = 'Reason is required before saving changes.';
      return;
    }
    try {
      calendarSaving = true;
      calendarMessage = '';
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedTeacherForCalendar.staffId,
          schoolId,
          date: calendarEditingDate,
          status: calendarEditStatus,
          remarks: trimmedReason,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success)
        throw new Error(payload?.message ?? 'Failed to update attendance');

      if (calendarEditingDate === selectedDate) {
        teachers = teachers.map((t) =>
          String(t.staffId) === selectedTeacherForCalendar!.staffId
            ? { ...t, status: calendarEditStatus, remarks: trimmedReason }
            : t
        );
      }

      monthlyRefreshKey += 1;
      calendarMessage = 'Attendance updated successfully.';
    } catch (err) {
      console.error('Calendar attendance update error:', err);
      calendarMessage =
        err instanceof Error ? err.message : 'Failed to update attendance';
    } finally {
      calendarSaving = false;
    }
  }

  // ─── Leave balance tone ───────────────────────────────────────────────────

  function lowBalanceClass(remaining: number): string {
    if (remaining <= 1) return 'bg-red-100 text-red-700';
    if (remaining <= 3) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  }

  // ─── Geofence actions ─────────────────────────────────────────────────────

  async function saveGeofence() {
    if (!schoolId) { alert('School session not found'); return; }
    const latitude = Number(geoLatitude);
    const longitude = Number(geoLongitude);
    const radiusMeters = Number(geoRadiusMeters);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      alert('Please enter valid latitude and longitude');
      return;
    }
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      alert('Please enter a valid radius in meters');
      return;
    }
    if (geoLocked) {
      geofenceMessage = 'Geofence is locked. Unlock it before making changes.';
      return;
    }
    try {
      savingGeofence = true;
      geofenceMessage = '';
      const res = await fetch(`/api/schools/${schoolId}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, radiusMeters }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success)
        throw new Error(payload?.message ?? 'Failed to save geofence');
      geofenceMessage = 'School geofence saved successfully.';
      try { localStorage.setItem('school', JSON.stringify(payload.data)); } catch { /* ignore */ }
    } catch (err) {
      console.error('Save geofence error:', err);
      geofenceMessage = err instanceof Error ? err.message : 'Failed to save geofence';
    } finally {
      savingGeofence = false;
    }
  }

  async function toggleGeofenceLock() {
    if (!schoolId) { alert('School session not found'); return; }
    const nextLocked = !geoLocked;
    try {
      savingGeofence = true;
      geofenceMessage = '';
      const res = await fetch(`/api/schools/${schoolId}/location-lock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: nextLocked }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success)
        throw new Error(payload?.message ?? 'Failed to update geofence lock');
      geoLocked = nextLocked;
      geofenceMessage = nextLocked
        ? 'Geofence locked in place.'
        : 'Geofence unlocked. You can edit values now.';
      try { localStorage.setItem('school', JSON.stringify(payload.data)); } catch { /* ignore */ }
    } catch (err) {
      console.error('Toggle geofence lock error:', err);
      geofenceMessage =
        err instanceof Error ? err.message : 'Failed to update geofence lock';
    } finally {
      savingGeofence = false;
    }
  }
</script>

<svelte:head><title>Teacher Attendance — ERP Portal</title></svelte:head>

<!-- ─── Root ─────────────────────────────────────────────────────────────── -->
<div class="space-y-6">

  <!-- ─── Geofence Settings ────────────────────────────────────────────── -->
  <div class="bg-white rounded-xl border p-4">
    <h3 class="text-lg font-semibold mb-3">School Geofence Settings</h3>
    <p class="text-sm text-gray-600 mb-3">
      Teachers marking self attendance outside this geofence will be flagged.
    </p>
    <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div>
        <label for="geo-latitude" class="block text-xs font-medium mb-1">Latitude</label>
        <input
          id="geo-latitude"
          type="number"
          step="0.000001"
          value={geoLatitude}
          oninput={(e) => (geoLatitude = (e.currentTarget as HTMLInputElement).value)}
          disabled={geoLocked || savingGeofence}
          class="w-full border rounded px-3 py-2"
          placeholder="e.g. 23.0225"
        />
      </div>
      <div>
        <label for="geo-longitude" class="block text-xs font-medium mb-1">Longitude</label>
        <input
          id="geo-longitude"
          type="number"
          step="0.000001"
          value={geoLongitude}
          oninput={(e) => (geoLongitude = (e.currentTarget as HTMLInputElement).value)}
          disabled={geoLocked || savingGeofence}
          class="w-full border rounded px-3 py-2"
          placeholder="e.g. 72.5714"
        />
      </div>
      <div>
        <label for="geo-radius" class="block text-xs font-medium mb-1">Radius (meters)</label>
        <input
          id="geo-radius"
          type="number"
          min={10}
          value={geoRadiusMeters}
          oninput={(e) => (geoRadiusMeters = (e.currentTarget as HTMLInputElement).value)}
          disabled={geoLocked || savingGeofence}
          class="w-full border rounded px-3 py-2"
          placeholder="200"
        />
      </div>
      <div class="flex items-end">
        <button
          type="button"
          onclick={saveGeofence}
          disabled={savingGeofence || geoLocked}
          class="w-full bg-slate-900 text-white rounded px-3 py-2"
        >
          {savingGeofence ? 'Saving...' : 'Save Geofence'}
        </button>
      </div>
      <div class="flex items-end">
        <button
          type="button"
          onclick={toggleGeofenceLock}
          disabled={savingGeofence}
          class={`w-full rounded px-3 py-2 text-white ${geoLocked ? 'bg-amber-600' : 'bg-emerald-600'}`}
        >
          {savingGeofence ? 'Saving...' : geoLocked ? 'Unlock Geofence' : 'Lock Geofence'}
        </button>
      </div>
    </div>
    <p class={`mt-2 text-sm ${geoLocked ? 'text-amber-700' : 'text-blue-700'}`}>
      {geoLocked ? 'Geofence is locked in place.' : 'Geofence is editable.'}
    </p>
    {#if geofenceMessage}
      <p class="mt-1 text-sm text-blue-700">{geofenceMessage}</p>
    {/if}
  </div>

  <!-- ─── Controls Row ─────────────────────────────────────────────────── -->
  <div class="flex gap-4 items-center flex-wrap">
    <div>
      <label for="att-date" class="mr-2 font-medium">Date:</label>
      <input
        id="att-date"
        type="date"
        class="border px-3 py-2 rounded"
        value={selectedDate}
        onchange={(e) => (selectedDate = (e.currentTarget as HTMLInputElement).value)}
      />
    </div>

    <div>
      <label for="att-year" class="mr-2 font-medium">Year:</label>
      <select
        id="att-year"
        class="border px-3 py-2 rounded"
        value={selectedYear}
        onchange={(e) => (selectedYear = Number((e.currentTarget as HTMLSelectElement).value))}
      >
        {#each yearOptions as year (year)}
          <option value={year}>{year}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="att-month" class="mr-2 font-medium">Month:</label>
      <select
        id="att-month"
        class="border px-3 py-2 rounded"
        value={selectedMonthNumber}
        onchange={(e) => (selectedMonthNumber = Number((e.currentTarget as HTMLSelectElement).value))}
      >
        {#each MONTH_NAMES as month, i (month)}
          <option value={i + 1}>{month}</option>
        {/each}
      </select>
    </div>

    <!-- DownloadDropdown inlined as snippet -->
    {#snippet downloadDropdown()}
      <div class="relative" data-download-dropdown>
        <button
          type="button"
          onclick={() => (downloadOpen = !downloadOpen)}
          class="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          Download
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {#if downloadOpen}
          <div class="absolute left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[170px] py-1">
            <button
              onclick={() => { alert('Export feature coming soon'); downloadOpen = false; }}
              class="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              <span class="text-red-500">📄</span> Daily PDF
            </button>
            <button
              onclick={() => { alert('Export feature coming soon'); downloadOpen = false; }}
              class="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              <span class="text-green-600">📊</span> Daily Excel
            </button>
            <hr class="my-1" />
            <button
              onclick={() => { alert('Export feature coming soon'); downloadOpen = false; }}
              class="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              <span class="text-red-500">📄</span> Monthly PDF
            </button>
            <button
              onclick={() => { alert('Export feature coming soon'); downloadOpen = false; }}
              class="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              <span class="text-green-600">📊</span> Monthly Excel
            </button>
          </div>
        {/if}
      </div>
    {/snippet}
    {@render downloadDropdown()}
  </div>

  <!-- ─── Pie Chart ─────────────────────────────────────────────────────── -->
  <div class="bg-white p-6 rounded-xl shadow flex justify-center">
    <canvas bind:this={canvasEl} width="350" height="300"></canvas>
  </div>

  <!-- ─── Summary metric cards ─────────────────────────────────────────── -->
  <div class="grid grid-cols-4 gap-4">
    <div class="bg-white p-4 rounded shadow text-center">
      <p>Total Teachers</p>
      <h3 class="text-xl font-bold">{total}</h3>
    </div>
    <div class="bg-white p-4 rounded shadow text-center">
      <p>Present</p>
      <h3 class="text-green-600 text-xl">{presentCount}</h3>
    </div>
    <div class="bg-white p-4 rounded shadow text-center">
      <p>Absent</p>
      <h3 class="text-red-500 text-xl">{absentCount}</h3>
    </div>
    <div class="bg-white p-4 rounded shadow text-center">
      <p>Attendance %</p>
      <h3 class="text-xl">{percent}%</h3>
    </div>
  </div>

  <!-- ─── Teacher Attendance & Leave Analytics ──────────────────────────── -->
  <div class="bg-white rounded-xl border p-4">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold">Teacher Attendance & Leave Analytics</h3>
        <p class="text-sm text-gray-500">
          Daily attendance actions and monthly analytics are merged into one view.
        </p>
      </div>
    </div>

    {#if loading}
      <div class="border rounded-xl p-4 text-center text-gray-500">Loading attendance...</div>
    {:else if mergedTeacherCards.length === 0}
      <div class="border rounded-xl p-4 text-center text-gray-500">
        No teacher attendance data available.
      </div>
    {:else}
      <div class="space-y-3">
        {#each mergedTeacherCards as teacher (teacher.staffId)}
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div class="min-w-[180px]">
                <p class="text-lg font-semibold">{teacher.name}</p>
                <p class="text-sm text-slate-500">{teacher.position}</p>
                <p class="mt-1 text-xs text-slate-400">
                  Today: {teacher.status ?? 'Not Marked'}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded bg-slate-900 px-3 py-1.5 text-white"
                  onclick={() =>
                    (selectedTeacherForCalendar = {
                      staffId: String(teacher.staffId),
                      name: teacher.name,
                      position: teacher.position,
                    })}
                >
                  Open Calendar
                </button>
              </div>
            </div>

            <!-- MetricCard grid inlined as snippet -->
            {#snippet metricCard(label: string, value: string | number, strong = false, tone = '')}
              <div class={`rounded-lg border p-3 ${tone || 'border-slate-200 bg-slate-50'}`}>
                <p class="text-xs text-slate-500">{label}</p>
                <p class={`mt-1 text-base ${strong ? 'font-bold' : 'font-semibold'}`}>{value}</p>
              </div>
            {/snippet}

            <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">
              {@render metricCard('Present', teacher.monthly?.present ?? 0)}
              {@render metricCard('Absent', teacher.monthly?.absent ?? 0)}
              {@render metricCard('Leave', teacher.monthly?.leaveDays ?? 0)}
              {@render metricCard('Half Day', teacher.monthly?.halfDay ?? 0)}
              {@render metricCard('Attendance %', `${teacher.monthly?.attendancePercent ?? 0}%`, true)}
              {@render metricCard('Month Leaves', teacher.monthly?.monthLeavesTaken ?? 0)}
              {@render metricCard('Year Leaves', teacher.monthly?.yearLeavesTaken ?? 0)}
              {@render metricCard(
                'Paid Remaining',
                teacher.monthly?.paidRemaining ?? 0,
                false,
                lowBalanceClass(teacher.monthly?.paidRemaining ?? 0)
              )}
              {@render metricCard(
                'Unpaid/Emergency',
                `${teacher.monthly?.unpaidRemaining ?? 0}/${teacher.monthly?.emergencyRemaining ?? 0}`,
                false,
                lowBalanceClass(
                  Math.min(
                    teacher.monthly?.unpaidRemaining ?? 0,
                    teacher.monthly?.emergencyRemaining ?? 0
                  )
                )
              )}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ─── Teacher Calendar Modal ────────────────────────────────────────── -->
  {#if selectedTeacherForCalendar}
    <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div class="bg-white w-full max-w-3xl rounded-lg shadow-xl">

        <!-- Modal header -->
        <div class="border-b px-4 py-3 flex items-center justify-between">
          <h4 class="text-lg font-semibold">
            {selectedTeacherForCalendar.name} — {MONTH_NAMES[selectedMonthNumber - 1]} {selectedYear}
          </h4>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              onclick={() => changeCalendarMonth(-1)}
            >
              Prev
            </button>
            <select
              class="rounded border px-2 py-1 text-sm"
              value={selectedMonthNumber}
              onchange={(e) => {
                selectedMonthNumber = Number((e.currentTarget as HTMLSelectElement).value);
                calendarEditingDate = null;
                calendarEditReason = '';
                calendarMessage = '';
              }}
            >
              {#each MONTH_NAMES as month, i (month)}
                <option value={i + 1}>{month}</option>
              {/each}
            </select>
            <select
              class="rounded border px-2 py-1 text-sm"
              value={selectedYear}
              onchange={(e) => {
                selectedYear = Number((e.currentTarget as HTMLSelectElement).value);
                calendarEditingDate = null;
                calendarEditReason = '';
                calendarMessage = '';
              }}
            >
              {#each yearOptions as year (year)}
                <option value={year}>{year}</option>
              {/each}
            </select>
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              onclick={() => changeCalendarMonth(1)}
            >
              Next
            </button>
            <button
              type="button"
              class="text-sm px-2 py-1 rounded border"
              onclick={() => {
                selectedTeacherForCalendar = null;
                calendarEditingDate = null;
                calendarEditReason = '';
                calendarMessage = '';
              }}
            >
              Close
            </button>
          </div>
        </div>

        <!-- Modal body -->
        <div class="p-4 space-y-4">

          <!-- Summary stats -->
          <div class="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div class="rounded border p-2">
              <p class="text-gray-500">Role</p>
              <p class="font-semibold">{selectedTeacherForCalendar.position}</p>
            </div>
            <div class="rounded border p-2">
              <p class="text-gray-500">Present Days</p>
              <p class="font-semibold">
                {selectedTeacherMonthAttendance.filter((r) => r.status === 'Present').length}
              </p>
            </div>
            <div class="rounded border p-2">
              <p class="text-gray-500">Leave Days</p>
              <p class="font-semibold">{selectedTeacherLeaves.length}</p>
            </div>
            <div class="rounded border p-2">
              <p class="text-gray-500">Other Status</p>
              <p class="font-semibold">
                {selectedTeacherMonthAttendance.filter(
                  (r) => r.status !== 'Present' && r.status !== 'Leave'
                ).length}
              </p>
            </div>
          </div>

          <!-- Calendar grid -->
          <div>
            <div class="mb-3 flex flex-wrap gap-2 text-xs">
              <span class="rounded border border-green-300 bg-green-100 px-2 py-1 text-green-700">Present</span>
              <span class="rounded border border-red-300 bg-red-100 px-2 py-1 text-red-700">Leave</span>
              <span class="rounded border border-yellow-300 bg-yellow-100 px-2 py-1 text-yellow-700">Absent / Half Day / Other</span>
            </div>

            <div class="grid grid-cols-7 gap-2">
              {#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as day (day)}
                <div class="rounded border bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600">
                  {day}
                </div>
              {/each}

              {#each calendarDays as cell, i (cell.iso ?? `blank-${i}`)}
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <div
                  class={`min-h-[78px] rounded border p-2 ${getCalendarTone(cell.status)} ${cell.iso ? 'cursor-pointer' : ''}`}
                  onclick={() => startCalendarEdit(cell)}
                  role={cell.iso ? 'button' : undefined}
                  tabindex={cell.iso ? 0 : undefined}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startCalendarEdit(cell); }}
                >
                  {#if cell.date}
                    <p class="text-sm font-semibold">{cell.date.getDate()}</p>
                    <p class="mt-2 text-[11px] leading-4">{cell.status ?? 'No Mark'}</p>
                    {#if cell.remarks}
                      <p class="mt-1 line-clamp-2 text-[10px] leading-4 opacity-80">{cell.remarks}</p>
                    {/if}
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <!-- Edit panel -->
          {#if calendarEditingDate}
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p class="font-medium">Edit Attendance for {calendarEditingDate}</p>
                <button
                  type="button"
                  class="rounded border px-2 py-1 text-sm"
                  onclick={() => {
                    calendarEditingDate = null;
                    calendarEditReason = '';
                    calendarMessage = '';
                  }}
                >
                  Cancel
                </button>
              </div>

              <div class="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                <select
                  class="rounded border px-3 py-2 text-sm"
                  value={calendarEditStatus}
                  onchange={(e) =>
                    (calendarEditStatus = (e.currentTarget as HTMLSelectElement)
                      .value as AttendanceRecord['status'])}
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                  <option value="Half Day">Half Day</option>
                </select>

                <input
                  type="text"
                  class="rounded border px-3 py-2 text-sm"
                  value={calendarEditReason}
                  oninput={(e) =>
                    (calendarEditReason = (e.currentTarget as HTMLInputElement).value)}
                  placeholder="Reason is required for calendar edits"
                />

                <button
                  type="button"
                  onclick={saveCalendarEdit}
                  disabled={calendarSaving}
                  class="rounded bg-slate-900 px-4 py-2 text-sm text-white"
                >
                  {calendarSaving ? 'Saving...' : 'Save Change'}
                </button>
              </div>

              <p class="mt-2 text-xs text-slate-500">
                All calendar edits require a reason and are saved directly to attendance records.
              </p>
              {#if calendarMessage}
                <p class="mt-2 text-sm text-blue-700">{calendarMessage}</p>
              {/if}
            </div>
          {/if}

          <!-- Leave records table -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50">
                  <th class="border px-2 py-2 text-left">Date</th>
                  <th class="border px-2 py-2 text-left">Type</th>
                  <th class="border px-2 py-2 text-left">Status</th>
                  <th class="border px-2 py-2 text-left">Title</th>
                </tr>
              </thead>
              <tbody>
                {#if selectedTeacherLeaves.filter((l) => l.createdAt?.startsWith(selectedMonth)).length === 0}
                  <tr>
                    <td class="border px-2 py-3 text-center text-gray-500" colspan={4}>
                      No approved leave records found for this month.
                    </td>
                  </tr>
                {:else}
                  {#each selectedTeacherLeaves.filter((l) => l.createdAt?.startsWith(selectedMonth)) as leave (leave._id)}
                    <tr>
                      <td class="border px-2 py-2">{leave.createdAt?.slice(0, 10) ?? '-'}</td>
                      <td class="border px-2 py-2">{leave.leaveType}</td>
                      <td class="border px-2 py-2">{leave.status}</td>
                      <td class="border px-2 py-2">{leave.title ?? '-'}</td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  {/if}

</div>

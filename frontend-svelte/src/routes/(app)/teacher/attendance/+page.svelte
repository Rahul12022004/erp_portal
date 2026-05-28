<script lang="ts">
  import { page } from '$app/stores';

  type SchoolClass = { _id: string; name: string; section?: string; classTeacher?: string | { _id: string; name: string } };
  type StudentAttendance = { attendanceId: string | null; class: string; email: string; name: string; remarks: string; rollNumber: string; studentId: string; status: string | null };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');
  const teacherName = $derived($page.data.user?.name ?? 'Teacher');

  let teacherClasses = $state<SchoolClass[]>([]);
  let students = $state<StudentAttendance[]>([]);
  let selectedClass = $state('');
  let selectedDate = $state(new Date().toISOString().split('T')[0]);
  let loadingClasses = $state(true);
  let loadingStudents = $state(false);
  let error = $state('');
  let selfAttendanceStatus = $state<string | null>(null);
  let selfAttendanceLocked = $state(false);
  let selfAttendanceLoading = $state(false);
  let selfAttendanceMeta = $state<{ isOutsideSchool?: boolean; distanceFromSchoolMeters?: number | null }>({});
  let selfAttendanceMessage = $state('');
  let showDownloadMenu = $state(false);

  const presentCount = $derived(students.filter(s => s.status === 'Present').length);
  const absentCount = $derived(students.filter(s => s.status === 'Absent').length);
  const total = $derived(students.length);
  const percent = $derived(total ? Math.round((presentCount / total) * 100) : 0);

  $effect(() => {
    if (!schoolId || !teacherId) { teacherClasses = []; loadingClasses = false; return; }
    loadingClasses = true; error = '';
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then(r => { if (!r.ok) throw new Error(`Failed to load classes (${r.status})`); return r.json(); })
      .then(data => {
        const all = Array.isArray((data as {data?: unknown[]})?.data) ? (data as {data: typeof teacherClasses}).data : (Array.isArray(data) ? data : []);
        const assigned = all.filter((cls: SchoolClass) => {
          if (!cls.classTeacher) return false;
          if (typeof cls.classTeacher === 'string') return cls.classTeacher === teacherId;
          return cls.classTeacher._id === teacherId;
        });
        teacherClasses = assigned;
        if (assigned.length > 0 && !selectedClass) selectedClass = assigned[0].name;
      })
      .catch(e => { error = e instanceof Error ? e.message : 'Failed to load classes'; })
      .finally(() => { loadingClasses = false; });
  });

  $effect(() => {
    if (!schoolId || !selectedClass || !selectedDate) { students = []; return; }
    loadingStudents = true; error = '';
    fetch(`/api/attendance/students/${schoolId}/${encodeURIComponent(selectedClass)}/${selectedDate}`)
      .then(r => { if (!r.ok) throw new Error(`Failed to load attendance (${r.status})`); return r.json(); })
      .then(data => { students = Array.isArray((data as {data?: unknown[]})?.data) ? (data as {data: typeof students}).data : (Array.isArray(data) ? data : []); })
      .catch(e => { error = e instanceof Error ? e.message : 'Failed to load attendance'; })
      .finally(() => { loadingStudents = false; });
  });

  $effect(() => {
    if (!schoolId || !teacherId || !selectedDate) {
      selfAttendanceStatus = null; selfAttendanceLocked = false; selfAttendanceMeta = {};
      return;
    }
    fetch(`/api/attendance/self/${schoolId}/${teacherId}/${selectedDate}`)
      .then(r => { if (!r.ok) return null; return r.json(); })
      .then(payload => {
        const entry = payload?.data;
        if (!entry) { selfAttendanceStatus = null; selfAttendanceLocked = false; selfAttendanceMeta = {}; return; }
        selfAttendanceStatus = entry.status || null;
        selfAttendanceLocked = Boolean(entry.selfLocked);
        selfAttendanceMeta = { isOutsideSchool: Boolean(entry.isOutsideSchool), distanceFromSchoolMeters: typeof entry.distanceFromSchoolMeters === 'number' ? entry.distanceFromSchoolMeters : null };
      })
      .catch(() => { /* ignore */ });
  });

  async function markAttendance(studentId: string, status: 'Present' | 'Absent') {
    if (!schoolId || !selectedClass || !selectedDate) { alert('Please select class and date'); return; }
    try {
      const res = await fetch('/api/attendance/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, schoolId, date: selectedDate, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save attendance');
      students = students.map(s => s.studentId === studentId ? { ...s, attendanceId: data.data?._id || s.attendanceId, status } : s);
    } catch (e) {
      alert('Failed to save attendance');
    }
  }

  async function markSelfAttendance(status: 'Present' | 'Absent') {
    if (!schoolId || !teacherId || !selectedDate) { alert('Please select date'); return; }
    if (selfAttendanceLocked) { selfAttendanceMessage = 'Attendance is locked for this date and cannot be changed.'; return; }
    try {
      selfAttendanceLoading = true; selfAttendanceMessage = '';
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Geolocation is not supported in this browser')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      });
      const location = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
      const res = await fetch('/api/attendance/self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, schoolId, date: selectedDate, status, location }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.message || 'Failed to mark self attendance');
      selfAttendanceStatus = status;
      selfAttendanceLocked = Boolean(payload?.data?.selfLocked);
      selfAttendanceMeta = payload?.meta || {};
      selfAttendanceMessage = payload?.meta?.isOutsideSchool
        ? 'Attendance marked, but location detected outside school geofence.'
        : 'Self attendance marked successfully with location.';
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to mark self attendance');
    } finally { selfAttendanceLoading = false; }
  }

  async function lockSelfAttendance() {
    if (!schoolId || !teacherId || !selectedDate) { alert('Please select date'); return; }
    if (!selfAttendanceStatus) { alert('Please mark attendance first, then lock it.'); return; }
    if (selfAttendanceLocked) { selfAttendanceMessage = 'Attendance is already locked for this date.'; return; }
    try {
      selfAttendanceLoading = true; selfAttendanceMessage = '';
      const res = await fetch('/api/attendance/self/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, schoolId, date: selectedDate }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.message || 'Failed to lock self attendance');
      selfAttendanceLocked = Boolean(payload?.data?.selfLocked);
      selfAttendanceMessage = 'Attendance locked for this date.';
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to lock self attendance');
    } finally { selfAttendanceLoading = false; }
  }

  async function fetchMonthlyData() {
    const [year, month] = selectedDate.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
    const allData: Record<string, Record<string, string>> = {};
    const studentNames: Record<string, string> = {};
    const studentRolls: Record<string, string> = {};
    for (const date of dates) {
      try {
        const res = await fetch(`/api/attendance/students/${schoolId}/${encodeURIComponent(selectedClass)}/${date}`);
        if (!res.ok) continue;
        const data: StudentAttendance[] = await res.json();
        data.forEach(s => {
          if (!allData[s.studentId]) allData[s.studentId] = {};
          allData[s.studentId][date] = s.status || '-';
          studentNames[s.studentId] = s.name;
          studentRolls[s.studentId] = s.rollNumber;
        });
      } catch { /* skip */ }
    }
    return { dates, allData, studentNames, studentRolls, year, month };
  }

  function downloadDailyCSV() {
    if (!selectedClass || !selectedDate) { alert('Please select class and date'); return; }
    const rows = [['Roll No', 'Student Name', 'Status'], ...students.map(s => [s.rollNumber, s.name, s.status || 'Not Marked'])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Attendance_${selectedClass}_${selectedDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadMonthlyCSV() {
    if (!selectedClass || !selectedDate || !schoolId) { alert('Please select class and date'); return; }
    const { dates, allData, studentNames, studentRolls, year, month } = await fetchMonthlyData();
    const headers = ['Roll No', 'Name', ...dates.map(d => d.split('-')[2])];
    const rows = Object.entries(allData).map(([id, dateMap]) => [studentRolls[id] || '', studentNames[id] || '', ...dates.map(d => dateMap[d] || '-')]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Monthly_Attendance_${selectedClass}_${year}-${String(month).padStart(2, '0')}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head><title>Attendance — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="bg-white border rounded-xl p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="font-semibold">My Attendance</p>
        <p class="text-sm text-gray-500">{teacherName} • {selectedDate}</p>
        <p class="text-xs mt-1 text-gray-600">Status: {selfAttendanceStatus || 'Not Marked'}</p>
        <p class="text-xs mt-1 text-gray-600">Lock: {selfAttendanceLocked ? 'Locked' : 'Unlocked'}</p>
        {#if typeof selfAttendanceMeta.distanceFromSchoolMeters === 'number'}
          <p class="text-xs text-gray-600">Distance from school: {Math.round(selfAttendanceMeta.distanceFromSchoolMeters)} m</p>
        {/if}
        {#if selfAttendanceMeta.isOutsideSchool}
          <p class="text-xs mt-1 text-red-600 font-medium">Outside school area detected</p>
        {:else if selfAttendanceStatus}
          <p class="text-xs mt-1 text-green-600 font-medium">Within school area</p>
        {/if}
        {#if selfAttendanceMessage}
          <p class="text-xs mt-1 text-blue-600">{selfAttendanceMessage}</p>
        {/if}
      </div>
      <div class="flex gap-2">
        <button type="button" disabled={selfAttendanceLoading || selfAttendanceLocked} onclick={() => markSelfAttendance('Present')}
          class="px-3 py-1.5 rounded {selfAttendanceStatus === 'Present' ? 'bg-green-600 text-white' : 'bg-gray-100'}">
          {selfAttendanceLoading ? 'Marking...' : 'Mark Present'}
        </button>
        <button type="button" disabled={selfAttendanceLoading || selfAttendanceLocked} onclick={() => markSelfAttendance('Absent')}
          class="px-3 py-1.5 rounded {selfAttendanceStatus === 'Absent' ? 'bg-red-500 text-white' : 'bg-gray-100'}">
          {selfAttendanceLoading ? 'Marking...' : 'Mark Absent'}
        </button>
        <button type="button" disabled={selfAttendanceLoading || selfAttendanceLocked || !selfAttendanceStatus} onclick={lockSelfAttendance}
          class="px-3 py-1.5 rounded {selfAttendanceLocked ? 'bg-slate-700 text-white' : 'bg-amber-500 text-white'}">
          {selfAttendanceLoading ? 'Saving...' : selfAttendanceLocked ? 'Locked' : 'Lock'}
        </button>
      </div>
    </div>
  </div>

  <div class="flex gap-4 flex-wrap items-center">
    <div>
      <label for="teacher-att-class" class="mr-2 font-medium">Class:</label>
      <select id="teacher-att-class" class="border rounded px-3 py-2" bind:value={selectedClass} disabled={loadingClasses || teacherClasses.length === 0}>
        <option value="">Choose Class</option>
        {#each teacherClasses as cls (cls._id)}
          <option value={cls.name}>{cls.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="teacher-att-date" class="mr-2 font-medium">Date:</label>
      <input id="teacher-att-date" type="date" class="border rounded px-3 py-2" bind:value={selectedDate} />
    </div>
    <div class="relative">
      <button type="button" onclick={() => (showDownloadMenu = !showDownloadMenu)} disabled={!selectedClass}
        class="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50">
        Download ▼
      </button>
      {#if showDownloadMenu}
        <div class="absolute left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[170px] py-1">
          <button onclick={() => { downloadDailyCSV(); showDownloadMenu = false; }}
            class="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
            📊 Daily CSV
          </button>
          <hr class="my-1" />
          <button onclick={() => { downloadMonthlyCSV(); showDownloadMenu = false; }}
            class="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
            📊 Monthly CSV
          </button>
        </div>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="bg-white border rounded-xl p-4 text-red-600">{error}</div>
  {/if}

  {#if loadingClasses}
    <div class="bg-white border rounded-xl p-4 text-center text-gray-500">Loading classes...</div>
  {:else if teacherClasses.length === 0}
    <div class="bg-white border rounded-xl p-4 text-center text-gray-500">No classes are assigned to this teacher yet.</div>
  {:else if !selectedClass}
    <div class="bg-white border rounded-xl p-4 text-center text-gray-500">Select a class to view attendance.</div>
  {:else}
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded shadow text-center"><p>Total</p><h3 class="font-bold text-xl">{total}</h3></div>
      <div class="bg-white p-4 rounded shadow text-center"><p>Present</p><h3 class="text-green-600 text-xl">{presentCount}</h3></div>
      <div class="bg-white p-4 rounded shadow text-center"><p>Absent</p><h3 class="text-red-500 text-xl">{absentCount}</h3></div>
      <div class="bg-white p-4 rounded shadow text-center"><p>%</p><h3 class="text-xl">{percent}%</h3></div>
    </div>

    <div class="space-y-3">
      {#if loadingStudents}
        <div class="bg-white border rounded-xl p-4 text-center text-gray-500">Loading attendance...</div>
      {:else if students.length === 0}
        <div class="bg-white border rounded-xl p-4 text-center text-gray-500">No students found in this class.</div>
      {:else}
        {#each students as student (student.studentId)}
          <div class="bg-white border rounded-xl p-4 flex justify-between items-center">
            <div>
              <p class="font-medium">{student.name}</p>
              <p class="text-sm text-gray-500">Roll No: {student.rollNumber} • {student.email}</p>
            </div>
            <div class="flex gap-3">
              <button onclick={() => markAttendance(student.studentId, 'Present')}
                class="px-3 py-1 rounded {student.status === 'Present' ? 'bg-green-600 text-white' : 'bg-gray-100'}">
                Present
              </button>
              <button onclick={() => markAttendance(student.studentId, 'Absent')}
                class="px-3 py-1 rounded {student.status === 'Absent' ? 'bg-red-500 text-white' : 'bg-gray-100'}">
                Absent
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

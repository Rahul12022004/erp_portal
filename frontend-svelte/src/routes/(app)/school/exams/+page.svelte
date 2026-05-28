<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Calendar, ChevronLeft, ChevronRight, Download, FileText, Filter, List, Plus, Sparkles, Trash2, Pencil } from 'lucide-svelte';

  type SchoolClass = { _id: string; name: string; section?: string };
  type Teacher = { _id: string; name: string; email?: string; position?: string; status?: string };
  type ExamUpload = { _id: string; teacherName: string; documentName?: string; documentData?: string; comment?: string; uploadedAt?: string };
  type Exam = {
    _id: string; title: string; examType: string; className: string;
    teacherId?: string | Teacher | null; subject: string; examDate: string;
    startTime: string; endTime: string; instructions?: string; uploads?: ExamUpload[];
  };

  const examTypes = ['Unit Test','Weekly Test','Monthly Test','Quarterly Exam','Half Yearly','Pre Board','Final Exam','Practical Exam'];

  const examTypeColors: Record<string, { bg: string; border: string; text: string }> = {
    'Unit Test': { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
    'Weekly Test': { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' },
    'Monthly Test': { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
    'Quarterly Exam': { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
    'Half Yearly': { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' },
    'Pre Board': { bg: '#ffe4e6', border: '#f43f5e', text: '#be123c' },
    'Final Exam': { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
    'Practical Exam': { bg: '#f3e8ff', border: '#a855f7', text: '#7e22ce' },
  };

  function getExamColor(examType: string) {
    return examTypeColors[examType] ?? { bg: '#f3f4f6', border: '#6b7280', text: '#374151' };
  }

  function getClassLabel(c: Pick<SchoolClass, 'name' | 'section'>) {
    return c.section ? `${c.name} - ${c.section}` : c.name;
  }

  function getTeacherName(teacherId: Exam['teacherId']) {
    if (!teacherId) return 'Not assigned';
    if (typeof teacherId === 'object') return teacherId.name || 'Assigned';
    return 'Not assigned';
  }

  const schoolId = $derived($page.data.user?.schoolId ?? '');

  let classes = $state<SchoolClass[]>([]);
  let teachers = $state<Teacher[]>([]);
  let exams = $state<Exam[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let deletingId = $state('');
  let error = $state('');
  let viewMode = $state<'calendar' | 'list'>('list');
  let filterClass = $state('');
  let filterSubject = $state('');
  let filterExamType = $state('');

  // Modal
  let showModal = $state(false);
  let editingExam = $state<Exam | null>(null);
  let formTitle = $state('');
  let formExamType = $state('');
  let formClassName = $state('');
  let formTeacherId = $state('');
  let formSubject = $state('');
  let formExamDate = $state('');
  let formStartTime = $state('09:00');
  let formEndTime = $state('10:00');
  let formInstructions = $state('');

  // AI modal
  let showAiModal = $state(false);
  let aiPrompt = $state('');
  let aiTeacherId = $state('');
  let aiCreating = $state(false);

  // Calendar
  let calendarDate = $state(new Date());

  const filteredExams = $derived(
    exams.filter(exam => {
      if (filterClass && exam.className !== filterClass) return false;
      if (filterSubject && exam.subject !== filterSubject) return false;
      if (filterExamType && exam.examType !== filterExamType) return false;
      return true;
    })
  );

  const subjectOptions = $derived([...new Set(exams.map(e => e.subject).filter(Boolean))].sort());

  const stats = $derived({
    total: filteredExams.length,
    uploaded: filteredExams.filter(e => (e.uploads?.length ?? 0) > 0).length,
    pending: filteredExams.filter(e => (e.uploads?.length ?? 0) === 0).length,
  });

  // Calendar grid
  const calendarYear = $derived(calendarDate.getFullYear());
  const calendarMonth = $derived(calendarDate.getMonth());
  const calendarDays = $derived(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: Array<{ day: number | null; exams: Exam[] }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, exams: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, exams: filteredExams.filter(e => e.examDate === dateStr) });
    }
    return days;
  });

  async function fetchData() {
    if (!schoolId) { loading = false; return; }
    try {
      loading = true; error = '';
      const [classesRes, examsRes] = await Promise.all([
        fetch(`/api/classes?schoolId=${schoolId}`),
        fetch(`/api/exams/school/${schoolId}`),
      ]);
      if (!classesRes.ok) throw new Error(`Failed to load classes (${classesRes.status})`);
      if (!examsRes.ok) throw new Error(`Failed to load exams (${examsRes.status})`);
      const [classesData, examsData] = await Promise.all([classesRes.json(), examsRes.json()]);
      const unwrap = (d: unknown) => Array.isArray((d as {data?: unknown})?.data) ? (d as {data: unknown[]}).data : (Array.isArray(d) ? d : []);
      classes = unwrap(classesData) as typeof classes;
      exams = unwrap(examsData) as typeof exams;
      try {
        const staffRes = await fetch(`/api/staff/${schoolId}`);
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          teachers = (unwrap(staffData) as typeof teachers).filter((s) => /^Teacher$/i.test(String(s.position ?? '')) && String(s.status ?? 'Active') !== 'Inactive');
        }
      } catch { /* teachers optional */ }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load exam module';
      classes = []; exams = []; teachers = [];
    } finally { loading = false; }
  }

  onMount(() => { fetchData(); });

  function upsertExam(next: Exam) {
    const idx = exams.findIndex(e => e._id === next._id);
    exams = idx >= 0 ? exams.map((e, i) => i === idx ? next : e) : [next, ...exams];
  }

  function openCreate(date?: string) {
    editingExam = null;
    formTitle = ''; formExamType = ''; formClassName = filterClass || ''; formTeacherId = '';
    formSubject = ''; formExamDate = date ?? new Date().toISOString().slice(0, 10);
    formStartTime = '09:00'; formEndTime = '10:00'; formInstructions = '';
    showModal = true;
  }

  function openEdit(exam: Exam) {
    editingExam = exam;
    const tid = exam.teacherId && typeof exam.teacherId === 'object' ? exam.teacherId._id : typeof exam.teacherId === 'string' ? exam.teacherId : '';
    formTitle = exam.title; formExamType = exam.examType; formClassName = exam.className;
    formTeacherId = tid ?? ''; formSubject = exam.subject; formExamDate = exam.examDate;
    formStartTime = exam.startTime; formEndTime = exam.endTime; formInstructions = exam.instructions ?? '';
    showModal = true;
  }

  function closeModal() { showModal = false; editingExam = null; }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (formEndTime <= formStartTime) { error = 'End time must be after start time.'; return; }
    try {
      saving = true; error = '';
      const url = editingExam ? `/api/exams/${editingExam._id}` : '/api/exams';
      const method = editingExam ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(), examType: formExamType, className: formClassName,
          teacherId: formTeacherId || null, subject: formSubject.trim(),
          examDate: formExamDate, startTime: formStartTime, endTime: formEndTime,
          instructions: formInstructions.trim(), schoolId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to save exam');
      upsertExam(data.data as Exam);
      closeModal();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save exam';
    } finally { saving = false; }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this exam and all uploaded papers?')) return;
    try {
      deletingId = id;
      const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to delete exam');
      exams = exams.filter(e => e._id !== id);
      if (editingExam?._id === id) closeModal();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete exam';
    } finally { deletingId = ''; }
  }

  async function createWithAi() {
    if (!aiPrompt.trim()) { error = 'Please enter a prompt.'; return; }
    if (!schoolId) { error = 'School session not found.'; return; }
    try {
      aiCreating = true; error = '';
      const res = await fetch('/api/exams/ai-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, prompt: aiPrompt.trim(), classOptions: classes.map(getClassLabel), teacherId: aiTeacherId || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to create exam from AI');
      const created: Exam[] = Array.isArray(data.data) ? data.data : [data.data];
      created.forEach(upsertExam);
      aiPrompt = ''; aiTeacherId = ''; showAiModal = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create exam from AI';
    } finally { aiCreating = false; }
  }

  function downloadMarks(exam: Exam) {
    alert('PDF download requires additional library setup.');
  }
</script>

<svelte:head><title>Exams — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h3 class="text-lg font-semibold text-slate-900">Visual Exam Scheduler</h3>
        <p class="text-sm text-slate-500">Plan and manage exams with calendar or list view. Track paper uploads at a glance.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button onclick={() => fetchData()} class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Refresh</button>
        <div class="flex rounded-xl border border-slate-200 overflow-hidden">
          <button onclick={() => (viewMode = 'calendar')} class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium {viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}">
            <Calendar class="h-4 w-4" />Calendar
          </button>
          <button onclick={() => (viewMode = 'list')} class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium {viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}">
            <List class="h-4 w-4" />List
          </button>
        </div>
        <button onclick={() => (showAiModal = true)} class="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">
          <Sparkles class="h-4 w-4" />Create with AI
        </button>
        <button onclick={() => openCreate()} class="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus class="h-4 w-4" />Create Exam
        </button>
      </div>
    </div>
  </div>

  {#if error}
    <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
  {/if}

  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p class="text-sm text-slate-500">Filtered Exams</p>
      <p class="mt-1 text-3xl font-semibold text-slate-900">{stats.total}</p>
    </div>
    <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <p class="text-sm text-emerald-700">Paper Uploaded</p>
      <p class="mt-1 text-3xl font-semibold text-emerald-700">{stats.uploaded}</p>
    </div>
    <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <p class="text-sm text-amber-700">Paper Pending</p>
      <p class="mt-1 text-3xl font-semibold text-amber-700">{stats.pending}</p>
    </div>
  </div>

  <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Filter class="h-4 w-4" />Filters</p>
    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={filterClass}>
        <option value="">All Classes</option>
        {#each classes as c}<option value={getClassLabel(c)}>{getClassLabel(c)}</option>{/each}
      </select>
      <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={filterSubject}>
        <option value="">All Subjects</option>
        {#each subjectOptions as s}<option value={s}>{s}</option>{/each}
      </select>
      <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={filterExamType}>
        <option value="">All Exam Types</option>
        {#each examTypes as t}<option value={t}>{t}</option>{/each}
      </select>
    </div>
  </div>

  {#if loading}
    <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading exams...</div>
  {:else if filteredExams.length === 0}
    <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No exams match the selected filters.</div>
  {:else if viewMode === 'calendar'}
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <button onclick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth() - 1); calendarDate = d; }} class="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><ChevronLeft class="h-4 w-4" /></button>
        <h3 class="text-base font-semibold text-slate-900">{calendarDate.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h3>
        <button onclick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth() + 1); calendarDate = d; }} class="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><ChevronRight class="h-4 w-4" /></button>
      </div>
      <div class="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
        {#each ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as day}
          <div class="bg-slate-50 px-2 py-1.5 text-center text-xs font-semibold text-slate-500">{day}</div>
        {/each}
        {#each calendarDays() as cell}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="min-h-[80px] bg-white p-1 {cell.day ? 'cursor-pointer hover:bg-blue-50' : ''}"
            role={cell.day ? 'button' : undefined}
            tabindex={cell.day ? 0 : undefined}
            onclick={() => { if (cell.day) { const ds = `${calendarYear}-${String(calendarMonth + 1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`; openCreate(ds); } }}
            onkeydown={(e) => { if (cell.day && (e.key === 'Enter' || e.key === ' ')) { const ds = `${calendarYear}-${String(calendarMonth + 1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`; openCreate(ds); } }}>
            {#if cell.day}
              <p class="text-xs font-medium text-slate-600 mb-1">{cell.day}</p>
              {#each cell.exams.slice(0, 3) as exam}
                {@const color = getExamColor(exam.examType)}
                <button
                  onclick={(e) => { e.stopPropagation(); openEdit(exam); }}
                  class="mb-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold"
                  style="background:{color.bg};color:{color.text};border:1px solid {color.border}"
                >{exam.title}</button>
              {/each}
              {#if cell.exams.length > 3}
                <p class="text-[10px] text-slate-400">+{cell.exams.length - 3} more</p>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="p-4 border-b border-slate-100">
        <h3 class="text-base font-semibold text-slate-900">Exam List</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Exam</th>
              <th class="px-4 py-3">Date & Time</th>
              <th class="px-4 py-3">Teacher</th>
              <th class="px-4 py-3">Instructions</th>
              <th class="px-4 py-3">Papers</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredExams as exam}
              {@const color = getExamColor(exam.examType)}
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-4 py-3">
                  <p class="font-semibold text-slate-900">{exam.title}</p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" style="background:{color.bg};color:{color.text}">{exam.examType}</span>
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{exam.className}</span>
                    <span class="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">{exam.subject}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <p class="text-slate-700">{exam.examDate}</p>
                  <p class="text-xs text-slate-500">{exam.startTime} - {exam.endTime}</p>
                </td>
                <td class="px-4 py-3 text-slate-600">{getTeacherName(exam.teacherId)}</td>
                <td class="px-4 py-3 max-w-[180px] text-slate-500 text-xs truncate">{exam.instructions || 'No instructions'}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold {(exam.uploads?.length ?? 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                    {(exam.uploads?.length ?? 0) > 0 ? `${exam.uploads?.length} uploaded` : 'Pending'}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <button onclick={() => openEdit(exam)} class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"><Pencil class="h-3 w-3" /></button>
                    <button onclick={() => downloadMarks(exam)} class="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"><Download class="h-3 w-3" /></button>
                    <button onclick={() => handleDelete(exam._id)} disabled={deletingId === exam._id} class="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-60"><Trash2 class="h-3 w-3" /></button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

{#if showModal}
  <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
    <div class="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
      <h4 class="mb-4 text-lg font-semibold">{editingExam ? 'Exam Details' : 'Create Exam'}</h4>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label for="exam-name" class="mb-1 block text-xs font-semibold text-slate-600">Exam Name</label>
            <input id="exam-name" type="text" bind:value={formTitle} required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Enter exam name" />
          </div>
          <div>
            <label for="exam-type" class="mb-1 block text-xs font-semibold text-slate-600">Exam Type</label>
            <select id="exam-type" bind:value={formExamType} required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select exam type</option>
              {#each examTypes as t}<option value={t}>{t}</option>{/each}
            </select>
          </div>
          <div>
            <label for="exam-class" class="mb-1 block text-xs font-semibold text-slate-600">Class</label>
            <select id="exam-class" bind:value={formClassName} required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select class</option>
              {#each classes as c}<option value={getClassLabel(c)}>{getClassLabel(c)}</option>{/each}
            </select>
          </div>
          <div>
            <label for="exam-teacher" class="mb-1 block text-xs font-semibold text-slate-600">Assign Teacher (Optional)</label>
            <select id="exam-teacher" bind:value={formTeacherId} class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select teacher</option>
              {#each teachers as t}<option value={t._id}>{t.name}{t.email ? ` (${t.email})` : ''}</option>{/each}
            </select>
          </div>
          <div>
            <label for="exam-subject" class="mb-1 block text-xs font-semibold text-slate-600">Subject</label>
            <input id="exam-subject" type="text" bind:value={formSubject} required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label for="exam-date" class="mb-1 block text-xs font-semibold text-slate-600">Exam Date</label>
            <input id="exam-date" type="date" bind:value={formExamDate} required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label for="exam-start-time" class="mb-1 block text-xs font-semibold text-slate-600">Start Time</label>
            <input id="exam-start-time" type="time" bind:value={formStartTime} required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label for="exam-end-time" class="mb-1 block text-xs font-semibold text-slate-600">End Time</label>
            <input id="exam-end-time" type="time" bind:value={formEndTime} required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label for="exam-instructions" class="mb-1 block text-xs font-semibold text-slate-600">Additional Instructions</label>
          <textarea id="exam-instructions" bind:value={formInstructions} rows={3} class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Add instructions for teachers or students"></textarea>
        </div>

        {#if editingExam?.uploads && editingExam.uploads.length > 0}
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="mb-3 text-sm font-semibold text-slate-700">Teacher Upload Status</p>
            <div class="space-y-2">
              {#each editingExam.uploads as upload}
                <div class="rounded-xl border border-slate-200 bg-white p-3">
                  <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{upload.teacherName}</span>
                    <span class="text-xs text-slate-500">{upload.uploadedAt ? new Date(upload.uploadedAt).toLocaleString() : 'Uploaded'}</span>
                  </div>
                  {#if upload.documentData}
                    <a href={upload.documentData} target="_blank" class="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                      <FileText class="h-4 w-4" />{upload.documentName || 'View uploaded paper'}
                    </a>
                  {/if}
                  <p class="mt-1 text-xs text-slate-600">{upload.comment || 'No comment added.'}</p>
                </div>
              {/each}
            </div>
          </div>
        {:else if editingExam}
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">No teacher papers uploaded yet.</div>
        {/if}

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            {#if editingExam}
              <button type="button" onclick={() => handleDelete(editingExam!._id)} disabled={deletingId === editingExam._id} class="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                <Trash2 class="h-4 w-4" />Delete Exam
              </button>
            {/if}
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick={closeModal} class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
            {#if editingExam}
              <button type="button" onclick={() => downloadMarks(editingExam!)} class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <Download class="h-4 w-4" />Download Marks
              </button>
            {/if}
            <button type="submit" disabled={saving} class="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : editingExam ? 'Save Changes' : 'Create Exam'}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showAiModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h4 class="mb-1 text-lg font-semibold">Create Exam with AI</h4>
      <p class="mb-4 text-sm text-slate-500">Enter one prompt and the exam will be created automatically.</p>

      <div class="space-y-3">
        <textarea
          bind:value={aiPrompt}
          rows={4}
          class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="Example: Create a full week exam plan for Class 10 - A, Monday to Friday, one subject each day, 09:00 to 10:00, include short instructions."
        ></textarea>
        <select bind:value={aiTeacherId} class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">Assign teacher (optional)</option>
          {#each teachers as t}<option value={t._id}>{t.name}{t.email ? ` (${t.email})` : ''}</option>{/each}
        </select>
      </div>

      <div class="mt-5 flex gap-2">
        <button type="button" onclick={() => (showAiModal = false)} class="w-full rounded-xl bg-slate-200 py-2 text-sm font-medium text-slate-700" disabled={aiCreating}>Cancel</button>
        <button type="button" onclick={createWithAi} disabled={aiCreating} class="w-full rounded-xl bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60">
          {aiCreating ? 'Creating...' : 'Create Exam'}
        </button>
      </div>
    </div>
  </div>
{/if}

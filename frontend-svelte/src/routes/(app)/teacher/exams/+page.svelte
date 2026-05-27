<script lang="ts">
  import { page } from '$app/stores';

  type TeacherUpload = { _id: string; teacherId?: string | { _id: string; name?: string }; teacherName: string; documentName?: string; documentData?: string; comment?: string; uploadedAt?: string };
  type Exam = { _id: string; title: string; examType: string; className: string; subject: string; examDate: string; startTime: string; endTime: string; instructions?: string; uploadStatus?: 'uploaded' | 'pending'; teacherUpload?: TeacherUpload | null };

  const examTypeColors: Record<string, string> = {
    'Unit Test': 'bg-blue-100 text-blue-800 border-blue-300',
    'Weekly Test': 'bg-sky-100 text-sky-800 border-sky-300',
    'Monthly Test': 'bg-green-100 text-green-800 border-green-300',
    'Quarterly Exam': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Half Yearly': 'bg-purple-100 text-purple-800 border-purple-300',
    'Pre Board': 'bg-rose-100 text-rose-800 border-rose-300',
    'Final Exam': 'bg-red-100 text-red-800 border-red-300',
    'Practical Exam': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');

  let exams = $state<Exam[]>([]);
  let loading = $state(true);
  let error = $state('');
  let uploadingExamId = $state('');
  let selectedFiles = $state<Record<string, File | null>>({});
  let comments = $state<Record<string, string>>({});
  let activeExam = $state<Exam | null>(null);
  let modalOpen = $state(false);

  // Calendar state
  let calendarYear = $state(new Date().getFullYear());
  let calendarMonth = $state(new Date().getMonth());

  $effect(() => {
    if (!schoolId || !teacherId) { loading = false; return; }
    loading = true; error = '';
    fetch(`/api/exams/teacher/${schoolId}/${teacherId}`)
      .then(r => { if (!r.ok) throw new Error(`Failed to load exams (${r.status})`); return r.json(); })
      .then(data => {
        const nextExams = Array.isArray(data) ? data : [];
        exams = nextExams;
        const nextComments = { ...comments };
        nextExams.forEach((exam: Exam) => {
          if (nextComments[exam._id] === undefined) nextComments[exam._id] = exam.teacherUpload?.comment || '';
        });
        comments = nextComments;
      })
      .catch(e => { error = e instanceof Error ? e.message : 'Failed to load exams'; })
      .finally(() => { loading = false; });
  });

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const calendarDays = $derived.by(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  });

  const examsByDate = $derived.by(() => {
    const map: Record<string, Exam[]> = {};
    exams.forEach(exam => {
      const d = exam.examDate;
      if (!map[d]) map[d] = [];
      map[d].push(exam);
    });
    return map;
  });

  function getDayKey(day: number) {
    return `${calendarYear}-${String(calendarMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function prevMonth() {
    if (calendarMonth === 0) { calendarMonth = 11; calendarYear--; } else calendarMonth--;
  }
  function nextMonth() {
    if (calendarMonth === 11) { calendarMonth = 0; calendarYear++; } else calendarMonth++;
  }

  function openExamModal(exam: Exam) {
    activeExam = exam;
    if (comments[exam._id] === undefined) comments = { ...comments, [exam._id]: exam.teacherUpload?.comment || '' };
    modalOpen = true;
  }

  async function handleUpload() {
    if (!activeExam) return;
    const examId = activeExam._id;
    const file = selectedFiles[examId];
    if (!file) { alert('Please select a paper before uploading.'); return; }
    try {
      uploadingExamId = examId;
      const documentData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file!);
      });
      const res = await fetch(`/api/exams/${examId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, schoolId, documentName: file.name, documentData, comment: comments[examId] || '' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to upload exam paper');
      const updatedExam = data.data as Exam & { uploads?: TeacherUpload[] };
      const teacherUpload = Array.isArray(updatedExam.uploads)
        ? updatedExam.uploads.find(u => {
            const uid = u.teacherId && typeof u.teacherId === 'object' ? String(u.teacherId._id) : String(u.teacherId || '');
            return uid === teacherId;
          }) || null
        : null;
      const nextExam = { ...activeExam, teacherUpload, uploadStatus: (teacherUpload?.documentData ? 'uploaded' : 'pending') as 'uploaded' | 'pending' };
      exams = exams.map(e => e._id === examId ? nextExam : e);
      activeExam = nextExam;
      selectedFiles = { ...selectedFiles, [examId]: null };
      alert('Paper uploaded successfully.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to upload paper');
    } finally { uploadingExamId = ''; }
  }
</script>

<svelte:head><title>Exams — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="stat-card p-4">
    <h2 class="text-lg font-bold">Exams Calendar</h2>
    <p class="text-sm text-muted-foreground">View your exam timetable and upload question papers directly from each exam event.</p>
  </div>

  {#if error}
    <div class="stat-card p-4 text-red-600">{error}</div>
  {/if}

  {#if loading}
    <div class="stat-card p-8 text-center text-gray-500">Loading exams...</div>
  {:else if exams.length === 0}
    <div class="stat-card p-8 text-center text-gray-500">No exams are available for your assigned classes yet.</div>
  {:else}
    <div class="stat-card p-4">
      <div class="flex items-center justify-between mb-4">
        <button onclick={prevMonth} class="px-3 py-1 border rounded hover:bg-gray-50">‹</button>
        <span class="font-semibold">{monthNames[calendarMonth]} {calendarYear}</span>
        <button onclick={nextMonth} class="px-3 py-1 border rounded hover:bg-gray-50">›</button>
      </div>
      <div class="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-1">
        {#each ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as d}
          <div class="py-1">{d}</div>
        {/each}
      </div>
      <div class="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded overflow-hidden">
        {#each calendarDays as day, i (i)}
          {@const key = day ? getDayKey(day) : ''}
          {@const dayExams = day ? (examsByDate[key] || []) : []}
          <div class="bg-white min-h-[80px] p-1">
            {#if day}
              <div class="text-xs text-gray-500 mb-1">{day}</div>
              {#each dayExams as exam (exam._id)}
                <button onclick={() => openExamModal(exam)}
                  class="w-full text-left text-xs rounded border p-0.5 mb-0.5 truncate {examTypeColors[exam.examType] || 'bg-gray-100 text-gray-800 border-gray-300'}">
                  {exam.title}
                  {#if exam.uploadStatus === 'uploaded'}✓{/if}
                </button>
              {/each}
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

{#if modalOpen && activeExam}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-start justify-between">
        <h3 class="font-semibold text-lg">{activeExam.title} — Upload Paper</h3>
        <button onclick={() => { modalOpen = false; activeExam = null; }} class="text-gray-500 hover:text-gray-700 text-xl leading-none">✕</button>
      </div>

      <div class="flex flex-wrap gap-2">
        <span class="px-2 py-1 text-xs rounded border bg-gray-100">{activeExam.className}</span>
        <span class="px-2 py-1 text-xs rounded border bg-blue-100 text-blue-800">{activeExam.examType}</span>
        <span class="px-2 py-1 text-xs rounded border bg-purple-100 text-purple-800">{activeExam.subject}</span>
        <span class="px-2 py-1 text-xs rounded border bg-gray-100">📅 {activeExam.examDate}</span>
        <span class="px-2 py-1 text-xs rounded border bg-gray-100">🕐 {activeExam.startTime} - {activeExam.endTime}</span>
        <span class="px-2 py-1 text-xs rounded border {activeExam.uploadStatus === 'uploaded' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}">
          {activeExam.uploadStatus === 'uploaded' ? 'Paper Uploaded' : 'Paper Pending'}
        </span>
      </div>

      <div>
        <p class="text-sm font-medium mb-1">Instructions</p>
        <p class="text-sm text-gray-600">{activeExam.instructions || 'No additional instructions.'}</p>
      </div>

      <div>
        <p class="text-sm font-medium mb-1">Current Upload</p>
        {#if activeExam.teacherUpload?.documentData}
          <div class="space-y-1">
            <a href={activeExam.teacherUpload.documentData} target="_blank" rel="noreferrer" class="text-blue-600 hover:underline text-sm">
              📄 {activeExam.teacherUpload.documentName || 'View Uploaded Paper'}
            </a>
            {#if activeExam.teacherUpload.comment}
              <p class="text-sm text-gray-500">{activeExam.teacherUpload.comment}</p>
            {/if}
          </div>
        {:else}
          <p class="text-sm text-gray-500">No paper uploaded yet.</p>
        {/if}
      </div>

      <div>
        <label class="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition">
          <span class="text-sm text-gray-600">
            {selectedFiles[activeExam._id] ? selectedFiles[activeExam._id]!.name : 'Choose Paper (click to select)'}
          </span>
          <input type="file" class="hidden" onchange={e => {
            const f = (e.target as HTMLInputElement).files?.[0] || null;
            selectedFiles = { ...selectedFiles, [activeExam!._id]: f };
          }} />
        </label>
      </div>

      <div>
        <label class="text-sm font-medium block mb-1">💬 Comment</label>
        <textarea rows={4} placeholder="Add note for the school admin about this uploaded paper"
          class="border rounded p-2 w-full text-sm"
          value={comments[activeExam._id] || ''}
          oninput={e => { comments = { ...comments, [activeExam!._id]: (e.target as HTMLTextAreaElement).value }; }}>
        </textarea>
      </div>

      <div class="flex justify-end gap-3">
        <button onclick={() => { modalOpen = false; activeExam = null; }} class="px-4 py-2 border rounded text-sm">Close</button>
        <button onclick={handleUpload} disabled={uploadingExamId === activeExam._id}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-60">
          {uploadingExamId === activeExam._id ? 'Uploading...' : activeExam.teacherUpload ? 'Update Paper' : 'Upload Paper'}
        </button>
      </div>
    </div>
  </div>
{/if}

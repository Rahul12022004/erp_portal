<script lang="ts">
  import { page } from '$app/stores';

  type Exam = { _id: string; title: string; examType: string; className: string; examDate: string; startTime: string; endTime: string };
  type StudentMark = { markId: string | null; studentId: string; name: string; rollNumber: string; email: string; obtainedMarks: number | ''; maxMarks: number; remarks: string };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');

  let exams = $state<Exam[]>([]);
  let selectedExamId = $state('');
  let selectedExam = $state<Exam | null>(null);
  let students = $state<StudentMark[]>([]);
  let loadingExams = $state(true);
  let loadingStudents = $state(false);
  let saving = $state(false);
  let downloading = $state(false);
  let error = $state('');

  $effect(() => {
    if (!schoolId || !teacherId) { loadingExams = false; return; }
    loadingExams = true; error = '';
    fetch(`/api/exams/teacher/${schoolId}/${teacherId}`)
      .then(r => { if (!r.ok) throw new Error(`Failed to load completed exams (${r.status})`); return r.json(); })
      .then(data => {
        const completedExams: Exam[] = Array.isArray((data as {data?: unknown[]})?.data) ? (data as {data: Exam[]}).data : (Array.isArray(data) ? data : []);
        exams = completedExams;
        if (!selectedExamId || !completedExams.some((e: Exam) => e._id === selectedExamId)) {
          selectedExamId = completedExams[0]?._id || '';
        }
      })
      .catch(e => { error = e instanceof Error ? e.message : 'Failed to load completed exams'; })
      .finally(() => { loadingExams = false; });
  });

  $effect(() => {
    if (!schoolId || !teacherId || !selectedExamId) { selectedExam = null; students = []; return; }
    loadingStudents = true; error = '';
    fetch(`/api/marks/${schoolId}/${teacherId}/${selectedExamId}`)
      .then(r => { if (!r.ok) throw new Error(`Failed to load marks data (${r.status})`); return r.json(); })
      .then(data => {
        const d = data?.data ?? data;
        selectedExam = d.exam || null;
        students = Array.isArray(d.students) ? d.students : [];
      })
      .catch(e => { error = e instanceof Error ? e.message : 'Failed to load marks data'; })
      .finally(() => { loadingStudents = false; });
  });

  function updateStudentMark(studentId: string, field: 'obtainedMarks' | 'maxMarks' | 'remarks', value: string) {
    students = students.map(s => {
      if (s.studentId !== studentId) return s;
      if (field === 'remarks') return { ...s, remarks: value };
      if (value === '') return { ...s, [field]: field === 'obtainedMarks' ? '' : s[field] };
      const n = Number(value);
      return { ...s, [field]: Number.isNaN(n) ? s[field] : n };
    });
  }

  async function saveMarks() {
    if (!selectedExamId || !schoolId || !teacherId) return;
    const invalid = students.find(s => s.obtainedMarks !== '' && (Number(s.maxMarks) <= 0 || Number(s.obtainedMarks) < 0 || Number(s.obtainedMarks) > Number(s.maxMarks)));
    if (invalid) { alert('Each obtained mark must be between 0 and maximum marks.'); return; }
    try {
      saving = true;
      const res = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: selectedExamId, teacherId, schoolId, entries: students.map(s => ({ studentId: s.studentId, obtainedMarks: s.obtainedMarks, maxMarks: s.maxMarks, remarks: s.remarks })) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to save marks');
      alert('Marks saved successfully');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save marks');
    } finally { saving = false; }
  }

  async function downloadMarks() {
    if (!selectedExamId || !schoolId) return;
    try {
      downloading = true;
      const res = await fetch(`/api/marks/download/${schoolId}/${selectedExamId}`);
      if (!res.ok) throw new Error(`Failed to fetch marks data (${res.status})`);
      const data = await res.json();
      const rows = [
        ['Roll No', 'Student Name', 'Email', 'Obtained', 'Max', 'Remarks'],
        ...(data.marks || []).map((m: { rollNumber?: string; studentName?: string; email?: string; obtainedMarks?: string | number; maxMarks?: string | number; remarks?: string }) => [m.rollNumber, m.studentName, m.email, m.obtainedMarks, m.maxMarks, m.remarks || '-']),
      ];
      const csv = rows.map(r => r.map((v: unknown) => `"${v ?? ''}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Marks_${data.exam?.title || 'Exam'}_${data.exam?.className || ''}_${data.exam?.examDate || ''}.csv`.replace(/[\s/]+/g, '_');
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to download marks');
    } finally { downloading = false; }
  }
</script>

<svelte:head><title>Marks — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="stat-card p-6 space-y-4">
    <h3 class="text-lg font-semibold">Select Completed Exam</h3>
    <select class="border p-2 rounded w-full" bind:value={selectedExamId} disabled={loadingExams || exams.length === 0}>
      <option value="">Select Exam</option>
      {#each exams as exam (exam._id)}
        <option value={exam._id}>{exam.title} - {exam.className} - {exam.examType} - {exam.examDate}</option>
      {/each}
    </select>
    {#if selectedExam}
      <div class="rounded-lg border border-border bg-muted/20 p-4 text-sm space-y-1">
        <p class="font-medium">{selectedExam.title}</p>
        <p class="text-muted-foreground">{selectedExam.className} • {selectedExam.examType}</p>
        <p class="text-muted-foreground">{selectedExam.examDate} • {selectedExam.startTime} - {selectedExam.endTime}</p>
      </div>
    {/if}
  </div>

  <div class="stat-card p-6">
    <div class="flex items-center justify-between gap-4 mb-4">
      <h3 class="text-lg font-semibold">Student Wise Marks</h3>
      <div class="flex gap-2">
        <button onclick={downloadMarks} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          disabled={downloading || !selectedExamId || students.length === 0}>
          {downloading ? 'Preparing...' : 'Download CSV'}
        </button>
        <button onclick={saveMarks} class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          disabled={saving || !selectedExamId || students.length === 0}>
          {saving ? 'Saving...' : 'Save Marks'}
        </button>
      </div>
    </div>

    {#if loadingExams}
      <p class="text-gray-500">Loading completed exams...</p>
    {:else if error}
      <p class="text-red-600">{error}</p>
    {:else if exams.length === 0}
      <p class="text-gray-500">No completed exams are available yet. Scheduled exams appear here after they finish.</p>
    {:else if !selectedExamId}
      <p class="text-gray-500">Select an exam to enter marks.</p>
    {:else if loadingStudents}
      <p class="text-gray-500">Loading students...</p>
    {:else if students.length === 0}
      <p class="text-gray-500">No students found for this exam class.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full border">
          <thead>
            <tr class="bg-gray-100">
              <th class="p-2 text-left">Roll No</th>
              <th class="p-2 text-left">Student</th>
              <th class="p-2 text-left">Email</th>
              <th class="p-2 text-left">Obtained Marks</th>
              <th class="p-2 text-left">Max Marks</th>
              <th class="p-2 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {#each students as student (student.studentId)}
              <tr class="border-t">
                <td class="p-2">{student.rollNumber}</td>
                <td class="p-2 font-medium">{student.name}</td>
                <td class="p-2 text-sm text-gray-600">{student.email}</td>
                <td class="p-2">
                  <input type="number" min="0" class="border rounded p-2 w-28"
                    value={student.obtainedMarks}
                    oninput={e => updateStudentMark(student.studentId, 'obtainedMarks', (e.target as HTMLInputElement).value)} />
                </td>
                <td class="p-2">
                  <input type="number" min="1" class="border rounded p-2 w-28"
                    value={student.maxMarks}
                    oninput={e => updateStudentMark(student.studentId, 'maxMarks', (e.target as HTMLInputElement).value)} />
                </td>
                <td class="p-2">
                  <input type="text" placeholder="Remarks" class="border rounded p-2 w-full min-w-[180px]"
                    value={student.remarks}
                    oninput={e => updateStudentMark(student.studentId, 'remarks', (e.target as HTMLInputElement).value)} />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

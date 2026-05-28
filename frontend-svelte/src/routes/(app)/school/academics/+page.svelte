<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    ArrowLeft, BookMarked, BookOpen, CheckCircle2, ChevronDown, ChevronRight,
    Clock, FileText, Globe, GraduationCap, LayoutGrid, Link2, Paperclip,
    Plus, Send, Star, Trash2, Users, X,
  } from 'lucide-svelte';

  type ClassItem = {
    _id: string; name: string; section?: string; stream?: string; academicYear?: string;
    classCode?: string; meetLink?: string;
    classTeacher?: { _id: string; name: string; email: string; position: string } | null;
    assignedTeachers?: { _id: string; name: string; email: string; position: string }[];
    studentCount?: number;
  };
  type Subject = { _id: string; schoolId: string; classId: string; name: string; code: string; description: string; teacherId?: { _id: string; name: string } | null; isActive: boolean; createdAt: string };
  type Assignment = {
    _id: string; schoolId: string; classId: string; className: string; subject: string;
    title: string; instructions: string; dueDate: string | null; totalPoints: number;
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'; teacherId: { _id: string; name: string } | string;
    submissionsTotal: number; submissionsGraded: number; createdAt: string;
  };
  type AssignmentSubmission = {
    _id: string; assignmentId: string;
    studentId: { _id: string; name: string; rollNumber: string; classSection?: string };
    content: string; status: 'SUBMITTED' | 'GRADED' | 'RETURNED';
    submittedAt: string; gradePoints: number | null; gradeComment: string;
  };
  type StudyMaterial = {
    _id: string; schoolId: string; classId: string; subjectId?: { _id: string; name: string } | null;
    teacherId: { _id: string; name: string } | string; title: string; description: string;
    type: 'FILE' | 'LINK' | 'VIDEO' | 'DOCUMENT' | 'OTHER'; url: string; fileName: string; createdAt: string;
  };

  const STATUS_COLOR: Record<string, string> = {
    PUBLISHED: 'bg-green-100 text-green-700',
    DRAFT: 'bg-slate-100 text-slate-600',
    CLOSED: 'bg-red-100 text-red-600',
  };

  const MATERIAL_ICON: Record<string, string> = { FILE: '📎', LINK: '🔗', VIDEO: '🎬', DOCUMENT: '📄', OTHER: '📦' };

  function fmt(date: string | null) {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function isPast(date: string | null) { return !!date && new Date(date) < new Date(); }

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');

  // ─── Main navigation ───
  let classes = $state<ClassItem[]>([]);
  let loading = $state(true);
  let selectedClass = $state<ClassItem | null>(null);

  const currentAcademicYear = $derived(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 4 ? `${y}–${(y + 1).toString().slice(2)}` : `${y - 1}–${y.toString().slice(2)}`;
  });

  onMount(async () => {
    if (!schoolId) { loading = false; return; }
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      const data = await res.json();
      classes = Array.isArray(data) ? data : (data.data ?? []);
    } catch { /* ignore */ }
    loading = false;
  });

  // ─── Workspace tab ───
  type WorkspaceTab = 'overview' | 'subjects' | 'assignments' | 'materials';
  let workspaceTab = $state<WorkspaceTab>('overview');
  let codeCopied = $state(false);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    codeCopied = true;
    setTimeout(() => (codeCopied = false), 2000);
  }

  // ─── Subjects ───
  let subjects = $state<Subject[]>([]);
  let subjectsLoading = $state(false);
  let showSubjectForm = $state(false);
  let subjectForm = $state({ name: '', code: '', description: '' });
  let subjectSaving = $state(false);
  let subjectError = $state('');

  async function loadSubjects(classId: string) {
    subjectsLoading = true;
    try {
      const res = await fetch(`/api/subjects?schoolId=${schoolId}&classId=${classId}`);
      const data = await res.json();
      subjects = data.data ?? [];
    } catch { subjects = []; }
    subjectsLoading = false;
  }

  async function createSubject(classId: string) {
    if (!subjectForm.name.trim()) { subjectError = 'Name required'; return; }
    subjectSaving = true; subjectError = '';
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, classId, ...subjectForm }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Failed');
      subjectForm = { name: '', code: '', description: '' };
      showSubjectForm = false;
      await loadSubjects(classId);
    } catch (err) { subjectError = err instanceof Error ? err.message : 'Failed'; }
    subjectSaving = false;
  }

  async function deleteSubject(id: string, classId: string) {
    if (!confirm('Delete this subject?')) return;
    await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    await loadSubjects(classId);
  }

  // ─── Assignments ───
  type AssignmentView = 'list' | 'create' | 'detail';
  let assignments = $state<Assignment[]>([]);
  let assignmentsLoading = $state(false);
  let assignmentView = $state<AssignmentView>('list');
  let selectedAssignment = $state<Assignment | null>(null);
  let submissions = $state<AssignmentSubmission[]>([]);
  let submissionsPending = $state<{ student: { _id: string; name: string; rollNumber: string }; status: string }[]>([]);
  let assignmentSubTab = $state<'instructions' | 'submissions'>('instructions');
  let grading = $state<{ sub: AssignmentSubmission; points: string; comment: string } | null>(null);
  let gradeSaving = $state(false);
  let gradeError = $state('');
  let assignmentForm = $state({ subject: '', title: '', instructions: '', dueDate: '', totalPoints: 100, status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT' });
  let assignmentSaving = $state(false);
  let assignmentError = $state('');

  async function loadAssignments(classId: string) {
    assignmentsLoading = true;
    try {
      const res = await fetch(`/api/assignments?schoolId=${schoolId}&classId=${classId}`);
      const data = await res.json();
      assignments = data.data ?? [];
    } catch { assignments = []; }
    assignmentsLoading = false;
  }

  async function loadSubmissions(assignmentId: string) {
    const res = await fetch(`/api/assignments/${assignmentId}/submissions`);
    const data = await res.json();
    submissions = data.data?.submissions ?? [];
    submissionsPending = data.data?.pending ?? [];
  }

  async function createAssignment(classId: string, className: string) {
    if (!assignmentForm.title.trim()) { assignmentError = 'Title required'; return; }
    assignmentSaving = true; assignmentError = '';
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, classId, className, ...assignmentForm, teacherId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Failed');
      assignmentForm = { subject: '', title: '', instructions: '', dueDate: '', totalPoints: 100, status: 'PUBLISHED' };
      assignmentView = 'list';
      await loadAssignments(classId);
    } catch (err) { assignmentError = err instanceof Error ? err.message : 'Failed'; }
    assignmentSaving = false;
  }

  async function deleteAssignment(id: string, classId: string) {
    if (!confirm('Delete this assignment?')) return;
    await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
    selectedAssignment = null; assignmentView = 'list';
    await loadAssignments(classId);
  }

  async function gradeSubmission(assignmentId: string) {
    if (!grading) return;
    const pts = Number(grading.points);
    if (isNaN(pts) || pts < 0) { gradeError = 'Invalid points'; return; }
    gradeSaving = true; gradeError = '';
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/grade/${grading.sub._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradePoints: pts, gradeComment: grading.comment, gradedBy: teacherId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Failed');
      grading = null;
      await loadSubmissions(assignmentId);
    } catch (err) { gradeError = err instanceof Error ? err.message : 'Failed'; }
    gradeSaving = false;
  }

  // ─── Materials ───
  let materials = $state<StudyMaterial[]>([]);
  let materialsLoading = $state(false);
  let showMaterialForm = $state(false);
  let materialForm = $state({ title: '', description: '', type: 'LINK' as StudyMaterial['type'], url: '' });
  let materialSaving = $state(false);
  let materialError = $state('');

  async function loadMaterials(classId: string) {
    materialsLoading = true;
    try {
      const res = await fetch(`/api/materials?schoolId=${schoolId}&classId=${classId}`);
      const data = await res.json();
      materials = data.data ?? [];
    } catch { materials = []; }
    materialsLoading = false;
  }

  async function createMaterial(classId: string) {
    if (!materialForm.title.trim()) { materialError = 'Title required'; return; }
    materialSaving = true; materialError = '';
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, classId, teacherId, ...materialForm }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Failed');
      materialForm = { title: '', description: '', type: 'LINK', url: '' };
      showMaterialForm = false;
      await loadMaterials(classId);
    } catch (err) { materialError = err instanceof Error ? err.message : 'Failed'; }
    materialSaving = false;
  }

  async function deleteMaterial(id: string, classId: string) {
    if (!confirm('Delete this material?')) return;
    await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    await loadMaterials(classId);
  }

  function selectClass(cls: ClassItem) {
    selectedClass = cls;
    workspaceTab = 'overview';
    loadSubjects(cls._id);
    loadAssignments(cls._id);
    loadMaterials(cls._id);
  }

  $effect(() => {
    if (workspaceTab === 'subjects' && selectedClass) loadSubjects(selectedClass._id);
    if (workspaceTab === 'assignments' && selectedClass) loadAssignments(selectedClass._id);
    if (workspaceTab === 'materials' && selectedClass) loadMaterials(selectedClass._id);
  });

  $effect(() => {
    if (selectedAssignment && assignmentSubTab === 'submissions') loadSubmissions(selectedAssignment._id);
  });

  const classLabel = $derived(selectedClass ? `${selectedClass.name}${selectedClass.section ? ` — ${selectedClass.section}` : ''}` : '');
</script>

<svelte:head><title>Academics — ERP Portal</title></svelte:head>

<div class="space-y-6">
  {#if !selectedClass}
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <LayoutGrid class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-slate-900">Academics</h2>
          <p class="text-xs text-slate-500">Classes · Subjects · Assignments · Materials</p>
        </div>
      </div>
      <span class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">AY {currentAcademicYear()}</span>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-blue-500"><GraduationCap class="h-4 w-4" /> Total Classes</div>
        <p class="mt-2 text-3xl font-bold text-slate-900">{classes.length}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-green-500"><Users class="h-4 w-4" /> Total Students</div>
        <p class="mt-2 text-3xl font-bold text-slate-900">{classes.reduce((s, c) => s + (c.studentCount ?? 0), 0)}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-indigo-500"><BookOpen class="h-4 w-4" /> Teachers</div>
        <p class="mt-2 text-3xl font-bold text-slate-900">{new Set(classes.flatMap(c => [c.classTeacher?._id, ...(c.assignedTeachers?.map(t => t._id) ?? [])].filter(Boolean))).size}</p>
      </div>
    </div>

    {#if loading}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {#each [0,1,2,3,4,5] as _}<div class="h-36 rounded-2xl bg-slate-100"></div>{/each}
      </div>
    {:else if classes.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
        <GraduationCap class="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p class="text-sm text-slate-500">No classes found. Create classes in the Classes module first.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each classes as cls}
          <button
            onclick={() => selectClass(cls)}
            class="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div class="flex items-start justify-between">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl text-white font-bold shadow-sm">
                {(cls.name ?? 'C')[0]}
              </div>
              <ChevronRight class="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <div class="mt-3">
              <p class="font-bold text-slate-900">{cls.name}{cls.section ? ` — ${cls.section}` : ''}</p>
              {#if cls.stream}<p class="text-xs text-slate-500">{cls.stream}</p>{/if}
              {#if cls.academicYear}<p class="text-xs text-slate-400">{cls.academicYear}</p>{/if}
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-3 text-xs text-slate-500">
                <span class="flex items-center gap-1"><Users class="h-3.5 w-3.5" /> {cls.studentCount ?? 0} students</span>
                {#if cls.classTeacher}
                  <span class="flex items-center gap-1"><GraduationCap class="h-3.5 w-3.5" /> {cls.classTeacher.name}</span>
                {/if}
              </div>
              {#if cls.classCode}
                <span class="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-indigo-600">{cls.classCode}</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="space-y-5">
      <div class="flex items-center gap-3">
        <button onclick={() => (selectedClass = null)} class="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft class="h-5 w-5 text-slate-500" />
        </button>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
          {selectedClass.name[0]}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-xl font-bold text-slate-900">{classLabel}</h2>
            {#if selectedClass.classCode}
              <button
                onclick={() => copyCode(selectedClass!.classCode!)}
                class="rounded-lg border px-2.5 py-0.5 font-mono text-sm font-bold tracking-widest transition-colors {codeCopied ? 'border-green-300 bg-green-50 text-green-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}"
              >{codeCopied ? 'Copied!' : selectedClass.classCode}</button>
            {/if}
          </div>
          <p class="text-xs text-slate-500">{selectedClass.stream ?? 'General'}{selectedClass.academicYear ? ` · ${selectedClass.academicYear}` : ''}</p>
        </div>
      </div>

      <div class="flex border-b border-slate-200">
        {#each (['overview','subjects','assignments','materials'] as const) as tab}
          <button onclick={() => (workspaceTab = tab)}
            class="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize {workspaceTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
            {tab}
          </button>
        {/each}
      </div>

      {#if workspaceTab === 'overview'}
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-blue-500"><Users class="h-4 w-4" /> Students</div>
              <p class="mt-2 text-xl font-bold text-slate-900">{selectedClass.studentCount ?? 0}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-indigo-500"><GraduationCap class="h-4 w-4" /> Teachers</div>
              <p class="mt-2 text-xl font-bold text-slate-900">{(selectedClass.assignedTeachers?.length ?? 0) + (selectedClass.classTeacher ? 1 : 0)}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-green-500"><BookOpen class="h-4 w-4" /> Academic Year</div>
              <p class="mt-2 text-xl font-bold text-slate-900">{selectedClass.academicYear ?? '—'}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-amber-500"><BookMarked class="h-4 w-4" /> Stream</div>
              <p class="mt-2 text-xl font-bold text-slate-900">{selectedClass.stream ?? 'General'}</p>
            </div>
          </div>
          {#if selectedClass.classTeacher}
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Class Teacher</p>
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">{selectedClass.classTeacher.name[0]}</div>
                <div>
                  <p class="text-sm font-semibold text-slate-800">{selectedClass.classTeacher.name}</p>
                  <p class="text-xs text-slate-400">{selectedClass.classTeacher.position}</p>
                </div>
              </div>
            </div>
          {/if}
          {#if selectedClass.meetLink}
            <div class="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">Meet Link</p>
              <a href={selectedClass.meetLink} target="_blank" rel="noreferrer" class="flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">
                <Globe class="h-4 w-4" /> {selectedClass.meetLink}
              </a>
            </div>
          {/if}
        </div>
      {/if}

      {#if workspaceTab === 'subjects'}
        {@const classId = selectedClass._id}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-700">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
            <button onclick={() => (showSubjectForm = !showSubjectForm)} class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus class="h-4 w-4" /> Add Subject
            </button>
          </div>

          {#if showSubjectForm}
            <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
              {#if subjectError}<p class="text-xs text-red-600">{subjectError}</p>{/if}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="subject-name" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject Name *</label>
                  <input id="subject-name" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="e.g. Mathematics" bind:value={subjectForm.name} />
                </div>
                <div>
                  <label for="subject-code" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Code</label>
                  <input id="subject-code" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="e.g. MATH10" bind:value={subjectForm.code} />
                </div>
              </div>
              <input class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Description (optional)" bind:value={subjectForm.description} />
              <div class="flex justify-end gap-2">
                <button onclick={() => (showSubjectForm = false)} class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button onclick={() => createSubject(classId)} disabled={subjectSaving} class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{subjectSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          {/if}

          {#if subjectsLoading}
            <div class="animate-pulse space-y-2">{#each [0,1,2] as _}<div class="h-14 rounded-xl bg-slate-100"></div>{/each}</div>
          {:else if subjects.length === 0}
            <div class="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No subjects yet. Add subjects for this class.</div>
          {:else}
            <div class="space-y-2">
              {#each subjects as s}
                <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600">{s.name[0]}</div>
                    <div>
                      <p class="text-sm font-semibold text-slate-800">{s.name}</p>
                      <p class="text-xs text-slate-400">
                        {#if s.code}<span class="mr-2">{s.code}</span>{/if}
                        {#if s.teacherId}{(s.teacherId as { name: string }).name}{/if}
                      </p>
                    </div>
                  </div>
                  <button onclick={() => deleteSubject(s._id, classId)} class="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 class="h-4 w-4" /></button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if workspaceTab === 'assignments'}
        {@const classId = selectedClass._id}
        {@const className = selectedClass.name + (selectedClass.section ? ` - ${selectedClass.section}` : '')}

        {#if assignmentView === 'list'}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-slate-700">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
              <button onclick={() => (assignmentView = 'create')} class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus class="h-4 w-4" /> Create
              </button>
            </div>
            {#if assignmentsLoading}
              <div class="animate-pulse space-y-2">{#each [0,1,2] as _}<div class="h-20 rounded-2xl bg-slate-100"></div>{/each}</div>
            {:else if assignments.length === 0}
              <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">No assignments. Click "Create" to add one.</div>
            {:else}
              <div class="space-y-3">
                {#each assignments as a}
                  <button onclick={() => { selectedAssignment = a; assignmentSubTab = 'instructions'; assignmentView = 'detail'; }} class="group w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all text-left">
                    <div class="flex items-start justify-between">
                      <div class="flex items-start gap-3">
                        <div class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50"><FileText class="h-4 w-4 text-blue-600" /></div>
                        <div>
                          <p class="font-semibold text-slate-900 group-hover:text-blue-600">{a.title}</p>
                          {#if a.subject}<p class="text-xs text-slate-500">{a.subject}</p>{/if}
                        </div>
                      </div>
                      <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium {STATUS_COLOR[a.status] ?? ''}">{a.status}</span>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span class="flex items-center gap-1 {isPast(a.dueDate) && a.status !== 'CLOSED' ? 'text-red-500 font-medium' : ''}"><Clock class="h-3.5 w-3.5" /> {fmt(a.dueDate)}</span>
                      <span class="flex items-center gap-1"><Star class="h-3.5 w-3.5 text-amber-400" /> {a.totalPoints} pts</span>
                      <span class="flex items-center gap-1"><Users class="h-3.5 w-3.5" /> {a.submissionsTotal} submitted</span>
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>

        {:else if assignmentView === 'create'}
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <button onclick={() => (assignmentView = 'list')} class="rounded-lg p-1.5 hover:bg-slate-100"><ArrowLeft class="h-5 w-5 text-slate-500" /></button>
              <h3 class="font-bold text-slate-900">New Assignment</h3>
            </div>
            {#if assignmentError}<p class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{assignmentError}</p>{/if}
            <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="assignment-title" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</label>
                  <input id="assignment-title" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Assignment title" bind:value={assignmentForm.title} />
                </div>
                <div>
                  <label for="assignment-subject" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</label>
                  <input id="assignment-subject" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="e.g. Mathematics" bind:value={assignmentForm.subject} />
                </div>
              </div>
              <div>
                <label for="assignment-instructions" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Instructions</label>
                <textarea id="assignment-instructions" rows={4} class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="What students need to do..." bind:value={assignmentForm.instructions}></textarea>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label for="assignment-due-date" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
                  <input id="assignment-due-date" type="date" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={assignmentForm.dueDate} />
                </div>
                <div>
                  <label for="assignment-points" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Points</label>
                  <input id="assignment-points" type="number" min={1} class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={assignmentForm.totalPoints} />
                </div>
                <div>
                  <label for="assignment-status" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                  <select id="assignment-status" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={assignmentForm.status}>
                    <option value="PUBLISHED">Publish</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
              </div>
              <div class="flex justify-end gap-2 pt-1">
                <button onclick={() => (assignmentView = 'list')} class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button onclick={() => createAssignment(classId, className)} disabled={assignmentSaving} class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  <Send class="h-4 w-4" /> {assignmentSaving ? 'Creating...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>

        {:else if assignmentView === 'detail' && selectedAssignment}
          {@const a = selectedAssignment}
          <div class="space-y-4">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <button onclick={() => { assignmentView = 'list'; selectedAssignment = null; }} class="rounded-lg p-1.5 hover:bg-slate-100"><ArrowLeft class="h-5 w-5 text-slate-500" /></button>
                <div>
                  <p class="font-bold text-slate-900">{a.title}</p>
                  {#if a.subject}<p class="text-xs text-slate-500">{a.subject}</p>{/if}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium {STATUS_COLOR[a.status] ?? ''}">{a.status}</span>
                <button onclick={() => deleteAssignment(a._id, classId)} class="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 class="h-4 w-4" /></button>
              </div>
            </div>

            <div class="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
              <span class="flex items-center gap-1 {isPast(a.dueDate) ? 'text-red-600 font-medium' : ''}"><Clock class="h-3.5 w-3.5" /> Due: {fmt(a.dueDate)}</span>
              <span class="flex items-center gap-1"><Star class="h-3.5 w-3.5 text-amber-400" /> {a.totalPoints} pts</span>
              <span class="flex items-center gap-1"><Users class="h-3.5 w-3.5" /> {a.submissionsTotal} submitted · {a.submissionsGraded} graded</span>
            </div>

            <div class="flex border-b border-slate-200">
              {#each (['instructions','submissions'] as const) as t}
                <button onclick={() => (assignmentSubTab = t)} class="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize {assignmentSubTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">{t}</button>
              {/each}
            </div>

            {#if assignmentSubTab === 'instructions'}
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {#if a.instructions}
                  <p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.instructions}</p>
                {:else}
                  <p class="text-sm italic text-slate-400">No instructions provided.</p>
                {/if}
              </div>
            {/if}

            {#if assignmentSubTab === 'submissions'}
              <div class="space-y-2">
                {#each submissions as sub}
                  <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div class="flex items-center gap-3">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">{sub.studentId.name?.[0]}</div>
                      <div>
                        <p class="text-sm font-medium text-slate-800">{sub.studentId.name}</p>
                        <p class="text-xs text-slate-400">Roll: {sub.studentId.rollNumber}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      {#if sub.status === 'GRADED'}<span class="text-sm font-semibold text-green-700">{sub.gradePoints}/{a.totalPoints}</span>{/if}
                      <button onclick={() => (grading = { sub, points: String(sub.gradePoints ?? ''), comment: sub.gradeComment ?? '' })} class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600">
                        {sub.status === 'GRADED' ? 'Re-grade' : 'Grade'}
                      </button>
                    </div>
                  </div>
                {/each}
                {#each submissionsPending as { student }}
                  <div class="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-400">{student.name?.[0]}</div>
                      <p class="text-sm text-slate-600">{student.name}</p>
                    </div>
                    <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">Not submitted</span>
                  </div>
                {/each}
                {#if submissions.length === 0 && submissionsPending.length === 0}
                  <div class="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No submissions yet.</div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      {/if}

      {#if workspaceTab === 'materials'}
        {@const classId = selectedClass._id}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-700">{materials.length} material{materials.length !== 1 ? 's' : ''}</p>
            <button onclick={() => (showMaterialForm = !showMaterialForm)} class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus class="h-4 w-4" /> Add Material
            </button>
          </div>

          {#if showMaterialForm}
            <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
              {#if materialError}<p class="text-xs text-red-600">{materialError}</p>{/if}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="material-title" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</label>
                  <input id="material-title" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Material title" bind:value={materialForm.title} />
                </div>
                <div>
                  <label for="material-type" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</label>
                  <select id="material-type" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={materialForm.type}>
                    {#each (['LINK','VIDEO','DOCUMENT','FILE','OTHER'] as const) as t}<option value={t}>{t}</option>{/each}
                  </select>
                </div>
              </div>
              <input class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="URL (optional)" bind:value={materialForm.url} />
              <input class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Description (optional)" bind:value={materialForm.description} />
              <div class="flex justify-end gap-2">
                <button onclick={() => (showMaterialForm = false)} class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button onclick={() => createMaterial(classId)} disabled={materialSaving} class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{materialSaving ? 'Saving...' : 'Add'}</button>
              </div>
            </div>
          {/if}

          {#if materialsLoading}
            <div class="animate-pulse space-y-2">{#each [0,1,2] as _}<div class="h-14 rounded-xl bg-slate-100"></div>{/each}</div>
          {:else if materials.length === 0}
            <div class="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No materials yet.</div>
          {:else}
            <div class="space-y-2">
              {#each materials as m}
                <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                  <div class="flex items-center gap-3">
                    <span class="text-xl">{MATERIAL_ICON[m.type] ?? '📦'}</span>
                    <div>
                      <p class="text-sm font-semibold text-slate-800">{m.title}</p>
                      <p class="text-xs text-slate-400">{m.type}{(m.subjectId as { name: string } | null)?.name ? ` · ${(m.subjectId as { name: string }).name}` : ''}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    {#if m.url}
                      <a href={m.url} target="_blank" rel="noreferrer" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50">Open</a>
                    {/if}
                    <button onclick={() => deleteMaterial(m._id, classId)} class="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 class="h-4 w-4" /></button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if grading && selectedAssignment}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-slate-900">Grade — {grading.sub.studentId.name}</h3>
        <button onclick={() => (grading = null)} class="rounded-lg p-1 hover:bg-slate-100"><X class="h-4 w-4" /></button>
      </div>
      {#if grading.sub.content}
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 max-h-28 overflow-y-auto">{grading.sub.content}</div>
      {/if}
      {#if gradeError}<p class="text-xs text-red-600">{gradeError}</p>{/if}
      <div>
        <label for="grade-points" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Points (max {selectedAssignment.totalPoints})</label>
        <input id="grade-points" type="number" min={0} max={selectedAssignment.totalPoints} class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={grading.points} />
      </div>
      <div>
        <label for="grade-comment" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Comment</label>
        <textarea id="grade-comment" rows={3} class="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={grading.comment}></textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button onclick={() => (grading = null)} class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
        <button onclick={() => gradeSubmission(selectedAssignment!._id)} disabled={gradeSaving} class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <CheckCircle2 class="h-4 w-4" /> {gradeSaving ? 'Saving...' : 'Save Grade'}
        </button>
      </div>
    </div>
  </div>
{/if}

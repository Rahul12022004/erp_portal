<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import {
    ArrowLeft, BookMarked, BookOpen, CheckCircle2, ChevronDown, ChevronRight,
    Clock, FileText, Globe, GraduationCap, LayoutGrid, MessageSquare,
    Plus, Send, Star, Trash2, Users, X, Layers,
  } from 'lucide-svelte';

  // ─── Types ────────────────────────────────────────────────────────────────────
  type ClassItem = {
    _id: string; name: string; section?: string; stream?: string; academicYear?: string;
    classCode?: string; meetLink?: string;
    classTeacher?: { _id: string; name: string; email: string; position: string } | null;
    assignedTeachers?: { _id: string; name: string; email: string; position: string }[];
    studentCount?: number;
  };
  type ClassGroup = { name: string; sections: ClassItem[] };
  type Subject = {
    _id: string; schoolId: string; classId: string; name: string; code: string;
    description: string; teacherId?: { _id: string; name: string } | null; createdAt: string;
  };
  type Assignment = {
    _id: string; schoolId: string; classId: string; className: string; subject: string;
    title: string; instructions: string; dueDate: string | null; totalPoints: number;
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    submissionsTotal: number; submissionsGraded: number; createdAt: string;
  };
  type AssignmentSubmission = {
    _id: string; assignmentId: string;
    studentId: { _id: string; name: string; rollNumber: string };
    content: string; status: 'SUBMITTED' | 'GRADED' | 'RETURNED';
    gradePoints: number | null; gradeComment: string;
  };
  type StudyMaterial = {
    _id: string; schoolId: string; classId: string;
    title: string; description: string;
    type: 'FILE' | 'LINK' | 'VIDEO' | 'DOCUMENT' | 'OTHER'; url: string; createdAt: string;
  };
  type StudentRow = {
    _id: string; name: string; rollNumber: string; email: string;
    gender: string; status: string; admissionNumber: string; photo: string;
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const STATUS_COLOR: Record<string, string> = {
    PUBLISHED: 'bg-green-100 text-green-700',
    DRAFT: 'bg-slate-100 text-slate-600',
    CLOSED: 'bg-red-100 text-red-600',
  };
  const MATERIAL_ICON: Record<string, string> = { FILE: '📎', LINK: '🔗', VIDEO: '🎬', DOCUMENT: '📄', OTHER: '📦' };
  const SUBJECT_GRADIENTS = [
    'from-blue-400 to-blue-600', 'from-violet-400 to-violet-600',
    'from-emerald-400 to-emerald-600', 'from-orange-400 to-orange-600',
    'from-pink-400 to-pink-600', 'from-teal-400 to-teal-600',
    'from-red-400 to-red-600', 'from-indigo-400 to-indigo-600',
    'from-amber-400 to-amber-600', 'from-cyan-400 to-cyan-600',
  ];
  const BG_COLORS = ['b5ead7','ffdac1','ff9aa2','c7ceea','f2c4ce','b8e0d2','d4a5c9','a8d8ea'];

  function fmt(d: string | null) {
    if (!d) return 'No due date';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function isPast(d: string | null) { return !!d && new Date(d) < new Date(); }

  function subjectGradient(name: string) {
    return SUBJECT_GRADIENTS[(name?.charCodeAt(0) ?? 0) % SUBJECT_GRADIENTS.length];
  }

  const CARD_COLORS = [
    { bg: 'bg-[#1a73e8]', from: 'from-[#1a73e8] to-[#1557b0]' },   // Google blue
    { bg: 'bg-[#1e8e3e]', from: 'from-[#1e8e3e] to-[#15692a]' },   // green
    { bg: 'bg-[#7627bb]', from: 'from-[#7627bb] to-[#5a1d8e]' },   // purple
    { bg: 'bg-[#c5221f]', from: 'from-[#c5221f] to-[#a51913]' },   // red
    { bg: 'bg-[#b46300]', from: 'from-[#b46300] to-[#8a4c00]' },   // amber
    { bg: 'bg-[#0f9d9f]', from: 'from-[#0f9d9f] to-[#08747a]' },  // teal
    { bg: 'bg-[#4a148c]', from: 'from-[#4a148c] to-[#360d69]' },  // deep purple
    { bg: 'bg-[#37474f]', from: 'from-[#37474f] to-[#263238]' },  // slate
  ];
  const AVATAR_COLORS = ['bg-indigo-500','bg-violet-500','bg-pink-500','bg-emerald-500','bg-orange-500','bg-cyan-600','bg-rose-500','bg-teal-600'];

  function cardColor(name: string) {
    const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return CARD_COLORS[h % CARD_COLORS.length];
  }
  function avatarColor(name: string) {
    const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  function studentAvatar(s: StudentRow): string {
    if (s.photo) return s.photo;
    const female = s.gender?.toLowerCase() === 'female' || s.gender?.toLowerCase() === 'f';
    const seed = encodeURIComponent(`${female ? 'f' : 'm'}_${s._id || s.name}`);
    const bg = BG_COLORS[(s._id?.length ?? s.name?.length ?? 0) % BG_COLORS.length];
    return `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=${bg}&radius=50`;
  }

  // ─── Auth / derived ───────────────────────────────────────────────────────────
  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');
  const userName = $derived(($page.data.user as any)?.name ?? ($page.data.user as any)?.firstName ?? '');
  const currentAcademicYear = $derived.by(() => {
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth() + 1;
    return m >= 4 ? `${y}–${(y+1).toString().slice(2)}` : `${y-1}–${y.toString().slice(2)}`;
  });

  // ─── Class list ───────────────────────────────────────────────────────────────
  let classes = $state<ClassItem[]>([]);
  let loading = $state(true);

  const groupedClasses = $derived.by((): ClassGroup[] => {
    const map = new Map<string, ClassItem[]>();
    for (const cls of classes) {
      const key = cls.name.trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cls);
    }
    return [...map.entries()].map(([name, sections]) => ({ name, sections }));
  });

  onMount(async () => {
    if (!schoolId) { loading = false; return; }
    try {
      const data = await api.get<any>(`/api/classes?schoolId=${schoolId}`);
      classes = Array.isArray(data) ? data : (data.data ?? []);
    } catch { /* ignore */ }
    loading = false;
  });

  // ─── Navigation state ─────────────────────────────────────────────────────────
  // null,null → class list
  // group set, class null → class group workspace
  // class set → section workspace
  let selectedGroup = $state<ClassGroup | null>(null);
  let selectedClass = $state<ClassItem | null>(null);
  let selectedSubject = $state<Subject | null>(null);
  let subjectTab = $state<'assignments' | 'materials'>('assignments');
  let subjectDetailTab = $state<'stream' | 'classwork' | 'people'>('stream');
  let subjectStudents = $state<StudentRow[]>([]);
  let subjectStudentsLoading = $state(false);
  let subjectStudentsLoaded = $state('');
  let codeCopied = $state(false);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code); codeCopied = true;
    setTimeout(() => (codeCopied = false), 2000);
  }

  function openGroup(group: ClassGroup) {
    selectedGroup = group;
    selectedClass = null;
    selectedSubject = null;
    groupSubjects = []; groupAssignments = []; groupMaterials = [];
    groupSubjectsLoading = false; groupAssignmentsLoading = false; groupMaterialsLoading = false;
    groupSubjectsLoaded = false; groupAssignmentsLoaded = false; groupMaterialsLoaded = false;
    showGroupSubjectForm = false;
  }

  async function loadSubjectStudents(classId: string) {
    subjectStudentsLoading = true;
    try {
      const data = await api.get<any>(`/api/students/${schoolId}?classId=${classId}&limit=200`);
      subjectStudents = data.data?.students ?? [];
    } catch { subjectStudents = []; }
    subjectStudentsLoading = false;
  }

  let subjectClassworkView = $state<'list' | 'create-assignment' | 'create-material'>('list');
  let subjectAssignmentForm = $state({ title: '', instructions: '', dueDate: '', totalPoints: 100, status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT' });
  let subjectAssignmentSaving = $state(false);
  let subjectAssignmentError = $state('');
  let subjectMaterialForm = $state({ title: '', description: '', type: 'LINK' as StudyMaterial['type'], url: '' });
  let subjectMaterialSaving = $state(false);
  let subjectMaterialError = $state('');

  async function createSubjectAssignment() {
    if (!selectedSubject || !selectedGroup) return;
    if (!subjectAssignmentForm.title.trim()) { subjectAssignmentError = 'Title required'; return; }
    subjectAssignmentSaving = true; subjectAssignmentError = '';
    try {
      await api.post('/api/assignments', { schoolId, classId: selectedSubject.classId, className: selectedGroup.name, subject: selectedSubject.name, ...subjectAssignmentForm, teacherId });
      subjectAssignmentForm = { title: '', instructions: '', dueDate: '', totalPoints: 100, status: 'PUBLISHED' };
      subjectClassworkView = 'list';
      await loadGroupAssignments(selectedGroup);
    } catch (err) { subjectAssignmentError = err instanceof Error ? err.message : 'Failed'; }
    subjectAssignmentSaving = false;
  }

  async function createSubjectMaterial() {
    if (!selectedSubject || !selectedGroup) return;
    if (!subjectMaterialForm.title.trim()) { subjectMaterialError = 'Title required'; return; }
    subjectMaterialSaving = true; subjectMaterialError = '';
    try {
      await api.post('/api/materials', { schoolId, classId: selectedSubject.classId, teacherId, ...subjectMaterialForm });
      subjectMaterialForm = { title: '', description: '', type: 'LINK', url: '' };
      subjectClassworkView = 'list';
      await loadGroupMaterials(selectedGroup);
    } catch (err) { subjectMaterialError = err instanceof Error ? err.message : 'Failed'; }
    subjectMaterialSaving = false;
  }

  function openSubject(subject: Subject) {
    selectedSubject = subject;
    subjectDetailTab = 'stream';
    subjectTab = 'assignments';
    subjectClassworkView = 'list';
    subjectStudents = [];
    subjectStudentsLoaded = '';
    const grp = selectedGroup;
    if (grp) {
      if (!groupAssignmentsLoaded && !groupAssignmentsLoading) loadGroupAssignments(grp);
      if (!groupMaterialsLoaded && !groupMaterialsLoading) loadGroupMaterials(grp);
    }
  }

  function openSection(cls: ClassItem) {
    selectedClass = cls;
    workspaceTab = 'stream';
    assignmentView = 'list';
    classStudents = []; subjects = []; assignments = []; materials = []; classSubjects = [];
    classStudentsLoaded = false; assignmentsLoaded = false; materialsLoaded = false; classSubjectsLoaded = false;
    collapsedTopics = new Set();
  }

  function handleClassCardClick(group: ClassGroup) {
    openGroup(group);
  }

  function goBack() {
    if (selectedClass && selectedGroup) {
      selectedClass = null; // back to group
    } else {
      selectedClass = null; selectedGroup = null; // back to list
    }
  }

  // ─── Class group workspace ────────────────────────────────────────────────────
  type GroupTab = 'sections' | 'subjects' | 'assignments' | 'materials';
  let groupTab = $state<GroupTab>('sections');

  // Subjects are class-level — stored against first section as the canonical classId
  let groupSubjects = $state<Subject[]>([]);
  let groupSubjectsLoading = $state(false);
  let groupSubjectsLoaded = $state(false);
  let showGroupSubjectForm = $state(false);
  let groupSubjectForm = $state({ name: '', code: '', description: '' });
  let groupSubjectSaving = $state(false);
  let groupSubjectError = $state('');

  function groupCanonicalId(group: ClassGroup): string {
    return group.sections[0]?._id ?? '';
  }

  async function loadGroupSubjects(group: ClassGroup) {
    groupSubjectsLoading = true;
    try {
      const data = await api.get<any>(`/api/subjects?schoolId=${schoolId}&classId=${groupCanonicalId(group)}`);
      groupSubjects = data.data ?? [];
    } catch { groupSubjects = []; }
    groupSubjectsLoading = false;
    groupSubjectsLoaded = true;
  }

  async function createGroupSubject(group: ClassGroup) {
    if (!groupSubjectForm.name.trim()) { groupSubjectError = 'Name required'; return; }
    groupSubjectSaving = true; groupSubjectError = '';
    try {
      await api.post('/api/subjects', { schoolId, classId: groupCanonicalId(group), ...groupSubjectForm });
      groupSubjectForm = { name: '', code: '', description: '' };
      showGroupSubjectForm = false;
      await loadGroupSubjects(group);
    } catch (err) { groupSubjectError = err instanceof Error ? err.message : 'Failed'; }
    groupSubjectSaving = false;
  }

  async function deleteGroupSubject(id: string, group: ClassGroup) {
    if (!confirm('Delete this subject?')) return;
    try {
      await api.delete(`/api/subjects/${id}`);
      await loadGroupSubjects(group);
    } catch (err) { groupSubjectError = err instanceof Error ? err.message : 'Delete failed'; }
  }

  let groupAssignments = $state<Assignment[]>([]);
  let groupMaterials = $state<StudyMaterial[]>([]);
  let groupAssignmentsLoading = $state(false);
  let groupMaterialsLoading = $state(false);
  let groupAssignmentsLoaded = $state(false);
  let groupMaterialsLoaded = $state(false);

  async function loadGroupAssignments(group: ClassGroup) {
    const canonId = groupCanonicalId(group);
    if (!canonId) return;
    groupAssignmentsLoading = true;
    try {
      const data = await api.get<any>(`/api/assignments?schoolId=${schoolId}&classId=${canonId}`);
      groupAssignments = data.data ?? [];
    } catch { groupAssignments = []; }
    groupAssignmentsLoading = false;
    groupAssignmentsLoaded = true;
  }

  async function loadGroupMaterials(group: ClassGroup) {
    const canonId = groupCanonicalId(group);
    if (!canonId) return;
    groupMaterialsLoading = true;
    try {
      const data = await api.get<any>(`/api/materials?schoolId=${schoolId}&classId=${canonId}`);
      groupMaterials = data.data ?? [];
    } catch { groupMaterials = []; }
    groupMaterialsLoading = false;
    groupMaterialsLoaded = true;
  }

  $effect(() => {
    if (selectedGroup && !groupSubjectsLoading && !groupSubjectsLoaded) loadGroupSubjects(selectedGroup);
  });

  // ─── Section workspace tab ────────────────────────────────────────────────────
  type WorkspaceTab = 'stream' | 'classwork' | 'people';
  let workspaceTab = $state<WorkspaceTab>('stream');
  // IMPORTANT: always reassign (new Set) to trigger reactivity — never call .add()/.delete() directly
  let collapsedTopics = $state<Set<string>>(new Set());

  $effect(() => {
    if (workspaceTab === 'classwork' && selectedClass && !assignmentsLoading  && !assignmentsLoaded)  loadAssignments(selectedClass._id);
    if (workspaceTab === 'classwork' && selectedClass && !materialsLoading    && !materialsLoaded)    loadMaterials(selectedClass._id);
    if (workspaceTab === 'people'    && selectedClass && !classStudentsLoading && !classStudentsLoaded) loadClassStudents(selectedClass._id);
  });

  function openCreateAssignment() {
    assignmentView = 'create';
    assignmentForm = { subject: '', title: '', instructions: '', dueDate: '', scheduleDate: '', totalPoints: 100, status: 'PUBLISHED' };
    assignmentAttachment = null;
    if (selectedClass && !classSubjectsLoading && !classSubjectsLoaded) loadClassSubjects(selectedClass._id);
  }

  // ─── Students ─────────────────────────────────────────────────────────────────
  let classStudents = $state<StudentRow[]>([]);
  let classStudentsLoading = $state(false);
  let classStudentsLoaded = $state(false);

  async function loadClassStudents(classId: string) {
    classStudentsLoading = true;
    try {
      const data = await api.get<any>(`/api/students/${schoolId}?classId=${classId}&limit=200`);
      classStudents = data.data?.students ?? [];
    } catch { classStudents = []; }
    classStudentsLoading = false;
    classStudentsLoaded = true;
  }

  // ─── Subjects ─────────────────────────────────────────────────────────────────
  let subjects = $state<Subject[]>([]);
  let subjectsLoading = $state(false);
  let showSubjectForm = $state(false);
  let subjectForm = $state({ name: '', code: '', description: '' });
  let subjectSaving = $state(false);
  let subjectError = $state('');

  async function loadSubjects(classId: string) {
    subjectsLoading = true;
    try {
      const data = await api.get<any>(`/api/subjects?schoolId=${schoolId}&classId=${classId}`);
      subjects = data.data ?? [];
    } catch { subjects = []; }
    subjectsLoading = false;
  }

  async function createSubject(classId: string) {
    if (!subjectForm.name.trim()) { subjectError = 'Name required'; return; }
    subjectSaving = true; subjectError = '';
    try {
      await api.post('/api/subjects', { schoolId, classId, ...subjectForm });
      subjectForm = { name: '', code: '', description: '' };
      showSubjectForm = false;
      await loadSubjects(classId);
    } catch (err) { subjectError = err instanceof Error ? err.message : 'Failed'; }
    subjectSaving = false;
  }

  async function deleteSubject(id: string, classId: string) {
    if (!confirm('Delete this subject?')) return;
    try {
      await api.delete(`/api/subjects/${id}`);
      await loadSubjects(classId);
    } catch (err) { subjectError = err instanceof Error ? err.message : 'Delete failed'; }
  }

  // ─── Assignments ──────────────────────────────────────────────────────────────
  type AssignmentView = 'list' | 'create' | 'detail';
  let assignments = $state<Assignment[]>([]);
  let assignmentsLoading = $state(false);
  let assignmentsLoaded = $state(false);
  let assignmentView = $state<AssignmentView>('list');
  let selectedAssignment = $state<Assignment | null>(null);
  let submissions = $state<AssignmentSubmission[]>([]);
  let submissionsPending = $state<{ student: { _id: string; name: string; rollNumber: string } }[]>([]);
  let assignmentSubTab = $state<'instructions' | 'submissions'>('instructions');
  let showAnnounceModal = $state(false);
  let announceText = $state('');
  let activeCommentId = $state<string | null>(null);
  let commentDraft = $state('');
  let grading = $state<{ sub: AssignmentSubmission; points: string; comment: string } | null>(null);
  let gradeSaving = $state(false);
  let gradeError = $state('');
  let assignmentForm = $state({ subject: '', title: '', instructions: '', dueDate: '', scheduleDate: '', totalPoints: 100, status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT' });
  let assignmentAttachment = $state<File | null>(null);
  let classSubjects = $state<Subject[]>([]);
  let classSubjectsLoading = $state(false);
  let classSubjectsLoaded = $state(false);
  let assignmentSaving = $state(false);
  let assignmentError = $state('');

  async function loadAssignments(classId: string) {
    assignmentsLoading = true;
    try {
      const data = await api.get<any>(`/api/assignments?schoolId=${schoolId}&classId=${classId}`);
      assignments = data.data ?? [];
    } catch { assignments = []; }
    assignmentsLoading = false;
    assignmentsLoaded = true;
  }

  async function loadClassSubjects(classId: string) {
    classSubjectsLoading = true;
    try {
      const data = await api.get<any>(`/api/subjects?schoolId=${schoolId}&classId=${classId}`);
      classSubjects = data.data ?? [];
    } catch { classSubjects = []; }
    classSubjectsLoading = false;
    classSubjectsLoaded = true;
  }

  async function loadSubmissions(assignmentId: string) {
    try {
      const data = await api.get<any>(`/api/assignments/${assignmentId}/submissions`);
      const payload = data.data ?? {};
      submissions = payload.submissions ?? [];
      submissionsPending = payload.pending ?? [];
    } catch { submissions = []; submissionsPending = []; }
  }

  async function createAssignment(classId: string, className: string) {
    if (!assignmentForm.title.trim()) { assignmentError = 'Title required'; return; }
    assignmentSaving = true; assignmentError = '';
    try {
      await api.post('/api/assignments', { schoolId, classId, className, ...assignmentForm, teacherId });
      assignmentForm = { subject: '', title: '', instructions: '', dueDate: '', scheduleDate: '', totalPoints: 100, status: 'PUBLISHED' };
      assignmentView = 'list';
      await loadAssignments(classId);
    } catch (err) { assignmentError = err instanceof Error ? err.message : 'Failed'; }
    assignmentSaving = false;
  }

  async function deleteAssignment(id: string, classId: string) {
    if (!confirm('Delete this assignment?')) return;
    try {
      await api.delete(`/api/assignments/${id}`);
      selectedAssignment = null; assignmentView = 'list';
      await loadAssignments(classId);
    } catch (err) { assignmentError = err instanceof Error ? err.message : 'Delete failed'; }
  }

  async function gradeSubmission(assignmentId: string) {
    if (!grading) return;
    const pts = Number(grading.points);
    if (isNaN(pts) || pts < 0) { gradeError = 'Invalid points'; return; }
    gradeSaving = true; gradeError = '';
    try {
      await api.post(`/api/assignments/${assignmentId}/grade/${grading.sub._id}`, { gradePoints: pts, gradeComment: grading.comment, gradedBy: teacherId });
      grading = null;
      await loadSubmissions(assignmentId);
    } catch (err) { gradeError = err instanceof Error ? err.message : 'Failed'; }
    gradeSaving = false;
  }

  let submissionsLoaded = $state<string>(''); // stores last loaded assignmentId
  $effect(() => {
    const id = selectedAssignment?._id;
    if (id && assignmentSubTab === 'submissions' && submissionsLoaded !== id) {
      submissionsLoaded = id;
      loadSubmissions(id);
    }
  });

  // ─── Materials ────────────────────────────────────────────────────────────────
  let materials = $state<StudyMaterial[]>([]);
  let materialsLoading = $state(false);
  let materialsLoaded = $state(false);
  let showMaterialForm = $state(false);
  let materialForm = $state({ title: '', description: '', type: 'LINK' as StudyMaterial['type'], url: '' });
  let materialFile = $state<File | null>(null);
  let materialSaving = $state(false);
  let materialError = $state('');
  let expandedMaterialId = $state<string | null>(null);

  // Auto-generate subject code from name (must be $state so $effect comparison is reliable)
  let _autoCode = $state('');
  $effect(() => {
    const n = groupSubjectForm.name.trim();
    if (n && (!groupSubjectForm.code || groupSubjectForm.code === _autoCode)) {
      _autoCode = n.slice(0,4).toUpperCase().replace(/[^A-Z0-9]/g,'') + Math.random().toString(36).slice(2,5).toUpperCase();
      groupSubjectForm.code = _autoCode;
    }
  });

  async function loadMaterials(classId: string) {
    materialsLoading = true;
    try {
      const data = await api.get<any>(`/api/materials?schoolId=${schoolId}&classId=${classId}`);
      materials = data.data ?? [];
    } catch { materials = []; }
    materialsLoading = false;
    materialsLoaded = true;
  }

  async function createMaterial(classId: string) {
    if (!materialForm.title.trim()) { materialError = 'Title required'; return; }
    materialSaving = true; materialError = '';
    try {
      await api.post('/api/materials', { schoolId, classId, teacherId, ...materialForm });
      materialForm = { title: '', description: '', type: 'LINK', url: '' };
      showMaterialForm = false;
      await loadMaterials(classId);
    } catch (err) { materialError = err instanceof Error ? err.message : 'Failed'; }
    materialSaving = false;
  }

  async function deleteMaterial(id: string, classId: string) {
    if (!confirm('Delete this material?')) return;
    try {
      await api.delete(`/api/materials/${id}`);
      await loadMaterials(classId);
    } catch (err) { materialError = err instanceof Error ? err.message : 'Delete failed'; }
  }

  const classLabel = $derived(selectedClass ? `${selectedClass.name}${selectedClass.section ? ` — ${selectedClass.section}` : ''}` : '');

  const classworkBySubject = $derived.by(() => {
    const groups = new Map<string, { type: 'subject' | 'materials'; items: { kind: 'assignment' | 'material'; data: Assignment | StudyMaterial }[] }>();
    for (const a of assignments) {
      const key = a.subject?.trim() || 'General';
      if (!groups.has(key)) groups.set(key, { type: 'subject', items: [] });
      groups.get(key)!.items.push({ kind: 'assignment', data: a });
    }
    if (materials.length > 0) {
      groups.set('Materials', { type: 'materials', items: materials.map(m => ({ kind: 'material' as const, data: m })) });
    }
    return [...groups.entries()];
  });

  const upcomingAssignments = $derived(
    assignments.filter(a => a.dueDate && !isPast(a.dueDate) && a.status === 'PUBLISHED')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
  );

  const subjectAssignments = $derived(
    selectedSubject ? groupAssignments.filter(a => a.subject === selectedSubject!.name) : []
  );

  const subjectUpcoming = $derived(
    subjectAssignments
      .filter(a => a.dueDate && !isPast(a.dueDate) && a.status === 'PUBLISHED')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
  );

  const subjectStreamFeed = $derived.by(() => {
    type FeedItem = { kind: 'assignment'; data: Assignment; ts: number } | { kind: 'material'; data: StudyMaterial; ts: number };
    // Materials are class-level (no subject field on backend). Only subject assignments are subject-scoped.
    const items: FeedItem[] = [
      ...subjectAssignments.map(a => ({ kind: 'assignment' as const, data: a, ts: new Date(a.createdAt ?? a.dueDate ?? 0).getTime() })),
      ...groupMaterials.map(m => ({ kind: 'material' as const, data: m, ts: new Date(m.createdAt ?? 0).getTime() })),
    ];
    return items.sort((a, b) => b.ts - a.ts).slice(0, 10);
  });

  const subjectTeachers = $derived.by(() => {
    if (!selectedGroup) return [] as { _id: string; name: string; email: string; position: string }[];
    const seen = new Set<string>();
    const out: { _id: string; name: string; email: string; position: string }[] = [];
    for (const sec of selectedGroup.sections) {
      if (sec.classTeacher && !seen.has(sec.classTeacher._id)) {
        seen.add(sec.classTeacher._id); out.push(sec.classTeacher);
      }
      for (const t of sec.assignedTeachers ?? []) {
        if (!seen.has(t._id)) { seen.add(t._id); out.push(t); }
      }
    }
    return out;
  });

  $effect(() => {
    const id = selectedSubject?.classId;
    if (subjectDetailTab === 'people' && id && subjectStudentsLoaded !== id && !subjectStudentsLoading) {
      subjectStudentsLoaded = id;
      loadSubjectStudents(id);
    }
  });
</script>

<svelte:head><title>Academics — ERP Portal</title></svelte:head>

<!-- ══════════════════════════════════════════════════════════════ CLASS LIST -->
{#if !selectedGroup && !selectedClass}
  <div class="space-y-6">
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
      <span class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">AY {currentAcademicYear}</span>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-500"><GraduationCap class="h-4 w-4" /> Total Classes</div>
        <p class="mt-2 text-3xl font-bold text-slate-900">{groupedClasses.length}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-500"><Users class="h-4 w-4" /> Total Students</div>
        <p class="mt-2 text-3xl font-bold text-slate-900">{classes.reduce((s, c) => s + (c.studentCount ?? 0), 0)}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-500"><BookOpen class="h-4 w-4" /> Teachers</div>
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
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {#each groupedClasses as group}
          {@const total = group.sections.reduce((s, c) => s + (c.studentCount ?? 0), 0)}
          {@const cc = cardColor(group.name)}
          {@const ac = avatarColor(group.name)}
          {@const teacher = group.sections[0]?.classTeacher}
          {@const year = group.sections[0]?.academicYear ?? ''}
          <button
            onclick={() => handleClassCardClick(group)}
            class="group overflow-hidden rounded-2xl border border-slate-200/60 bg-white text-left shadow-sm hover:shadow-xl transition-all duration-200"
          >
            <!-- Colored header area -->
            <div class="relative h-32 bg-gradient-to-br {cc.from} p-4">
              <!-- Class name -->
              <p class="text-lg font-bold text-white leading-tight line-clamp-2 pr-12">{group.name}</p>
              {#if year}<p class="mt-0.5 text-xs text-white/70">{year}</p>{/if}
              {#if teacher}<p class="mt-1 text-sm text-white/90 font-medium truncate">{teacher.name}</p>{/if}

              <!-- Teacher/class avatar circle (bottom right) -->
              <div class="absolute -bottom-5 right-4 h-12 w-12 rounded-full border-2 border-white {ac} flex items-center justify-center text-lg font-bold text-white shadow-md">
                {(teacher?.name ?? group.name)[0].toUpperCase()}
              </div>
            </div>

            <!-- White bottom area -->
            <div class="flex items-center justify-between px-4 pb-3 pt-7">
              <div class="flex items-center gap-3 text-xs text-slate-500">
                <span class="flex items-center gap-1"><Users class="h-3.5 w-3.5" /> {total}</span>
                {#if group.sections.length > 1}
                  <span>{group.sections.length} sections</span>
                {:else if group.sections[0]?.classCode}
                  <span class="font-mono font-bold text-slate-600">{group.sections[0].classCode}</span>
                {/if}
              </div>
              <div class="flex items-center gap-3 text-slate-400">
                <!-- folder icon -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hover:text-blue-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <ChevronRight class="h-4 w-4 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

<!-- ══════════════════════════════════════════════════════ CLASS GROUP WORKSPACE -->
{:else if selectedGroup && !selectedClass}
  {@const group = selectedGroup}

  {#if selectedSubject}
    <!-- ── SUBJECT DETAIL VIEW (Google Classroom style) ── -->
    {@const subj = selectedSubject}
    <div class="space-y-0">
      <!-- Back nav -->
      <div class="flex items-center gap-2 pb-3">
        <button onclick={() => { selectedSubject = null; }} class="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
          <ArrowLeft class="h-5 w-5 text-slate-500" />
        </button>
        <span class="text-xs text-slate-400">{group.name}</span>
      </div>

      <!-- GC-style colored banner -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br {subjectGradient(subj.name)} px-8 py-7 shadow-sm">
        <h2 class="text-2xl font-bold text-white leading-tight">{subj.name}</h2>
        {#if subj.code}<p class="mt-0.5 text-sm text-white/80 font-mono">{subj.code}</p>{/if}
        {#if subj.teacherId}<p class="mt-1 text-sm text-white/90 font-medium">{(subj.teacherId as { name: string }).name}</p>{/if}
        <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
          <span class="flex items-center gap-1.5"><Users class="h-3.5 w-3.5" /> {group.sections.reduce((sum, c) => sum + (c.studentCount ?? 0), 0)} students</span>
          {#if group.sections[0]?.academicYear}<span>{group.sections[0].academicYear}</span>{/if}
        </div>
        <div class="absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-white/10"></div>
        <div class="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/15 flex items-center justify-center text-3xl font-black text-white/80">
          {subj.name[0].toUpperCase()}
        </div>
      </div>

      <!-- Tabs: Stream | Classwork | People -->
      <div class="flex border-b border-slate-200 bg-white sticky top-0 z-10 mt-0">
        {#each (['stream','classwork','people'] as const) as tab}
          <button onclick={() => (subjectDetailTab = tab)}
            class="px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize {subjectDetailTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
            {tab === 'stream' ? 'Stream' : tab === 'classwork' ? 'Classwork' : 'People'}
          </button>
        {/each}
      </div>

      <div class="pt-4">

        <!-- ══ STREAM ══ -->
        {#if subjectDetailTab === 'stream'}
          <div class="grid gap-5 lg:grid-cols-[220px_1fr]">
            <!-- Left: Upcoming -->
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-sm font-bold text-slate-800 mb-2">Upcoming</p>
              {#if subjectUpcoming.length === 0}
                <p class="text-xs text-slate-400">No work due soon!</p>
              {:else}
                <div class="space-y-2">
                  {#each subjectUpcoming as a}
                    <div class="rounded-lg px-2 py-1.5">
                      <p class="text-xs font-medium text-slate-700 truncate">{a.title}</p>
                      <p class="text-[11px] text-amber-600">Due {fmt(a.dueDate)}</p>
                    </div>
                  {/each}
                </div>
              {/if}
              <button onclick={() => (subjectDetailTab = 'classwork')} class="mt-3 text-xs font-semibold text-blue-600 hover:underline">View all</button>
            </div>
            <!-- Right: Combined stream (assignments + materials) -->
            <div class="space-y-3">
              {#if groupAssignmentsLoading || groupMaterialsLoading}
                <div class="animate-pulse space-y-2">{#each [0,1,2] as _}<div class="h-20 rounded-2xl bg-slate-100"></div>{/each}</div>
              {:else if subjectStreamFeed.length === 0}
                <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                  <p class="text-sm text-slate-400">No activity yet for {subj.name}.</p>
                </div>
              {:else}
                {@const streamPoster = subjectTeachers[0]?.name ?? (userName || subj.name)}
                {#each subjectStreamFeed as item}
                  <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {avatarColor(streamPoster)} text-sm font-bold text-white">{streamPoster[0]?.toUpperCase() ?? '?'}</div>
                        <div class="min-w-0">
                          <p class="text-sm font-semibold text-slate-800">{streamPoster}</p>
                          <p class="text-xs text-slate-400">
                            {item.kind === 'assignment' ? fmt(item.data.createdAt ?? item.data.dueDate ?? '') : fmt((item.data as StudyMaterial).createdAt ?? '')}
                          </p>
                        </div>
                      </div>
                      <button class="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Options">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                    </div>
                    {#if item.kind === 'assignment'}
                      {@const a = item.data as Assignment}
                      <p class="mt-3 text-sm text-slate-700">Assignment: <span class="font-semibold text-blue-600">{a.title}</span></p>
                      {#if a.dueDate}<p class="mt-1 text-xs text-slate-400">Due {fmt(a.dueDate)}</p>{/if}
                    {:else}
                      {@const m = item.data as StudyMaterial}
                      <p class="mt-3 text-sm text-slate-700">
                        {MATERIAL_ICON[m.type] ?? '📦'} Material: <span class="font-semibold text-emerald-600">{m.title}</span>
                      </p>
                      {#if m.url}<p class="mt-1 text-xs"><a href={m.url} target="_blank" rel="noreferrer" class="text-blue-500 hover:underline">Open {m.type}</a></p>{/if}
                    {/if}
                    <div class="mt-3 border-t border-slate-100 pt-2">
                      {#if activeCommentId === item.data._id}
                        <div class="flex items-center gap-2">
                          <input class="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-blue-400" placeholder="Add a comment…" bind:value={commentDraft} />
                          <button onclick={() => { activeCommentId = null; commentDraft = ''; }} class="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                        </div>
                      {:else}
                        <button onclick={() => { activeCommentId = item.data._id; commentDraft = ''; }}
                          class="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors">
                          <MessageSquare class="h-4 w-4" /> Add comment
                        </button>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

        <!-- ══ CLASSWORK ══ -->
        {:else if subjectDetailTab === 'classwork'}
          {#if subjectClassworkView === 'create-assignment'}
            <!-- Create assignment form -->
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <button onclick={() => { subjectClassworkView = 'list'; subjectAssignmentError = ''; }} class="rounded-lg p-1.5 hover:bg-slate-100"><ArrowLeft class="h-5 w-5 text-slate-500" /></button>
                <h3 class="font-bold text-slate-900">New Assignment — {subj.name}</h3>
              </div>
              {#if subjectAssignmentError}<p class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{subjectAssignmentError}</p>{/if}
              <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div>
                  <label for="sa-title" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</label>
                  <input id="sa-title" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Assignment title" bind:value={subjectAssignmentForm.title} />
                </div>
                <div>
                  <label for="sa-instructions" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Instructions</label>
                  <textarea id="sa-instructions" rows={4} class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="What students need to do…" bind:value={subjectAssignmentForm.instructions}></textarea>
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label for="sa-due" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
                    <input id="sa-due" type="date" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={subjectAssignmentForm.dueDate} />
                  </div>
                  <div>
                    <label for="sa-pts" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Points</label>
                    <input id="sa-pts" type="number" min={1} class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={subjectAssignmentForm.totalPoints} />
                  </div>
                  <div>
                    <label for="sa-status" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                    <select id="sa-status" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={subjectAssignmentForm.status}>
                      <option value="PUBLISHED">Publish</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </div>
                </div>
                <div class="flex justify-end gap-2">
                  <button onclick={() => { subjectClassworkView = 'list'; subjectAssignmentError = ''; }} class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
                  <button onclick={createSubjectAssignment} disabled={subjectAssignmentSaving} class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    <Send class="h-4 w-4" /> {subjectAssignmentSaving ? 'Creating…' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>

          {:else if subjectClassworkView === 'create-material'}
            <!-- Create material form -->
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <button onclick={() => { subjectClassworkView = 'list'; subjectMaterialError = ''; }} class="rounded-lg p-1.5 hover:bg-slate-100"><ArrowLeft class="h-5 w-5 text-slate-500" /></button>
                <h3 class="font-bold text-slate-900">Add Material — {subj.name}</h3>
              </div>
              {#if subjectMaterialError}<p class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{subjectMaterialError}</p>{/if}
              <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="sm-title" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</label>
                    <input id="sm-title" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Material title" bind:value={subjectMaterialForm.title} />
                  </div>
                  <div>
                    <label for="sm-type" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</label>
                    <select id="sm-type" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={subjectMaterialForm.type}>
                      {#each (['LINK','VIDEO','DOCUMENT','FILE','OTHER'] as const) as t}<option value={t}>{t}</option>{/each}
                    </select>
                  </div>
                </div>
                <input class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="URL" bind:value={subjectMaterialForm.url} />
                <input class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Description (optional)" bind:value={subjectMaterialForm.description} />
                <div class="flex justify-end gap-2">
                  <button onclick={() => { subjectClassworkView = 'list'; subjectMaterialError = ''; }} class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
                  <button onclick={createSubjectMaterial} disabled={subjectMaterialSaving} class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{subjectMaterialSaving ? 'Adding…' : 'Add'}</button>
                </div>
              </div>
            </div>

          {:else}
          <!-- List view: sub-tabs + action buttons -->
          <div class="flex items-center justify-between pb-3">
            <div class="flex border-b border-slate-100">
              {#each (['assignments','materials'] as const) as st}
                <button onclick={() => (subjectTab = st)}
                  class="px-5 py-2 text-sm font-medium border-b-2 transition-colors {subjectTab === st ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}">
                  {st === 'assignments' ? 'Assignments' : 'Materials'}
                </button>
              {/each}
            </div>
            <div class="flex items-center gap-2">
              {#if subjectTab === 'assignments'}
                <button onclick={() => { subjectClassworkView = 'create-assignment'; subjectAssignmentForm = { title: '', instructions: '', dueDate: '', totalPoints: 100, status: 'PUBLISHED' }; subjectAssignmentError = ''; }}
                  class="flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 shadow-sm transition-colors">
                  <Plus class="h-3.5 w-3.5" /> Assign
                </button>
              {:else}
                <button onclick={() => { subjectClassworkView = 'create-material'; subjectMaterialForm = { title: '', description: '', type: 'LINK', url: '' }; subjectMaterialError = ''; }}
                  class="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
                  <Plus class="h-3.5 w-3.5" /> Material
                </button>
              {/if}
            </div>
          </div>
          {#if subjectTab === 'assignments'}
            {#if groupAssignmentsLoading}
              <div class="animate-pulse space-y-3">{#each [0,1,2] as _}<div class="h-20 rounded-2xl bg-slate-100"></div>{/each}</div>
            {:else if subjectAssignments.length === 0}
              <div class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50"><FileText class="h-7 w-7 text-blue-400" /></div>
                <div>
                  <p class="text-sm font-bold text-slate-700">No assignments yet</p>
                  <p class="mt-1 text-xs text-slate-400">Assignments for {subj.name} will appear here</p>
                </div>
              </div>
            {:else}
              <div class="space-y-3">
                {#each subjectAssignments as a}
                  {@const isOverdue = isPast(a.dueDate) && a.status !== 'CLOSED'}
                  <button class="group w-full rounded-2xl border shadow-sm hover:shadow-md transition-all text-left {isOverdue ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-blue-200'}">
                    <div class="p-4">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-3">
                          <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50"><FileText class="h-4 w-4 text-blue-600" /></div>
                          <div>
                            <p class="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{a.title}</p>
                            <p class="text-xs text-slate-500">{a.className} · {fmt(a.dueDate)}</p>
                          </div>
                        </div>
                        <div class="flex shrink-0 flex-col items-end gap-1 text-xs">
                          <span class="rounded-full px-2.5 py-0.5 font-medium {STATUS_COLOR[a.status] ?? ''}">{a.status}</span>
                          <span class="flex items-center gap-1 text-slate-500"><Star class="h-3 w-3 text-amber-400" /> {a.totalPoints} pts</span>
                          <span class="flex items-center gap-1 text-slate-500"><Users class="h-3 w-3" /> {a.submissionsTotal} submitted</span>
                        </div>
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          {:else}
            {#if groupMaterialsLoading}
              <div class="animate-pulse space-y-2">{#each [0,1,2] as _}<div class="h-14 rounded-xl bg-slate-100"></div>{/each}</div>
            {:else if groupMaterials.length === 0}
              <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                <BookOpen class="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p class="text-sm text-slate-400">No materials yet.</p>
              </div>
            {:else}
              <div class="space-y-2">
                {#each groupMaterials as m}
                  <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div class="flex items-center gap-3">
                      <span class="text-xl">{MATERIAL_ICON[m.type] ?? '📦'}</span>
                      <div>
                        <p class="text-sm font-semibold text-slate-800">{m.title}</p>
                        <p class="text-xs text-slate-400">{m.type}</p>
                      </div>
                    </div>
                    {#if m.url}<a href={m.url} target="_blank" rel="noreferrer" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50">Open</a>{/if}
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
          {/if}

        <!-- ══ PEOPLE ══ -->
        {:else if subjectDetailTab === 'people'}
          <div class="space-y-8">
            <!-- Teachers -->
            <div>
              <h3 class="text-2xl font-bold text-slate-900 pb-3 border-b border-slate-200">Teachers</h3>
              <div class="divide-y divide-slate-100">
                {#each subjectTeachers as t}
                  <div class="flex items-center gap-4 py-4">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full {avatarColor(t.name)} text-sm font-bold text-white">{t.name[0].toUpperCase()}</div>
                    <div>
                      <p class="text-sm font-medium text-slate-800">{t.name}</p>
                      {#if t.position}<p class="text-xs text-slate-400">{t.position}</p>{/if}
                    </div>
                  </div>
                {/each}
                {#if subjectTeachers.length === 0}
                  <p class="py-6 text-sm text-slate-400">No teachers assigned.</p>
                {/if}
              </div>
            </div>
            <!-- Students -->
            <div>
              <div class="flex items-baseline justify-between pb-3 border-b border-slate-200">
                <h3 class="text-2xl font-bold text-slate-900">Students</h3>
                <span class="text-sm text-slate-500">{group.sections.reduce((s,c) => s+(c.studentCount??0),0)} students</span>
              </div>
              {#if subjectStudentsLoading}
                <div class="animate-pulse divide-y divide-slate-100">{#each [0,1,2,3,4] as _}<div class="flex items-center gap-4 py-4"><div class="h-10 w-10 rounded-full bg-slate-100"></div><div class="h-3 w-40 rounded bg-slate-100"></div></div>{/each}</div>
              {:else if subjectStudents.length === 0}
                <p class="py-6 text-sm text-slate-400">No students enrolled yet.</p>
              {:else}
                <div class="divide-y divide-slate-100">
                  {#each subjectStudents as s}
                    <div class="flex items-center gap-4 py-3">
                      <div class="relative shrink-0">
                        <img src={studentAvatar(s)} alt={s.name} loading="lazy" class="h-10 w-10 rounded-full object-cover bg-slate-100" />
                        <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white {!s.status||s.status.toLowerCase()==='active'?'bg-green-400':'bg-slate-300'}"></span>
                      </div>
                      <p class="flex-1 text-sm font-medium text-slate-800">{s.name}</p>
                      {#if s.email}
                        <a href="mailto:{s.email}" aria-label="Email {s.name}" class="text-slate-400 hover:text-blue-600 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        </a>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}

      </div>
    </div>

  {:else}
    <!-- ── GROUP WORKSPACE ── -->
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <button onclick={() => { selectedGroup = null; }} class="rounded-lg p-2 hover:bg-slate-100 transition-colors">
          <ArrowLeft class="h-5 w-5 text-slate-500" />
        </button>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
          {group.name[0].toUpperCase()}
        </div>
        <div>
          <h2 class="text-xl font-bold text-slate-900">{group.name}</h2>
          <p class="text-xs text-slate-500">{group.sections.length} sections · {group.sections.reduce((s,c) => s+(c.studentCount??0),0)} students</p>
        </div>
      </div>

      <!-- ── Sections ── -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Sections</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each group.sections as sec}
            <button
              onclick={() => openSection(sec)}
              class="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div class="flex items-start justify-between">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-lg font-bold text-white shadow-sm">
                  {sec.section || '?'}
                </div>
                <ChevronRight class="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors mt-1" />
              </div>
              <div class="mt-3">
                <p class="font-bold text-slate-900">Section {sec.section}</p>
              </div>
              <div class="mt-3 space-y-1.5">
                <span class="flex items-center gap-1 text-xs text-slate-500"><Users class="h-3.5 w-3.5" /> {sec.studentCount ?? 0} students</span>
                {#if sec.classTeacher}
                  <div class="flex items-center gap-1.5 text-xs text-slate-500">
                    <GraduationCap class="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span class="truncate">{sec.classTeacher.name}</span>
                  </div>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- ── Subjects ── -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Subjects</h3>
        <div class="space-y-4">
          {#if groupSubjectsLoading}
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-pulse">
              {#each [0,1,2,3] as _}<div class="h-40 rounded-2xl bg-slate-100"></div>{/each}
            </div>
          {:else}
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {#each groupSubjects as s}
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => openSubject(s)}
                  onkeydown={(e) => e.key === 'Enter' && openSubject(s)}
                  class="group relative flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer"
                >
                  <div class="flex-1 p-5">
                    <button
                      onclick={(e) => { e.stopPropagation(); deleteGroupSubject(s._id, group); }}
                      aria-label="Delete subject"
                      class="absolute right-3 top-3 rounded-lg p-1.5 text-slate-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all z-10"
                    ><Trash2 class="h-3.5 w-3.5" /></button>

                    <div class="flex items-center gap-3 pr-6">
                      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {subjectGradient(s.name)} text-white text-base font-extrabold shadow-md">
                        {s.name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div class="min-w-0">
                        <p class="font-bold text-slate-900 leading-tight truncate">{s.name}</p>
                        {#if s.code}
                          <span class="mt-1 inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500 tracking-widest">{s.code}</span>
                        {/if}
                      </div>
                    </div>

                    {#if s.description}
                      <p class="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-2">{s.description}</p>
                    {/if}

                    {#if s.teacherId}
                      <div class="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <GraduationCap class="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span class="truncate text-xs font-medium text-slate-600">{(s.teacherId as { name: string }).name}</span>
                      </div>
                    {/if}
                    <div class="mt-2 flex items-center gap-2 flex-wrap">
                      <div class="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <Users class="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span class="text-xs font-medium text-slate-600">{group.sections.reduce((sum, c) => sum + (c.studentCount ?? 0), 0)} students</span>
                      </div>
                      {#if group.sections[0]?.academicYear}
                        <div class="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5">
                          <span class="text-xs font-medium text-slate-600">{group.sections[0].academicYear}</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
              {#if !showGroupSubjectForm}
                <button onclick={() => (showGroupSubjectForm = true)}
                  class="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center hover:border-blue-300 hover:bg-blue-50 transition-all group">
                  <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-blue-100 transition-colors">
                    <Plus class="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <p class="mt-3 text-sm font-semibold text-slate-500 group-hover:text-blue-600">Add Subject</p>
                </button>
              {/if}
            </div>
          {/if}
          {#if showGroupSubjectForm}
            <div class="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-3 shadow-sm">
              <p class="text-sm font-semibold text-blue-800">New Subject <span class="text-xs font-normal text-blue-600">(added to all sections of {group.name})</span></p>
              {#if groupSubjectError}<p class="text-xs font-medium text-red-600">{groupSubjectError}</p>{/if}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="gsname" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name *</label>
                  <input id="gsname" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="e.g. Mathematics" bind:value={groupSubjectForm.name} />
                </div>
                <div>
                  <label for="gscode" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Code</label>
                  <input id="gscode" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="e.g. MATH10" bind:value={groupSubjectForm.code} />
                </div>
              </div>
              <input class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Description (optional)" bind:value={groupSubjectForm.description} />
              <div class="flex justify-end gap-2">
                <button onclick={() => { showGroupSubjectForm = false; groupSubjectError = ''; }} class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button onclick={() => createGroupSubject(group)} disabled={groupSubjectSaving} class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{groupSubjectSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          {/if}
          {#if !groupSubjectsLoading && groupSubjects.length === 0 && !showGroupSubjectForm}
            <div class="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No subjects yet. Click "Add Subject" to create one for this class.</div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

<!-- ══════════════════════════════════════════════════════ SECTION WORKSPACE -->
{:else if selectedClass}
  {@const cls = selectedClass}
  {@const cc = cardColor(cls.name)}
  {@const ac = avatarColor(cls.name)}
  <div class="space-y-0">

    <!-- Back nav -->
    <div class="flex items-center gap-2 pb-2">
      <button onclick={goBack} class="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
        <ArrowLeft class="h-5 w-5 text-slate-500" />
      </button>
      <span class="text-xs text-slate-400">{selectedGroup?.name ?? 'All classes'}</span>
    </div>

    <!-- GC-style colored banner -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br {cc.from} px-8 py-7 shadow-sm">
      <h2 class="text-2xl font-bold text-white leading-tight">{classLabel}</h2>
      {#if cls.stream}<p class="mt-0.5 text-sm text-white/80">{cls.stream}</p>{/if}
      {#if cls.classTeacher}<p class="mt-1 text-sm text-white/90 font-medium">{cls.classTeacher.name}</p>{/if}
      <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
        {#if cls.academicYear}<span>{cls.academicYear}</span>{/if}
        <span class="flex items-center gap-1"><Users class="h-3.5 w-3.5" /> {cls.studentCount ?? 0} students</span>
        {#if cls.meetLink}
          <a href={cls.meetLink} target="_blank" rel="noreferrer" class="flex items-center gap-1 hover:text-white transition-colors"><Globe class="h-3.5 w-3.5" /> Meet</a>
        {/if}
      </div>
      {#if cls.classCode}
        <button onclick={() => copyCode(cls.classCode!)}
          class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1 font-mono text-xs font-bold text-white hover:bg-white/30 transition-colors">
          {codeCopied ? '✓ Copied!' : `Class code: ${cls.classCode}`}
        </button>
      {/if}
      <!-- Decorative circle -->
      <div class="absolute -bottom-8 -right-8 h-36 w-36 rounded-full {ac} opacity-30"></div>
      <div class="absolute -bottom-4 -right-4 h-20 w-20 rounded-full {ac} opacity-40 flex items-center justify-center text-3xl font-black text-white/80">
        {cls.name[0].toUpperCase()}
      </div>
    </div>

    <!-- GC Tabs: Stream | Classwork | People -->
    <div class="flex border-b border-slate-200 bg-white sticky top-0 z-10">
      {#each (['stream','classwork','people'] as const) as tab}
        <button onclick={() => { workspaceTab = tab; if (tab !== 'classwork') assignmentView = 'list'; }}
          class="px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize {workspaceTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          {tab === 'stream' ? 'Stream' : tab === 'classwork' ? 'Classwork' : 'People'}
        </button>
      {/each}
    </div>

    <div class="pt-4">

    <!-- ══ STREAM ══ -->
    {#if workspaceTab === 'stream'}
      <!-- GC Stream: upcoming + class info sidebar -->
      <div class="grid gap-5 lg:grid-cols-[220px_1fr]">
        <!-- Left: Upcoming -->
        <div class="space-y-3">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-sm font-bold text-slate-800 mb-2">Upcoming</p>
            {#if upcomingAssignments.length === 0}
              <p class="text-xs text-slate-400">Woohoo, no work due soon!</p>
            {:else}
              <div class="space-y-2">
                {#each upcomingAssignments as a}
                  <button onclick={() => { workspaceTab = 'classwork'; selectedAssignment = a; assignmentSubTab = 'instructions'; assignmentView = 'detail'; }}
                    class="w-full text-left rounded-lg hover:bg-slate-50 px-2 py-1.5 transition-colors">
                    <p class="text-xs font-medium text-slate-700 truncate">{a.title}</p>
                    <p class="text-[11px] text-amber-600">Due {fmt(a.dueDate)}</p>
                  </button>
                {/each}
              </div>
            {/if}
            <button onclick={() => (workspaceTab = 'classwork')} class="mt-3 text-xs font-semibold text-blue-600 hover:underline">View all</button>
          </div>

        </div>

        <!-- Right: Announcements stream placeholder -->
        <div class="space-y-3">
          <button onclick={() => { showAnnounceModal = true; announceText = ''; }}
            class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 shadow-sm transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Announce something to your class
          </button>

          <!-- Recent assignments as stream items -->
          {#if assignments.length > 0}
            <div class="space-y-2">
              {#each assignments.slice(0,5) as a}
                {@const poster = (cls.classTeacher?.name ?? userName) || cls.name}
                <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {avatarColor(poster)} text-sm font-bold text-white">{poster[0]?.toUpperCase() ?? '?'}</div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-800">{poster}</p>
                        <p class="text-xs text-slate-400">{fmt(a.createdAt ?? a.dueDate ?? '')}</p>
                      </div>
                    </div>
                    <button aria-label="More options" class="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                  </div>
                  <p class="mt-3 text-sm text-slate-700">Assignment: <button class="font-semibold text-blue-600 hover:underline cursor-pointer" onclick={() => { workspaceTab = 'classwork'; selectedAssignment = a; assignmentSubTab = 'instructions'; assignmentView = 'detail'; }}>{a.title}</button></p>
                  {#if a.dueDate}<p class="mt-1 text-xs text-slate-400">Due {fmt(a.dueDate)}</p>{/if}
                  <!-- Comment row -->
                  <div class="mt-3 border-t border-slate-100 pt-2">
                    {#if activeCommentId === a._id}
                      <div class="flex items-center gap-2">
                        <input
                          class="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                          placeholder="Add a comment for the class…"
                          bind:value={commentDraft}
                        />
                        <button onclick={() => { activeCommentId = null; commentDraft = ''; }} class="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                      </div>
                    {:else}
                      <button onclick={() => { activeCommentId = a._id; commentDraft = ''; }}
                        class="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors">
                        <MessageSquare class="h-4 w-4" /> Add comment
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
              <p class="text-sm text-slate-400">No activity yet. Create an assignment to get started.</p>
              <button onclick={() => { workspaceTab = 'classwork'; openCreateAssignment(); }} class="mt-3 text-sm font-semibold text-blue-600 hover:underline">Create assignment</button>
            </div>
          {/if}
        </div>
      </div>

    <!-- ══ CLASSWORK ══ -->
    {:else if workspaceTab === 'classwork'}
      {@const classId = selectedClass._id}
      {@const className = selectedClass.name + (selectedClass.section ? ` - ${selectedClass.section}` : '')}

      {#if assignmentView === 'list'}
        <!-- GC Classwork: topic-grouped list -->
        <div class="space-y-0">
          <!-- Top action row -->
          <div class="flex items-center justify-between pb-4">
            <div class="flex items-center gap-2">
              <button onclick={() => { openCreateAssignment() }}
                class="flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 shadow-sm transition-colors">
                <Plus class="h-4 w-4" /> Create assignment
              </button>
            </div>
            {#if assignmentsLoading || materialsLoading}
              <span class="text-xs text-slate-400 animate-pulse">Loading…</span>
            {/if}
          </div>

          {#if assignmentsLoading}
            <div class="animate-pulse space-y-3">{#each [0,1,2] as _}<div class="h-14 rounded-xl bg-slate-100"></div>{/each}</div>
          {:else if classworkBySubject.length === 0}
            <!-- Empty state -->
            <div class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-700">No classwork yet</p>
                <p class="mt-1 text-xs text-slate-400">Assignments and materials will appear here</p>
              </div>
              <button onclick={() => { openCreateAssignment() }}
                class="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
                <Plus class="h-4 w-4" /> Create
              </button>
            </div>
          {:else}
            <!-- Topic groups (GC Classwork style) -->
            <div class="space-y-0">
              {#each classworkBySubject as [topicName, group]}
                {@const isCollapsed = collapsedTopics.has(topicName)}
                <!-- Topic header -->
                <div class="mb-4">
                  <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 class="text-base font-bold text-slate-800">{topicName}</h3>
                    <button
                      aria-label={isCollapsed ? 'Expand topic' : 'Collapse topic'}
                      onclick={() => {
                        const next = new Set(collapsedTopics);
                        isCollapsed ? next.delete(topicName) : next.add(topicName);
                        collapsedTopics = next;
                      }} class="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform {isCollapsed ? '-rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                  </div>

                  {#if !isCollapsed}
                    <div class="divide-y divide-slate-100">
                      {#each group.items as item}
                        {#if item.kind === 'assignment'}
                          {@const a = item.data as Assignment}
                          {@const isOverdue = isPast(a.dueDate) && a.status !== 'CLOSED'}
                          <button onclick={() => { selectedAssignment = a; assignmentSubTab = 'instructions'; assignmentView = 'detail'; }}
                            class="flex w-full items-center gap-4 py-3 px-2 text-left hover:bg-slate-50 transition-colors group">
                            <!-- GC assignment icon -->
                            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors truncate">{a.title}</p>
                            </div>
                            <div class="shrink-0 text-right text-xs text-slate-500">
                              {#if isOverdue}
                                <span class="text-red-600 font-semibold">Overdue {fmt(a.dueDate)}</span>
                              {:else if a.dueDate}
                                <span>Due {fmt(a.dueDate)}</span>
                              {:else}
                                <span class="text-slate-400">No due date</span>
                              {/if}
                            </div>
                          </button>
                        {:else}
                          {@const m = item.data as StudyMaterial}
                          {@const isExp = expandedMaterialId === m._id}
                          <div>
                            <button onclick={() => (expandedMaterialId = isExp ? null : m._id)}
                              class="flex w-full items-center gap-4 py-3 px-2 text-left hover:bg-slate-50 transition-colors group">
                              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-sm">
                                {MATERIAL_ICON[m.type] ?? '📦'}
                              </div>
                              <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors truncate">{m.title}</p>
                              </div>
                              <div class="shrink-0 text-xs text-slate-400">
                                {m.type}
                              </div>
                            </button>
                            {#if isExp}
                              <div class="mx-12 mb-2 rounded-xl bg-slate-50 p-3 space-y-2">
                                {#if m.description}<p class="text-xs text-slate-600">{m.description}</p>{/if}
                                {#if m.url}<a href={m.url} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">Open {m.type} →</a>{/if}
                                <button onclick={() => deleteMaterial(m._id, classId)} class="text-xs text-red-500 hover:underline ml-4">Delete</button>
                              </div>
                            {/if}
                          </div>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

          <!-- Add Material inline -->
          <div class="border-t border-slate-100 pt-4 mt-4">
            {#if showMaterialForm}
              <div class="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3 shadow-sm">
                <p class="text-sm font-semibold text-blue-800">Add Material</p>
                {#if materialError}<p class="text-xs text-red-600">{materialError}</p>{/if}
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="mtitle2" class="mb-1 block text-xs font-semibold text-slate-500">Title *</label>
                    <input id="mtitle2" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="Material title" bind:value={materialForm.title} />
                  </div>
                  <div>
                    <label for="mtype2" class="mb-1 block text-xs font-semibold text-slate-500">Type</label>
                    <select id="mtype2" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" bind:value={materialForm.type}>
                      {#each (['LINK','VIDEO','DOCUMENT','FILE','OTHER'] as const) as t}<option value={t}>{t}</option>{/each}
                    </select>
                  </div>
                </div>
                {#if materialForm.type === 'DOCUMENT' || materialForm.type === 'FILE'}
                  <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-4 py-2 text-xs text-slate-500 hover:border-blue-500">
                    📎 {materialFile ? materialFile.name : 'Upload file'}
                    <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" class="sr-only" onchange={(e) => { const f=(e.currentTarget as HTMLInputElement).files?.[0]; if(f) materialFile=f; }} />
                  </label>
                {/if}
                <input class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="URL (optional)" bind:value={materialForm.url} />
                <div class="flex gap-2">
                  <button onclick={() => { showMaterialForm=false; materialFile=null; materialError=''; }} class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">Cancel</button>
                  <button onclick={() => createMaterial(classId)} disabled={materialSaving} class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{materialSaving?'Saving…':'Add'}</button>
                </div>
              </div>
            {:else}
              <button onclick={() => { showMaterialForm=true; materialError=''; }} class="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                <Plus class="h-4 w-4" /> Add material
              </button>
            {/if}
          </div>
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
                <label for="atitle" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</label>
                <input id="atitle" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Assignment title" bind:value={assignmentForm.title} />
              </div>
              <div>
                <label for="asubject" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</label>
                {#if classSubjectsLoading}
                  <div class="h-10 animate-pulse rounded-xl bg-slate-100"></div>
                {:else}
                  <select id="asubject" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={assignmentForm.subject}>
                    <option value="">— Select subject —</option>
                    {#each classSubjects as s (s._id)}
                      <option value={s.name}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                    {/each}
                    <option value="__other">Other / Custom</option>
                  </select>
                {/if}
                {#if assignmentForm.subject === '__other'}
                  <input class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="Enter subject name" oninput={(e) => (assignmentForm.subject = (e.currentTarget as HTMLInputElement).value)} />
                {/if}
              </div>
            </div>
            <div>
              <label for="ainstructions" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Instructions</label>
              <textarea id="ainstructions" rows={4} class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="What students need to do…" bind:value={assignmentForm.instructions}></textarea>
              <!-- Attachment upload -->
              <label class="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                {#if assignmentAttachment}
                  <span class="truncate text-blue-600 font-medium">{assignmentAttachment.name}</span>
                  <button type="button" onclick={() => (assignmentAttachment = null)} class="ml-auto shrink-0 text-slate-400 hover:text-red-500">✕</button>
                {:else}
                  <span>Attach PDF or document</span>
                  <span class="ml-auto text-xs text-slate-400">PDF, DOC, DOCX, PPT up to 20MB</span>
                {/if}
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" class="sr-only"
                  onchange={(e) => { const f=(e.currentTarget as HTMLInputElement).files?.[0]; if(f) assignmentAttachment=f; }} />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label for="aduedate" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
                <input id="aduedate" type="date" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={assignmentForm.dueDate} />
              </div>
              <div>
                <label for="aschedule" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule Date</label>
                <input id="aschedule" type="date" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={assignmentForm.scheduleDate} />
              </div>
              <div>
                <label for="apoints" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Points</label>
                <input id="apoints" type="number" min={1} class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={assignmentForm.totalPoints} />
              </div>
              <div>
                <label for="astatus" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                <select id="astatus" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={assignmentForm.status}>
                  <option value="PUBLISHED">Publish</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button onclick={() => (assignmentView = 'list')} class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onclick={() => createAssignment(classId, className)} disabled={assignmentSaving} class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                <Send class="h-4 w-4" /> {assignmentSaving ? 'Creating…' : 'Assign'}
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
              {#if a.instructions}<p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.instructions}</p>
              {:else}<p class="text-sm italic text-slate-400">No instructions provided.</p>{/if}
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

    <!-- MATERIALS (section-specific) -->
    <!-- ══ PEOPLE ══ -->
    {:else if workspaceTab === 'people'}
      <div class="space-y-8">

        <!-- Teachers section -->
        <div>
          <h3 class="text-2xl font-bold text-slate-900 pb-3 border-b border-slate-200">Teachers</h3>
          <div class="divide-y divide-slate-100">
            {#if cls.classTeacher}
              <div class="flex items-center gap-4 py-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full {avatarColor(cls.classTeacher.name)} text-sm font-bold text-white">
                  {cls.classTeacher.name[0].toUpperCase()}
                </div>
                <div>
                  <p class="text-sm font-medium text-slate-800">{cls.classTeacher.name}</p>
                  {#if cls.classTeacher.position}<p class="text-xs text-slate-400">{cls.classTeacher.position}</p>{/if}
                </div>
              </div>
            {/if}
            {#each cls.assignedTeachers ?? [] as t}
              <div class="flex items-center gap-4 py-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full {avatarColor(t.name)} text-sm font-bold text-white">
                  {t.name[0].toUpperCase()}
                </div>
                <p class="text-sm font-medium text-slate-800">{t.name}</p>
              </div>
            {/each}
            {#if !cls.classTeacher && !(cls.assignedTeachers?.length)}
              <p class="py-6 text-sm text-slate-400">No teachers assigned.</p>
            {/if}
          </div>
        </div>

        <!-- Students/Classmates section -->
        <div>
          <div class="flex items-baseline justify-between pb-3 border-b border-slate-200">
            <h3 class="text-2xl font-bold text-slate-900">Classmates</h3>
            <span class="text-sm text-slate-500">{cls.studentCount ?? classStudents.length} students</span>
          </div>
          {#if classStudentsLoading}
            <div class="animate-pulse divide-y divide-slate-100">
              {#each [0,1,2,3,4] as _}
                <div class="flex items-center gap-4 py-4">
                  <div class="h-10 w-10 rounded-full bg-slate-100"></div>
                  <div class="h-3 w-40 rounded bg-slate-100"></div>
                </div>
              {/each}
            </div>
          {:else if classStudents.length === 0}
            <p class="py-6 text-sm text-slate-400">No students enrolled yet.</p>
          {:else}
            <div class="divide-y divide-slate-100">
              {#each classStudents as s}
                <div class="flex items-center gap-4 py-3">
                  <div class="relative shrink-0">
                    <img src={studentAvatar(s)} alt={s.name} loading="lazy" class="h-10 w-10 rounded-full object-cover bg-slate-100" />
                    <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white {!s.status||s.status.toLowerCase()==='active'?'bg-green-400':'bg-slate-300'}"></span>
                  </div>
                  <p class="flex-1 text-sm font-medium text-slate-800">{s.name}</p>
                  {#if s.email}
                    <a href="mailto:{s.email}" aria-label="Email {s.name}" class="text-slate-400 hover:text-blue-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </a>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
    </div><!-- closes pt-4 -->
  </div><!-- closes space-y-0 -->
{/if}

<!-- Announce modal -->
{#if showAnnounceModal && selectedClass}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div role="presentation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onclick={() => (showAnnounceModal = false)}>
    <div role="dialog" aria-modal="true" aria-label="Post announcement" class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <div class="border-b border-slate-100 px-6 py-4">
        <h3 class="text-lg font-semibold text-slate-900">Post</h3>
      </div>
      <!-- Body -->
      <div class="px-6 py-4 space-y-3">
        <textarea
          rows="5"
          placeholder="Announce something to your class"
          class="w-full resize-none rounded-none border-0 border-b-2 border-blue-500 bg-transparent px-0 py-2 text-sm text-slate-800 placeholder:text-blue-400 outline-none focus:border-blue-600"
          bind:value={announceText}
        ></textarea>
        <!-- Formatting toolbar -->
        <div class="flex items-center gap-1">
          <button class="rounded p-1.5 text-slate-500 hover:bg-slate-100 font-bold text-sm">B</button>
          <button class="rounded p-1.5 text-slate-500 hover:bg-slate-100 italic text-sm">I</button>
          <button class="rounded p-1.5 text-slate-500 hover:bg-slate-100 underline text-sm">U</button>
          <button aria-label="Bulleted list" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
          </button>
          <button aria-label="Remove formatting" class="rounded p-1.5 text-slate-500 hover:bg-slate-100 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <!-- Attachment row + actions -->
      <div class="flex items-center justify-between px-6 pb-5">
        <div class="flex items-center gap-2">
          <button aria-label="Attach from Drive" class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          </button>
          <button aria-label="Attach YouTube video" class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
          </button>
          <button aria-label="Upload file" class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
          <button aria-label="Attach link" class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button onclick={() => (showAnnounceModal = false)} class="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Cancel</button>
          <button
            disabled
            title="Announcements coming soon"
            class="rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-400 cursor-not-allowed opacity-60"
          >Post (coming soon)</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Grade modal -->
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
        <label for="gpoints" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Points (max {selectedAssignment.totalPoints})</label>
        <input id="gpoints" type="number" min={0} max={selectedAssignment.totalPoints} class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={grading.points} />
      </div>
      <div>
        <label for="gcomment" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Comment</label>
        <textarea id="gcomment" rows={3} class="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" bind:value={grading.comment}></textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button onclick={() => (grading = null)} class="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
        <button onclick={() => gradeSubmission(selectedAssignment!._id)} disabled={gradeSaving} class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <CheckCircle2 class="h-4 w-4" /> {gradeSaving ? 'Saving…' : 'Save Grade'}
        </button>
      </div>
    </div>
  </div>
{/if}

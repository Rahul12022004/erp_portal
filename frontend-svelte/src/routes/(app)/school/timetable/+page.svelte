<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  type ViewMode = 'class' | 'teacher' | 'room';

  type ClassData = { id: string; name: string; section: string };
  type TeacherData = { id: string; name: string; subject: string };
  type RoomData = { id: string; name: string };
  type SubjectSetup = { subject: string; teacherId: string; periodsPerWeek: number; roomId: string };
  type TimetableEntry = { id: string; classId: string; day: DayKey; slotIndex: number; subject: string; teacherId: string; roomId: string; locked: boolean };
  type Conflict = { id: string; type: string; message: string; classId?: string; teacherId?: string; roomId?: string; day?: DayKey; slotIndex?: number };
  type EditorState = { open: boolean; classId: string; day: DayKey; slotIndex: number; entryId?: string };

  const DAYS: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_HEADER_CLASSES: Record<DayKey, string> = {
    Mon: 'bg-teal-50 text-teal-800',
    Tue: 'bg-cyan-50 text-cyan-800',
    Wed: 'bg-emerald-50 text-emerald-800',
    Thu: 'bg-sky-50 text-sky-800',
    Fri: 'bg-lime-50 text-lime-800',
    Sat: 'bg-amber-50 text-amber-800',
  };

  const schoolId = $derived($page.data.user?.schoolId ?? '');

  let loading = $state(true);
  let error = $state<string | null>(null);

  let academicYear = $state('2026-2027');
  let selectedSection = $state('all');
  let selectedClassId = $state('');
  let selectedTeacherId = $state('all');
  let selectedRoomId = $state('all');
  let viewMode = $state<ViewMode>('class');
  let includeSaturdayInPdf = $state(false);

  let schoolStartTime = $state('07:30');
  let periodDuration = $state(60);
  let slotsPerDay = $state(7);

  let classes = $state<ClassData[]>([]);
  let teachers = $state<TeacherData[]>([]);
  let rooms = $state<RoomData[]>([]);
  let subjectSetupByClass = $state<Record<string, SubjectSetup[]>>({});
  let teacherUnavailableSlotKeys = $state<Record<string, Set<string>>>({});
  let entries = $state<TimetableEntry[]>([]);

  let dragEntryId = $state<string | null>(null);
  let editor = $state<EditorState | null>(null);
  let editorSubject = $state('');
  let editorTeacherId = $state('');
  let editorRoomId = $state('');
  let editorLocked = $state(false);

  function genId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function normalize(v: string) { return String(v || '').trim().toLowerCase(); }

  function createSlotLabel(startTime: string, durMin: number, slotIndex: number) {
    const [h, m] = startTime.split(':');
    const base = Number(h) * 60 + Number(m);
    const from = base + durMin * slotIndex;
    const to = from + durMin;
    const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    return `${fmt(from)}-${fmt(to)}`;
  }

  const slots = $derived(Array.from({ length: slotsPerDay }, (_, i) => createSlotLabel(schoolStartTime, periodDuration, i)));

  const teacherById = $derived(Object.fromEntries(teachers.map(t => [t.id, t])));
  const roomById = $derived(Object.fromEntries(rooms.map(r => [r.id, r])));
  const classById = $derived(Object.fromEntries(classes.map(c => [c.id, c])));

  const sectionOptions = $derived(['all', ...Array.from(new Set(classes.map(c => c.section).filter(Boolean)))]);

  const classOptions = $derived(selectedSection === 'all' ? classes : classes.filter(c => c.section === selectedSection));

  const setupForSelectedClass = $derived(subjectSetupByClass[selectedClassId] || []);

  $effect(() => {
    if (!classOptions.some(c => c.id === selectedClassId)) {
      selectedClassId = classOptions[0]?.id || '';
    }
  });

  $effect(() => {
    if (viewMode === 'teacher' && selectedTeacherId === 'all' && teachers.length > 0) {
      selectedTeacherId = teachers[0].id;
    }
  });

  $effect(() => {
    if (viewMode === 'room' && selectedRoomId === 'all' && rooms.length > 0) {
      selectedRoomId = rooms[0].id;
    }
  });

  function findTeacherForSubject(subject: string, classId: string): string {
    const setup = (subjectSetupByClass[classId] || []).find(s => normalize(s.subject) === normalize(subject));
    if (setup?.teacherId) return setup.teacherId;
    return teachers.find(t => normalize(t.subject).includes(normalize(subject)))?.id || teachers[0]?.id || '';
  }

  function getEntry(classId: string, day: DayKey, slotIndex: number) {
    return entries.find(e => e.classId === classId && e.day === day && e.slotIndex === slotIndex);
  }

  function classGridEntry(day: DayKey, slotIndex: number) {
    if (!selectedClassId) return undefined;
    return getEntry(selectedClassId, day, slotIndex);
  }

  function teacherGridEntry(day: DayKey, slotIndex: number) {
    if (selectedTeacherId === 'all') return entries.find(e => e.day === day && e.slotIndex === slotIndex);
    return entries.find(e => e.teacherId === selectedTeacherId && e.day === day && e.slotIndex === slotIndex);
  }

  function roomGridEntry(day: DayKey, slotIndex: number) {
    if (selectedRoomId === 'all') return entries.find(e => e.day === day && e.slotIndex === slotIndex);
    return entries.find(e => e.roomId === selectedRoomId && e.day === day && e.slotIndex === slotIndex);
  }

  function currentGridEntry(day: DayKey, slotIndex: number) {
    if (viewMode === 'teacher') return teacherGridEntry(day, slotIndex);
    if (viewMode === 'room') return roomGridEntry(day, slotIndex);
    return classGridEntry(day, slotIndex);
  }

  const detectConflicts = $derived.by(() => {
    const found: Conflict[] = [];
    const teacherMap: Record<string, TimetableEntry[]> = {};
    const roomMap: Record<string, TimetableEntry[]> = {};
    const classMap: Record<string, TimetableEntry[]> = {};

    for (const entry of entries) {
      const slot = `${entry.day}-${entry.slotIndex}`;
      const tk = `${slot}-${entry.teacherId}`;
      const rk = `${slot}-${entry.roomId}`;
      const ck = `${slot}-${entry.classId}`;
      teacherMap[tk] = [...(teacherMap[tk] || []), entry];
      roomMap[rk] = [...(roomMap[rk] || []), entry];
      classMap[ck] = [...(classMap[ck] || []), entry];

      if (teacherUnavailableSlotKeys[entry.teacherId]?.has(slot)) {
        found.push({
          id: `unavailable-${entry.id}`,
          type: 'Unavailable',
          message: `${teacherById[entry.teacherId]?.name || 'Teacher'} unavailable at ${entry.day} ${slots[entry.slotIndex]}`,
          classId: entry.classId, teacherId: entry.teacherId, day: entry.day, slotIndex: entry.slotIndex,
        });
      }
    }

    for (const list of Object.values(teacherMap)) {
      if (list.length > 1) {
        const s = list[0];
        found.push({ id: `teacher-${s.day}-${s.slotIndex}-${s.teacherId}`, type: 'Teacher', message: `${teacherById[s.teacherId]?.name || 'Teacher'} has multiple classes at ${s.day} ${slots[s.slotIndex]}`, teacherId: s.teacherId, day: s.day, slotIndex: s.slotIndex });
      }
    }
    for (const list of Object.values(roomMap)) {
      if (list.length > 1) {
        const s = list[0];
        found.push({ id: `room-${s.day}-${s.slotIndex}-${s.roomId}`, type: 'Room', message: `${roomById[s.roomId]?.name || 'Room'} is double booked at ${s.day} ${slots[s.slotIndex]}`, roomId: s.roomId, day: s.day, slotIndex: s.slotIndex });
      }
    }
    for (const list of Object.values(classMap)) {
      if (list.length > 1) {
        const s = list[0];
        found.push({ id: `class-${s.day}-${s.slotIndex}-${s.classId}`, type: 'Class', message: `${classById[s.classId]?.name || 'Class'} has multiple subjects in one slot`, classId: s.classId, day: s.day, slotIndex: s.slotIndex });
      }
    }
    return found;
  });

  const conflictKeySet = $derived.by(() => {
    const keys = new Set<string>();
    for (const c of detectConflicts) {
      if (c.classId && c.day !== undefined && c.slotIndex !== undefined) keys.add(`${c.classId}-${c.day}-${c.slotIndex}`);
    }
    return keys;
  });

  const visibleConflicts = $derived(detectConflicts.slice(0, 8));

  function buildInitialEntries(cls: ClassData[], tch: TeacherData[], rms: RoomData[], setup: Record<string, SubjectSetup[]>, unavailable: Record<string, Set<string>>) {
    const initial: TimetableEntry[] = [];
    for (const schoolClass of cls) {
      const classSetup = (setup[schoolClass.id] || []).filter(s => s.periodsPerWeek > 0);
      if (classSetup.length === 0) continue;
      const queue = classSetup.flatMap(s => Array.from({ length: s.periodsPerWeek }, () => s));
      let ptr = 0;
      for (const day of DAYS) {
        for (let slotIndex = 0; slotIndex < 7; slotIndex++) {
          const item = queue[ptr % queue.length];
          ptr++;
          const preferred = item.teacherId || tch.find(t => normalize(t.subject).includes(normalize(item.subject)))?.id || tch[0]?.id || '';
          const slotKey = `${day}-${slotIndex}`;
          const isUnavail = unavailable[preferred]?.has(slotKey);
          const teacherId = isUnavail ? (tch.find(t => normalize(t.subject).includes(normalize(item.subject)) && !unavailable[t.id]?.has(slotKey))?.id || preferred) : preferred;
          initial.push({ id: genId(), classId: schoolClass.id, day, slotIndex, subject: item.subject, teacherId, roomId: item.roomId || rms[0]?.id || '', locked: false });
        }
      }
    }
    return initial;
  }

  onMount(async () => {
    if (!schoolId) return;
    try {
      loading = true;
      error = null;

      const [clsRes, staffRes] = await Promise.all([
        fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
        fetch(`/api/staff/${schoolId}`).then(r => r.json()),
      ]);

      const rawClasses: ClassData[] = (Array.isArray(clsRes) ? clsRes : clsRes?.data || []).map((c: Record<string, string>) => ({ id: c._id || c.id || '', name: c.name || '', section: c.section || '' })).filter((c: ClassData) => c.id && c.name);

      const rawStaff: (TeacherData & { position?: string })[] = (Array.isArray(staffRes) ? staffRes : staffRes?.data || []).map((s: Record<string, string>) => ({ id: s._id || s.id || '', name: s.name || '', subject: s.subject || s.department || s.position || 'General', position: (s.position || '').toLowerCase() })).filter((s: TeacherData) => s.id && s.name);

      const teachersOnly = rawStaff.filter(s => s.position?.includes('teacher'));
      const rawTeachers: TeacherData[] = (teachersOnly.length > 0 ? teachersOnly : rawStaff).map(({ id, name, subject }) => ({ id, name, subject }));

      const rawRooms: RoomData[] = rawClasses.map(c => ({ id: `room-${c.id}`, name: `${c.name}${c.section ? ` ${c.section}` : ''} Room` }));

      const uniqueSubjects = Array.from(new Set(rawTeachers.map(t => t.subject).filter(Boolean))).slice(0, 8);
      const setup: Record<string, SubjectSetup[]> = {};
      for (const cls of rawClasses) {
        setup[cls.id] = uniqueSubjects.map((subject, i) => {
          const teacher = rawTeachers.find(t => t.subject === subject) || rawTeachers[i % rawTeachers.length];
          return { subject, teacherId: teacher?.id || '', periodsPerWeek: 4, roomId: rawRooms[0]?.id || '' };
        });
      }

      classes = rawClasses;
      teachers = rawTeachers;
      rooms = rawRooms;
      subjectSetupByClass = setup;
      teacherUnavailableSlotKeys = {};

      if (rawClasses.length > 0) selectedClassId = rawClasses[0].id;

      if (rawClasses.length > 0 && rawTeachers.length > 0 && rawRooms.length > 0) {
        entries = buildInitialEntries(rawClasses, rawTeachers, rawRooms, setup, {});
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unable to load timetable data.';
    } finally {
      loading = false;
    }
  });

  function generateTimetable(scope: 'all' | 'selected' = 'all') {
    const targetIds = scope === 'selected' && selectedClassId ? new Set([selectedClassId]) : new Set(classes.map(c => c.id));
    const locked = entries.filter(e => e.locked && targetIds.has(e.classId));
    const preserved = entries.filter(e => !targetIds.has(e.classId));
    const generated: TimetableEntry[] = [...preserved, ...locked];

    for (const cls of classes.filter(c => targetIds.has(c.id))) {
      const setup = (subjectSetupByClass[cls.id] || []).filter(s => s.periodsPerWeek > 0);
      if (setup.length === 0) continue;
      const queue = setup.flatMap(s => Array.from({ length: s.periodsPerWeek }, () => s));
      let ptr = 0;
      for (const day of DAYS) {
        for (let slotIndex = 0; slotIndex < slotsPerDay; slotIndex++) {
          const lockedEntry = locked.find(e => e.classId === cls.id && e.day === day && e.slotIndex === slotIndex);
          if (lockedEntry) continue;
          const item = queue[ptr % queue.length];
          ptr++;
          const teacherId = item.teacherId || findTeacherForSubject(item.subject, cls.id);
          const slotKey = `${day}-${slotIndex}`;
          const unavail = teacherUnavailableSlotKeys[teacherId]?.has(slotKey);
          const finalTeacher = unavail ? (teachers.find(t => normalize(t.subject).includes(normalize(item.subject)) && !teacherUnavailableSlotKeys[t.id]?.has(slotKey))?.id || teacherId) : teacherId;
          generated.push({ id: genId(), classId: cls.id, day, slotIndex, subject: item.subject, teacherId: finalTeacher, roomId: item.roomId || rooms[0]?.id || '', locked: false });
        }
      }
    }
    entries = generated;
  }

  function fixConflictsOnly() {
    entries = entries.map(entry => {
      if (entry.locked) return entry;
      const slotKey = `${entry.day}-${entry.slotIndex}`;
      let nextTeacherId = entry.teacherId;
      let nextRoomId = entry.roomId;

      const teacherClash = entries.some(o => o.id !== entry.id && o.teacherId === entry.teacherId && o.day === entry.day && o.slotIndex === entry.slotIndex);
      if (teacherClash || teacherUnavailableSlotKeys[entry.teacherId]?.has(slotKey)) {
        const alt = teachers.find(t => normalize(t.subject).includes(normalize(entry.subject)) && !teacherUnavailableSlotKeys[t.id]?.has(slotKey) && !entries.some(o => o.id !== entry.id && o.teacherId === t.id && o.day === entry.day && o.slotIndex === entry.slotIndex));
        if (alt) nextTeacherId = alt.id;
      }

      const roomClash = entries.some(o => o.id !== entry.id && o.roomId === entry.roomId && o.day === entry.day && o.slotIndex === entry.slotIndex);
      if (roomClash) {
        const alt = rooms.find(r => !entries.some(o => o.id !== entry.id && o.roomId === r.id && o.day === entry.day && o.slotIndex === entry.slotIndex));
        if (alt) nextRoomId = alt.id;
      }
      return { ...entry, teacherId: nextTeacherId, roomId: nextRoomId };
    });
  }

  function autoFillEmptySlots() {
    if (!selectedClassId) return;
    const classSetup = subjectSetupByClass[selectedClassId] || [];
    if (classSetup.length === 0) return;

    const existing = entries.filter(e => e.classId === selectedClassId);
    const subjectCount = existing.reduce<Record<string, number>>((acc, e) => { acc[e.subject] = (acc[e.subject] || 0) + 1; return acc; }, {});

    const queue: SubjectSetup[] = [];
    for (const s of classSetup) {
      const remaining = Math.max(s.periodsPerWeek - (subjectCount[s.subject] || 0), 0);
      for (let i = 0; i < remaining; i++) queue.push(s);
    }
    if (queue.length === 0) return;

    let qi = 0;
    const next = [...entries];
    for (const day of DAYS) {
      for (let slotIndex = 0; slotIndex < slotsPerDay; slotIndex++) {
        if (next.find(e => e.classId === selectedClassId && e.day === day && e.slotIndex === slotIndex) || qi >= queue.length) continue;
        const s = queue[qi++];
        next.push({ id: genId(), classId: selectedClassId, day, slotIndex, subject: s.subject, teacherId: s.teacherId || findTeacherForSubject(s.subject, selectedClassId), roomId: s.roomId || rooms[0]?.id || '', locked: false });
      }
    }
    entries = next;
  }

  function openEditor(day: DayKey, slotIndex: number) {
    const existing = currentGridEntry(day, slotIndex);
    const viewClassId = existing?.classId || selectedClassId;
    if (!viewClassId) return;
    editor = { open: true, classId: viewClassId, day, slotIndex, entryId: existing?.id };
    editorSubject = existing?.subject || setupForSelectedClass[0]?.subject || '';
    editorTeacherId = existing?.teacherId || setupForSelectedClass[0]?.teacherId || teachers[0]?.id || '';
    editorRoomId = existing?.roomId || setupForSelectedClass[0]?.roomId || rooms[0]?.id || '';
    editorLocked = Boolean(existing?.locked);
  }

  function saveEditor() {
    if (!editor) return;
    const teacherId = editorTeacherId || findTeacherForSubject(editorSubject, editor.classId);
    const withoutSlot = entries.filter(e => !(e.classId === editor!.classId && e.day === editor!.day && e.slotIndex === editor!.slotIndex && e.id !== editor!.entryId));

    if (editor.entryId) {
      entries = withoutSlot.map(e => e.id === editor!.entryId ? { ...e, subject: editorSubject, teacherId, roomId: editorRoomId, locked: editorLocked } : e);
    } else {
      entries = [...withoutSlot, { id: genId(), classId: editor.classId, day: editor.day, slotIndex: editor.slotIndex, subject: editorSubject, teacherId, roomId: editorRoomId, locked: editorLocked }];
    }
    editor = null;
  }

  function onDragStart(entryId: string) { dragEntryId = entryId; }

  function onDropCell(day: DayKey, slotIndex: number) {
    if (!dragEntryId || !selectedClassId) return;
    const dragged = entries.find(e => e.id === dragEntryId);
    if (!dragged || dragged.classId !== selectedClassId || dragged.locked) { dragEntryId = null; return; }
    const target = entries.find(e => e.classId === selectedClassId && e.day === day && e.slotIndex === slotIndex);
    if (target?.locked) { dragEntryId = null; return; }

    if (!target) {
      entries = entries.map(e => e.id === dragged.id ? { ...e, day, slotIndex } : e);
    } else {
      entries = entries.map(e => {
        if (e.id === dragged.id) return { ...e, day: target.day, slotIndex: target.slotIndex };
        if (e.id === target.id) return { ...e, day: dragged.day, slotIndex: dragged.slotIndex };
        return e;
      });
    }
    dragEntryId = null;
  }

  function updateSubjectSetup(classId: string, index: number, updates: Partial<SubjectSetup>) {
    subjectSetupByClass = { ...subjectSetupByClass, [classId]: (subjectSetupByClass[classId] || []).map((s, i) => i === index ? { ...s, ...updates } : s) };
  }

  function handleExportExcel() {
    const exportRows = entries.map(e => ({
      classLabel: `${classById[e.classId]?.name || 'Class'}${classById[e.classId]?.section ? ` - ${classById[e.classId].section}` : ''}`,
      day: e.day, slot: slots[e.slotIndex] || `Slot ${e.slotIndex + 1}`,
      subject: e.subject, teacher: teacherById[e.teacherId]?.name || 'Teacher',
      room: roomById[e.roomId]?.name || 'Room', locked: e.locked ? 'Yes' : 'No',
    })).sort((a, b) => a.classLabel.localeCompare(b.classLabel) || DAYS.indexOf(a.day as DayKey) - DAYS.indexOf(b.day as DayKey) || a.slot.localeCompare(b.slot));

    const rows = [['Class', 'Day', 'Time Slot', 'Subject', 'Teacher', 'Room', 'Locked'], ...exportRows.map(r => [r.classLabel, r.day, r.slot, r.subject, r.teacher, r.room, r.locked])];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `timetable-${academicYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  function handleExportPdf() {
    alert('PDF export requires the jsPDF library. Use Download Excel instead, or print from the browser.');
  }
</script>

{#if loading}
  <div class="rounded-xl border border-slate-200 bg-white p-6">
    <p class="text-sm text-slate-600">Loading timetable module...</p>
  </div>
{:else if error}
  <div class="rounded-xl border border-red-200 bg-red-50 p-6">
    <p class="text-sm text-red-700">{error}</p>
  </div>
{:else}
<div class="space-y-5">
  <!-- Header -->
  <div class="rounded-xl border border-teal-100 bg-white p-5 shadow-sm">
    <h2 class="text-2xl font-bold text-slate-900">Timetable Management</h2>
    <p class="text-sm text-slate-500">Simple weekly schedule for fast generation and quick editing.</p>
  </div>

  <!-- Filters -->
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
      <label class="space-y-1 text-sm">
        <span class="text-slate-600">Academic Year</span>
        <select bind:value={academicYear} class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3">
          <option value="2025-2026">2025-2026</option>
          <option value="2026-2027">2026-2027</option>
          <option value="2027-2028">2027-2028</option>
        </select>
      </label>
      <label class="space-y-1 text-sm">
        <span class="text-slate-600">Class</span>
        <select bind:value={selectedClassId} class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3">
          {#each classOptions as cls (cls.id)}
            <option value={cls.id}>{cls.name}{cls.section ? ` - ${cls.section}` : ''}</option>
          {/each}
        </select>
      </label>
      <label class="space-y-1 text-sm">
        <span class="text-slate-600">Section</span>
        <select bind:value={selectedSection} class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3">
          {#each sectionOptions as sec (sec)}
            <option value={sec}>{sec === 'all' ? 'All' : sec}</option>
          {/each}
        </select>
      </label>
      <label class="space-y-1 text-sm">
        <span class="text-slate-600">Teacher</span>
        <select bind:value={selectedTeacherId} class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3">
          <option value="all">All</option>
          {#each teachers as t (t.id)}
            <option value={t.id}>{t.name}</option>
          {/each}
        </select>
      </label>
      <label class="space-y-1 text-sm">
        <span class="text-slate-600">Room</span>
        <select bind:value={selectedRoomId} class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3">
          <option value="all">All</option>
          {#each rooms as r (r.id)}
            <option value={r.id}>{r.name}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>

  <!-- Setup + Workflow + Actions -->
  <div class="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
    <!-- Setup Summary -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <h3 class="text-base font-semibold text-slate-900">Setup Summary</h3>
      <p class="mb-3 text-xs text-slate-500">Subjects, mapping, and periods per week</p>
      <div class="grid grid-cols-4 gap-2 px-2 text-xs font-medium text-slate-500 mb-1">
        <span>Subject</span><span>Teacher</span><span>Periods/Wk</span><span>Room</span>
      </div>
      {#each setupForSelectedClass as setup, idx (setup.subject + idx)}
        <div class="grid grid-cols-4 gap-2 rounded-lg border border-slate-100 p-2 text-xs mb-1">
          <span class="truncate font-medium text-slate-700 self-center">{setup.subject}</span>
          <select value={setup.teacherId} onchange={e => updateSubjectSetup(selectedClassId, idx, { teacherId: (e.target as HTMLSelectElement).value })} class="rounded border border-slate-200 bg-white px-1 py-1 text-xs">
            {#each teachers as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
          </select>
          <input type="number" min={1} max={12} value={setup.periodsPerWeek} oninput={e => updateSubjectSetup(selectedClassId, idx, { periodsPerWeek: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })} class="h-8 rounded border border-slate-200 bg-white px-2 text-xs" />
          <select value={setup.roomId} onchange={e => updateSubjectSetup(selectedClassId, idx, { roomId: (e.target as HTMLSelectElement).value })} class="rounded border border-slate-200 bg-white px-1 py-1 text-xs">
            {#each rooms as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
          </select>
        </div>
      {/each}
      {#if setupForSelectedClass.length === 0}
        <p class="text-xs text-slate-400 italic">No subjects configured for this class.</p>
      {/if}
    </div>

    <!-- Workflow -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <h3 class="text-base font-semibold text-slate-900">Workflow</h3>
      <p class="mb-3 text-xs text-slate-500">Guided setup for admins</p>
      <div class="space-y-1 text-sm text-slate-700">
        <p>1. Setup school timings</p>
        <p>2. Map teachers to subjects</p>
        <p>3. Define subject periods per week</p>
        <p>4. Generate timetable</p>
        <p>5. View and edit timetable</p>
      </div>
      <div class="grid grid-cols-2 gap-2 pt-3">
        <label class="text-xs text-slate-600">
          Start time
          <input type="time" bind:value={schoolStartTime} class="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2" />
        </label>
        <label class="text-xs text-slate-600">
          Slot min
          <input type="number" min={30} max={90} bind:value={periodDuration} class="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2" />
        </label>
      </div>
      <div class="mt-3">
        <label class="text-xs text-slate-600">
          Slots per day
          <input type="number" min={1} max={12} bind:value={slotsPerDay} class="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2" />
        </label>
      </div>
    </div>

    <!-- Actions -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <h3 class="text-base font-semibold text-slate-900">Actions</h3>
      <p class="mb-3 text-xs text-slate-500">Fast schedule controls</p>
      <div class="space-y-2">
        <button onclick={() => generateTimetable('all')} class="flex w-full items-center gap-2 justify-start rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          ✨ Generate Timetable
        </button>
        <button onclick={() => generateTimetable('selected')} disabled={!selectedClassId} class="flex w-full items-center gap-2 justify-start rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          ✨ Generate Selected Class Only
        </button>
        <button onclick={fixConflictsOnly} class="flex w-full items-center gap-2 justify-start rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          🪄 Fix Conflicts Only
        </button>
        <button onclick={autoFillEmptySlots} class="flex w-full items-center gap-2 justify-start rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Auto-fill Empty Slots
        </button>
        <button onclick={handleExportPdf} class="flex w-full items-center gap-2 justify-start rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          ⬇ Download PDF
        </button>
        <label class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" bind:checked={includeSaturdayInPdf} />
          Include Saturday in PDF
        </label>
        <button onclick={handleExportExcel} class="flex w-full items-center gap-2 justify-start rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          📊 Download Excel
        </button>
        <p class="pt-1 text-xs text-slate-500">Pinned periods are preserved during regenerate.</p>
      </div>
    </div>
  </div>

  <!-- Timetable Grid + Conflicts -->
  <div class="grid gap-4 xl:grid-cols-[4fr_1.25fr]">
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between gap-2 p-5 pb-3">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">Weekly Timetable</h3>
          <p class="text-xs text-slate-500">Click to edit. Drag to move or swap periods.</p>
        </div>
        <div class="flex rounded-lg border border-slate-200 overflow-hidden">
          {#each (['class', 'teacher', 'room'] as ViewMode[]) as mode}
            <button onclick={() => viewMode = mode} class="px-3 py-1.5 text-xs font-medium capitalize transition {viewMode === mode ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}">{mode}</button>
          {/each}
        </div>
      </div>
      {#if viewMode === 'teacher' && selectedTeacherId !== 'all'}
        <p class="px-5 pb-2 text-xs text-slate-500">Showing timetable for {teacherById[selectedTeacherId]?.name || 'selected teacher'}</p>
      {/if}
      {#if viewMode === 'room' && selectedRoomId !== 'all'}
        <p class="px-5 pb-2 text-xs text-slate-500">Showing timetable for {roomById[selectedRoomId]?.name || 'selected room'}</p>
      {/if}
      <div class="px-5 pb-5 overflow-x-auto">
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table class="min-w-[940px] w-full border-collapse">
            <thead>
              <tr>
                <th class="w-36 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600">Time</th>
                {#each DAYS as day}
                  <th class="border-b border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold {DAY_HEADER_CLASSES[day]}">{day}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each slots as slotLabel, slotIndex}
                <tr>
                  <td class="border-r border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-medium text-slate-600">{slotLabel}</td>
                  {#each DAYS as day}
                    {@const entry = currentGridEntry(day, slotIndex)}
                    {@const cid = entry?.classId || selectedClassId}
                    {@const hasConflict = cid ? conflictKeySet.has(`${cid}-${day}-${slotIndex}`) : false}
                    <td
                      class="border-r border-b border-slate-100 bg-white p-1 align-top"
                      ondragover={e => e.preventDefault()}
                      ondrop={() => onDropCell(day, slotIndex)}
                    >
                      <button
                        type="button"
                        onclick={() => openEditor(day, slotIndex)}
                        class="group h-[86px] w-full rounded-lg border p-2 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50 {hasConflict ? 'border-red-300' : 'border-slate-200'}"
                      >
                        {#if entry}
                          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                          <div
                            draggable={viewMode === 'class' && !entry.locked}
                            ondragstart={() => onDragStart(entry.id)}
                            role={viewMode === 'class' && !entry.locked ? 'button' : undefined}
                            tabindex={viewMode === 'class' && !entry.locked ? 0 : undefined}
                            class="h-full"
                          >
                            <div class="flex items-start justify-between gap-2">
                              <p class="line-clamp-2 text-xs font-semibold text-slate-800">{entry.subject}</p>
                              <div class="flex items-center gap-1">
                                {#if entry.locked}<span class="text-[10px] text-teal-700">🔒</span>{/if}
                                {#if hasConflict}<span class="text-[10px] text-red-600">⚠</span>{/if}
                                <span class="text-[10px] text-slate-300 opacity-0 transition group-hover:opacity-100">⠿</span>
                              </div>
                            </div>
                            <p class="mt-1 text-[11px] text-slate-600">{teacherById[entry.teacherId]?.name || 'Teacher'}</p>
                            <p class="text-[11px] text-slate-500">{roomById[entry.roomId]?.name || 'Room'}</p>
                            <div class="mt-1.5">
                              <span class="inline-block rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">{entry.subject}</span>
                            </div>
                          </div>
                        {:else}
                          <div class="flex h-full items-center justify-center text-xs text-slate-400">Click to add</div>
                        {/if}
                      </button>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Conflicts Panel -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <h3 class="text-base font-semibold text-slate-900 mb-1">Conflicts</h3>
      <p class="mb-3 text-xs text-slate-500">Small, non-intrusive warning list</p>
      <div class="space-y-2">
        {#if visibleConflicts.length === 0}
          <p class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">No conflicts found.</p>
        {:else}
          {#each visibleConflicts as conflict (conflict.id)}
            <div class="rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs text-red-700">
              <p class="font-semibold">{conflict.type} Conflict</p>
              <p>{conflict.message}</p>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
{/if}

<!-- Editor Modal -->
{#if editor?.open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
    <div class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <h3 class="text-base font-semibold text-slate-900">Edit Period</h3>
      <p class="mb-3 text-xs text-slate-500">
        {editor.day} • {slots[editor.slotIndex]} • {classById[editor.classId]?.name || 'Class'}
      </p>
      <div class="space-y-3">
        <label class="block text-sm text-slate-600">
          Subject
          <select bind:value={editorSubject} onchange={() => { if (!editorTeacherId) editorTeacherId = findTeacherForSubject(editorSubject, editor!.classId); }} class="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3">
            {#each (subjectSetupByClass[editor.classId] || []) as setup (setup.subject)}
              <option value={setup.subject}>{setup.subject}</option>
            {/each}
          </select>
        </label>
        <label class="block text-sm text-slate-600">
          Teacher
          <select bind:value={editorTeacherId} class="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3">
            {#each teachers as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
          </select>
        </label>
        <label class="block text-sm text-slate-600">
          Room (optional)
          <select bind:value={editorRoomId} class="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3">
            {#each rooms as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
          </select>
        </label>
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" bind:checked={editorLocked} />
          Pin/Lock this period
        </label>
      </div>
      <div class="mt-4 flex items-center justify-end gap-2">
        <button onclick={() => editor = null} class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
        <button onclick={saveEditor} class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">Save</button>
      </div>
    </div>
  </div>
{/if}

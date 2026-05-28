<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ChevronDown, Edit, GraduationCap, Plus, Trash2, UserPlus, Users } from 'lucide-svelte';

  type Teacher = { _id: string; name: string; email: string; position: string; status?: string };
  type Student = { _id: string; name: string; email: string; rollNumber: string; class: string; phone?: string; admissionCompleted?: boolean };
  type SchoolClass = {
    _id: string; name: string; section?: string; stream?: string;
    classTeacher?: Teacher | null; studentCount: number;
    academicYear?: string; description?: string; classCode?: string;
  };
  type ClassFormData = { name: string; section: string; stream: string; classTeacher: string; academicYear: string; description: string };

  const CLASS_NUMBER_OPTIONS = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
  const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function defaultAcademicYear() {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  }

  function getClassLabel(c: Pick<SchoolClass, 'name' | 'section'>) {
    return c.section ? `${c.name} - ${c.section}` : c.name;
  }

  function defaultForm(): ClassFormData {
    return { name: '', section: '', stream: '', classTeacher: '', academicYear: defaultAcademicYear(), description: '' };
  }

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let classes = $state<SchoolClass[]>([]);
  let students = $state<Student[]>([]);
  let teachers = $state<Teacher[]>([]);
  let loading = $state(true);
  let error = $state('');
  let showClassForm = $state(false);
  let editingClass = $state<SchoolClass | null>(null);
  let openClassName = $state('');
  let selectedClassId = $state('');
  let selectedTeacherId = $state('');
  let savingClass = $state(false);
  let savingStudent = $state(false);
  let showUnassignedStudents = $state(false);
  let classForm = $state<ClassFormData>(defaultForm());

  const activeClass = $derived(classes.find(c => c._id === selectedClassId) ?? null);

  $effect(() => {
    selectedTeacherId = activeClass?.classTeacher?._id || '';
    showUnassignedStudents = false;
    if (activeClass?.name) openClassName = activeClass.name;
  });

  const classStudents = $derived(
    !activeClass ? [] :
    students
      .filter(s => s.class === getClassLabel(activeClass!))
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber))
  );

  const unassignedStudents = $derived(() => {
    const validLabels = new Set(classes.map(c => getClassLabel(c)));
    return students.filter(s => !s.class?.trim() || !validLabels.has(s.class)).sort((a, b) => a.name.localeCompare(b.name));
  });

  const classGroups = $derived(() => {
    const grouped = classes.reduce<Record<string, SchoolClass[]>>((acc, c) => {
      (acc[c.name] ??= []).push(c);
      return acc;
    }, {});
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(([className, sections]) => ({
        className,
        sections: [...sections].sort((a, b) => (a.section || '').localeCompare(b.section || '', undefined, { sensitivity: 'base' })),
        totalStudents: sections.reduce((sum, c) => sum + c.studentCount, 0),
      }));
  });

  async function fetchData() {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      loading = true; error = '';
      const [classesRes, studentsRes, staffRes] = await Promise.all([
        fetch(`/api/classes?schoolId=${schoolId}`),
        fetch(`/api/students/${schoolId}`),
        fetch(`/api/staff/${schoolId}`),
      ]);
      if (!classesRes.ok) throw new Error(`Failed to load classes (${classesRes.status})`);
      if (!studentsRes.ok) throw new Error(`Failed to load students (${studentsRes.status})`);
      if (!staffRes.ok) throw new Error(`Failed to load teachers (${staffRes.status})`);
      const [classesData, studentsData, staffData] = await Promise.all([classesRes.json(), studentsRes.json(), staffRes.json()]);
      const unwrap = (d: unknown): unknown[] => {
        const inner = (d as Record<string, unknown>)?.data;
        if (Array.isArray(inner)) return inner;
        if (Array.isArray((inner as Record<string, unknown>)?.students)) return (inner as Record<string, unknown[]>).students;
        if (Array.isArray(d)) return d;
        return [];
      };
      classes = unwrap(classesData) as typeof classes;
      students = (unwrap(studentsData) as typeof students).filter((s) => s.admissionCompleted !== false);
      teachers = (unwrap(staffData) as typeof teachers).filter((s) => s.position?.toLowerCase() === 'teacher');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load class module';
      classes = []; students = []; teachers = [];
    } finally { loading = false; }
  }

  onMount(() => { fetchData(); });

  $effect(() => {
    if (selectedClassId && !classes.some(c => c._id === selectedClassId)) selectedClassId = '';
  });

  $effect(() => {
    if (openClassName && !classes.some(c => c.name === openClassName)) openClassName = '';
  });

  function resetClassForm() { classForm = defaultForm(); editingClass = null; showClassForm = false; }

  function toggleClassGroup(className: string) {
    if (openClassName === className) {
      if (activeClass?.name === className) { selectedClassId = ''; showUnassignedStudents = false; }
      openClassName = '';
    } else { openClassName = className; }
  }

  function toggleSectionCard(c: SchoolClass) {
    showUnassignedStudents = false;
    if (selectedClassId === c._id) { selectedClassId = ''; }
    else { selectedClassId = c._id; openClassName = c.name; }
  }

  async function handleClassSubmit(e: SubmitEvent) {
    e.preventDefault();
    const trimName = classForm.name.trim();
    const trimSection = classForm.section.trim().toUpperCase();
    if (!trimName) return alert('Class name is required.');
    if (!CLASS_NUMBER_OPTIONS.includes(trimName)) return alert('Please select a valid class number.');
    if (trimSection && !SECTION_OPTIONS.includes(trimSection)) return alert('Please select a valid section letter.');
    const dup = classes.find(c =>
      c._id !== editingClass?._id &&
      c.name.trim().toLowerCase() === trimName.toLowerCase() &&
      (c.section || '').toUpperCase() === trimSection
    );
    if (dup) return alert('This class number and section already exist.');
    try {
      savingClass = true;
      const prevLabel = editingClass ? getClassLabel(editingClass) : '';
      const nextLabel = getClassLabel({ name: trimName, section: trimSection });
      const res = await fetch(editingClass ? `/api/classes/${editingClass._id}` : '/api/classes', {
        method: editingClass ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimName, section: trimSection, stream: classForm.stream.trim(),
          classTeacher: classForm.classTeacher || null,
          academicYear: classForm.academicYear.trim(), description: classForm.description.trim(),
          schoolId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to save class');
      if (editingClass && prevLabel !== nextLabel) {
        const impacted = students.filter(s => s.class === prevLabel);
        const updates = await Promise.all(impacted.map(s => fetch(`/api/students/${s._id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class: nextLabel }),
        })));
        if (updates.some(r => !r.ok)) throw new Error('Class name changed, but some students could not be moved.');
      }
      await fetchData();
      openClassName = data.data.name;
      selectedClassId = data.data._id;
      resetClassForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save class');
    } finally { savingClass = false; }
  }

  async function handleDeleteClass(c: SchoolClass) {
    if (c.studentCount > 0) return alert('Move or remove the students from this class before deleting it.');
    if (!confirm(`Delete ${getClassLabel(c)}?`)) return;
    try {
      const res = await fetch(`/api/classes/${c._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to delete class');
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete class');
    }
  }

  function startEditClass(c: SchoolClass) {
    editingClass = c;
    classForm = { name: c.name, section: c.section || '', stream: c.stream || '', classTeacher: c.classTeacher?._id || '', academicYear: c.academicYear || defaultAcademicYear(), description: c.description || '' };
    showClassForm = true;
  }

  async function handleTeacherAssign() {
    if (!activeClass) return;
    try {
      savingClass = true;
      const res = await fetch(`/api/classes/${activeClass._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classTeacher: selectedTeacherId || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to assign class teacher');
      await fetchData();
      selectedClassId = activeClass._id;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign class teacher');
    } finally { savingClass = false; }
  }

  async function handleAssignUnassigned(studentId: string) {
    if (!activeClass) return;
    try {
      savingStudent = true;
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: getClassLabel(activeClass) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to assign student');
      await fetchData();
      selectedClassId = activeClass._id;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign student');
    } finally { savingStudent = false; }
  }
</script>

<svelte:head><title>Classes — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 class="text-2xl font-bold">Class Management</h2>
      <p class="text-sm text-muted-foreground">Create classes, assign teachers, and manage class rosters.</p>
    </div>
    <button onclick={() => (showClassForm = true)} class="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
      <Plus class="h-4 w-4" /> Create Class
    </button>
  </div>

  {#if showClassForm}
    <div class="stat-card p-6">
      <h3 class="mb-4 text-lg font-semibold">{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
      <form onsubmit={handleClassSubmit} class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select class="rounded border p-2" bind:value={classForm.name} required>
            <option value="">Select Class Number</option>
            {#each CLASS_NUMBER_OPTIONS as cn}<option value={cn}>{cn.replace('Class ', '')}</option>{/each}
          </select>
          <select class="rounded border p-2" bind:value={classForm.section}>
            <option value="">Select Section</option>
            {#each SECTION_OPTIONS as s}<option value={s}>{s}</option>{/each}
          </select>
          <input type="text" placeholder="Stream (optional)" class="rounded border p-2" bind:value={classForm.stream} />
          <select class="rounded border p-2" bind:value={classForm.classTeacher}>
            <option value="">Select Class Teacher</option>
            {#each teachers as t}<option value={t._id}>{t.name} ({t.email})</option>{/each}
          </select>
          <input type="text" placeholder="Academic Year" class="rounded border p-2" bind:value={classForm.academicYear} />
        </div>
        <textarea placeholder="Description or notes about the class" class="w-full rounded border p-2" rows={3} bind:value={classForm.description}></textarea>
        <div class="flex gap-2">
          <button type="submit" disabled={savingClass} class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60">
            {savingClass ? (editingClass ? 'Updating...' : 'Creating...') : (editingClass ? 'Update Class' : 'Create Class')}
          </button>
          <button type="button" onclick={resetClassForm} class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <p class="text-center text-gray-500">Loading classes...</p>
  {:else if error}
    <p class="text-center text-red-600">{error}</p>
  {:else}
    <div class="space-y-4">
      {#if classes.length === 0}
        <div class="stat-card p-6">
          <p class="text-sm text-gray-500">No classes found yet. Create your first class to get started.</p>
        </div>
      {:else}
        {#each classGroups() as { className, sections, totalStudents }}
          <div class="stat-card overflow-hidden border transition {openClassName === className ? 'border-blue-200 bg-white shadow-lg' : 'border-border/60 bg-white/95 shadow-sm'}">
            <div
              onclick={() => toggleClassGroup(className)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClassGroup(className); } }}
              role="button"
              tabindex="0"
              class="flex flex-col gap-4 p-5 text-left transition md:flex-row md:items-center md:justify-between {openClassName === className ? 'bg-gradient-to-r from-blue-50 via-white to-emerald-50' : 'hover:bg-slate-50'}"
            >
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-3">
                  <h3 class="text-xl font-semibold">{className}</h3>
                  <span class="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">{sections.length} section{sections.length === 1 ? '' : 's'}</span>
                  <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">{totalStudents} student{totalStudents === 1 ? '' : 's'}</span>
                </div>
                <p class="text-sm text-muted-foreground">
                  {openClassName === className ? 'Sections are open below. Click a section card to manage teacher and students.' : 'Click to open this class and view all sections.'}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <div class="grid grid-cols-2 gap-2 text-sm md:min-w-[240px]">
                  <div class="rounded-2xl border border-border/50 bg-white px-3 py-2 shadow-sm">
                    <p class="text-xs uppercase tracking-wide text-muted-foreground">Sections</p>
                    <p class="mt-1 font-medium">{sections.map(c => c.section || '-').join(', ')}</p>
                  </div>
                  <div class="rounded-2xl border border-border/50 bg-white px-3 py-2 shadow-sm">
                    <p class="text-xs uppercase tracking-wide text-muted-foreground">Active Card</p>
                    <p class="mt-1 font-medium">{activeClass?.name === className ? activeClass.section || '-' : 'None'}</p>
                  </div>
                </div>
                <ChevronDown class="h-5 w-5 text-muted-foreground transition-transform {openClassName === className ? 'rotate-180' : ''}" />
              </div>
            </div>

            {#if openClassName === className}
              <div class="space-y-4 border-t border-border/60 bg-slate-50/40 p-4 md:p-5">
                {#each sections as schoolClass}
                  <div
                    class="stat-card space-y-4 border p-5 text-left transition cursor-pointer"
                    onclick={() => toggleSectionCard(schoolClass)}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSectionCard(schoolClass); } }}
                    role="button"
                    tabindex="0"
                  >
                    <div class="flex items-start justify-between gap-3 rounded-2xl border p-4 {selectedClassId === schoolClass._id ? 'border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50' : 'border-border/60 bg-muted/20'}">
                      <div class="space-y-2">
                        <div class="flex flex-wrap items-center gap-2">
                          <h3 class="text-lg font-semibold">{getClassLabel(schoolClass)}</h3>
                          <span class="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">{schoolClass.academicYear || 'No year'}</span>
                          {#if schoolClass.classCode}
                            <span class="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono text-xs font-bold tracking-widest text-indigo-700">{schoolClass.classCode}</span>
                          {/if}
                        </div>
                        <p class="text-sm text-muted-foreground">
                          {selectedClassId === schoolClass._id ? 'Expanded class management' : 'Click to view teacher, students, and actions'}
                        </p>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          onclick={(e) => { e.stopPropagation(); startEditClass(schoolClass); }}
                          class="cursor-pointer text-blue-600 hover:text-blue-800"
                          title="Edit class"
                        ><Edit class="h-4 w-4" /></button>
                        <button
                          type="button"
                          onclick={(e) => { e.stopPropagation(); handleDeleteClass(schoolClass); }}
                          class="cursor-pointer text-red-600 hover:text-red-800"
                          title="Delete class"
                        ><Trash2 class="h-4 w-4" /></button>
                        <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform {selectedClassId === schoolClass._id ? 'rotate-180' : ''}" />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div class="rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-muted-foreground">Teacher</p>
                        <p class="mt-1 font-medium">{schoolClass.classTeacher?.name || 'Not assigned'}</p>
                      </div>
                      <div class="rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-muted-foreground">Students</p>
                        <p class="mt-1 font-medium">{schoolClass.studentCount}</p>
                      </div>
                      <div class="rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-muted-foreground">Section</p>
                        <p class="mt-1 font-medium">{schoolClass.section || '-'}</p>
                      </div>
                      <div class="rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-muted-foreground">Stream</p>
                        <p class="mt-1 font-medium">{schoolClass.stream || '-'}</p>
                      </div>
                    </div>

                    {#if schoolClass.description}
                      <div class="rounded-2xl border border-border/50 bg-amber-50/50 p-4">
                        <p class="text-xs uppercase tracking-wide text-amber-700/80">Description</p>
                        <p class="mt-2 text-sm text-muted-foreground">{schoolClass.description}</p>
                      </div>
                    {/if}

                    {#if selectedClassId === schoolClass._id && activeClass}
                      <div class="space-y-6 border-t border-border/70 pt-6" role="presentation" onclick={(e) => e.stopPropagation()}>
                        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                          <div class="space-y-4 rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <h4 class="text-base font-semibold">Assigned Teacher</h4>
                                <p class="text-sm text-muted-foreground">{activeClass.classTeacher?.name || 'No teacher assigned'}</p>
                              </div>
                              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users class="h-4 w-4" />{classStudents.length} students
                              </div>
                            </div>
                            <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                              <select class="rounded-xl border p-2.5" bind:value={selectedTeacherId}>
                                <option value="">No class teacher</option>
                                {#each teachers as t}<option value={t._id}>{t.name} ({t.email})</option>{/each}
                              </select>
                              <button type="button" onclick={handleTeacherAssign} disabled={savingClass} class="rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:opacity-60">
                                {savingClass ? 'Saving...' : 'Assign Teacher'}
                              </button>
                            </div>
                          </div>

                          <div class="space-y-4 rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                            <div class="flex items-center gap-2">
                              <UserPlus class="h-4 w-4 text-blue-600" />
                              <h4 class="text-base font-semibold">Assign Unassigned Students</h4>
                            </div>
                            <button type="button" onclick={() => (showUnassignedStudents = !showUnassignedStudents)} class="rounded-xl bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700">
                              {showUnassignedStudents ? 'Hide Unassigned Students' : 'Open Unassigned Student List'}
                            </button>
                            {#if !showUnassignedStudents}
                              <p class="text-sm text-gray-500">Open the list to see students without a valid class and add them here.</p>
                            {:else if unassignedStudents().length === 0}
                              <p class="text-sm text-gray-500">No unassigned students found.</p>
                            {:else}
                              <div class="space-y-3">
                                {#each unassignedStudents() as student}
                                  <div class="flex flex-col gap-3 rounded-2xl border border-border/50 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <p class="font-medium">{student.name}</p>
                                      <p class="text-sm text-muted-foreground">{student.email}</p>
                                      <p class="text-xs text-muted-foreground">Roll {student.rollNumber}{student.class?.trim() ? ` - current: ${student.class}` : ' - no class assigned'}</p>
                                    </div>
                                    <button type="button" onclick={() => handleAssignUnassigned(student._id)} disabled={savingStudent} class="rounded-xl bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-60">
                                      {savingStudent ? 'Adding...' : 'Add'}
                                    </button>
                                  </div>
                                {/each}
                              </div>
                            {/if}
                          </div>
                        </div>

                        <div class="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                          <div class="mb-4 flex items-center gap-2">
                            <GraduationCap class="h-4 w-4 text-blue-600" />
                            <h4 class="text-base font-semibold">Students List</h4>
                          </div>
                          {#if classStudents.length === 0}
                            <p class="text-sm text-gray-500">No students are attached to this class yet.</p>
                          {:else}
                            <div class="overflow-x-auto rounded-2xl border border-border/50">
                              <table class="w-full text-sm">
                                <thead class="bg-slate-50">
                                  <tr class="border-b">
                                    <th class="p-2 text-left">Roll No</th>
                                    <th class="p-2 text-left">Name</th>
                                    <th class="p-2 text-left">Email</th>
                                    <th class="p-2 text-left">Phone</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {#each classStudents as s}
                                    <tr class="border-b bg-white hover:bg-slate-50">
                                      <td class="p-2">{s.rollNumber}</td>
                                      <td class="p-2 font-medium">{s.name}</td>
                                      <td class="p-2">{s.email}</td>
                                      <td class="p-2">{s.phone || '-'}</td>
                                    </tr>
                                  {/each}
                                </tbody>
                              </table>
                            </div>
                          {/if}
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

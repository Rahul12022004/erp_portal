<script lang="ts">
  import { page } from '$app/stores';

  type Student = { _id: string; name: string; email: string; rollNumber: string; class: string };
  type ClassItem = { _id: string; name: string; section?: string; stream?: string; classTeacher?: { _id: string; name: string; email: string; position: string }; studentCount: number; academicYear?: string; description?: string; meetLink?: string };
  type ClassDetails = { class: ClassItem; students: Student[]; studentCount: number };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');
  const teacherName = $derived($page.data.user?.name ?? 'Teacher');

  let classList = $state<ClassItem[]>([]);
  let loading = $state(true);
  let error = $state('');
  let showForm = $state(false);
  let saving = $state(false);
  let editingClass = $state<ClassItem | null>(null);
  let expandedClass = $state<string | null>(null);
  let classDetails = $state<Record<string, ClassDetails>>({});

  const defaultYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  let formData = $state({ name: '', section: '', stream: '', academicYear: defaultYear, description: '', meetLink: '' });

  const getClassLabel = (cls: Pick<ClassItem, 'name' | 'section'>) => cls.section ? `${cls.name} - ${cls.section}` : cls.name;

  $effect(() => {
    if (!schoolId || !teacherId) { classList = []; loading = false; return; }
    loading = true; error = '';
    fetch(`/api/classes/${schoolId}`)
      .then(r => { if (!r.ok) throw new Error(`Failed to load classes (${r.status})`); return r.json(); })
      .then(data => {
        const all = Array.isArray(data) ? data : [];
        classList = all.filter((cls: ClassItem) => cls.classTeacher?._id === teacherId);
      })
      .catch(e => { error = e instanceof Error ? e.message : 'Failed to fetch classes'; })
      .finally(() => { loading = false; });
  });

  function resetForm() {
    formData = { name: '', section: '', stream: '', academicYear: defaultYear, description: '', meetLink: '' };
    editingClass = null; showForm = false;
  }

  function startEdit(cls: ClassItem) {
    formData = { name: cls.name, section: cls.section || '', stream: cls.stream || '', academicYear: cls.academicYear || '', description: cls.description || '', meetLink: cls.meetLink || '' };
    editingClass = cls; showForm = true;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!schoolId || !teacherId) { alert('Teacher session not found'); return; }
    try {
      saving = true;
      const url = editingClass ? `/api/classes/${editingClass._id}` : '/api/classes';
      const method = editingClass ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, classTeacher: teacherId, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.success === false)) throw new Error(data?.message || 'Failed to save classroom');
      const savedClass = data?.data || data;
      if (editingClass) {
        classList = classList.map(cls => cls._id === editingClass!._id ? { ...cls, ...savedClass, studentCount: cls.studentCount } : cls);
      } else {
        classList = [{ ...savedClass, studentCount: savedClass?.studentCount || 0 }, ...classList];
      }
      resetForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save classroom');
    } finally { saving = false; }
  }

  async function handleDelete(classId: string, className: string) {
    if (!confirm(`Are you sure you want to delete ${className}?`)) return;
    try {
      const res = await fetch(`/api/classes/${classId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.success === false)) throw new Error(data?.message || 'Failed to delete classroom');
      classList = classList.filter(cls => cls._id !== classId);
      const updated = { ...classDetails };
      delete updated[classId];
      classDetails = updated;
      if (expandedClass === classId) expandedClass = null;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete classroom');
    }
  }

  async function fetchClassDetails(classId: string, className: string) {
    if (!schoolId) return;
    try {
      const res = await fetch(`/api/classes/${schoolId}/${encodeURIComponent(className)}`);
      if (!res.ok) throw new Error(`Failed to load class details (${res.status})`);
      const data = await res.json();
      classDetails = { ...classDetails, [classId]: data };
    } catch { /* ignore */ }
  }

  function toggleClassDetails(classId: string, className: string) {
    if (expandedClass === classId) { expandedClass = null; return; }
    expandedClass = classId;
    if (!classDetails[classId]) fetchClassDetails(classId, className);
  }

  const classesWithMeetLinks = $derived(classList.filter(cls => cls.meetLink).length);
  const totalStudents = $derived(classList.reduce((sum, cls) => sum + cls.studentCount, 0));
</script>

<svelte:head><title>Digital Classroom — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="stat-card p-6">
    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 class="text-2xl font-bold">My Digital Classrooms</h3>
        <p class="text-sm text-muted-foreground">Manage your online classes, open meeting links, and keep track of the students learning with you.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary font-medium">{teacherName}</div>
        <button onclick={() => { if (showForm) { resetForm(); } else { editingClass = null; showForm = true; } }}
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700">
          + Create Classroom
        </button>
      </div>
    </div>
  </div>

  {#if showForm}
    <div class="stat-card p-6">
      <h3 class="text-lg font-semibold mb-4">{editingClass ? 'Edit Digital Classroom' : 'Create Digital Classroom'}</h3>
      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
            <select class="border rounded p-2 w-full" bind:value={formData.name} required>
              <option value="">Select Class</option>
              {#each Array.from({ length: 12 }, (_, i) => i + 1) as num}
                <option value="Class {num}">Class {num}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select class="border rounded p-2 w-full" bind:value={formData.section}>
              <option value="">Select Section</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Stream</label>
            <select class="border rounded p-2 w-full" bind:value={formData.stream}>
              <option value="">Select Stream</option>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
              <option value="General">General</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <input type="text" placeholder="e.g. 2026-2027" class="border rounded p-2 w-full" bind:value={formData.academicYear} />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Google Meet Link</label>
          <input type="url" placeholder="https://meet.google.com/xxx-xxxx-xxx" class="border rounded p-2 w-full" bind:value={formData.meetLink} />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Teaching Notes</label>
          <textarea placeholder="Add a short note for this classroom..." class="border rounded p-2 w-full" rows={3} bind:value={formData.description}></textarea>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" disabled={saving}>
            {saving ? 'Saving...' : editingClass ? 'Update Classroom' : 'Create Classroom'}
          </button>
          <button type="button" onclick={resetForm} class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <p class="text-center text-gray-500">Loading classes...</p>
  {:else if error}
    <p class="text-center text-red-600">{error}</p>
  {:else if classList.length === 0}
    <p class="text-center text-gray-500">No digital classroom classes are assigned to this teacher yet.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each classList as cls (cls._id)}
        <div class="stat-card p-6 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-xl font-bold">{cls.name}</h3>
              <p class="text-sm text-gray-600">
                {cls.section ? `Section ${cls.section}` : 'Section not set'}
                {cls.stream ? ` • ${cls.stream}` : ''}
              </p>
            </div>
            {#if cls.meetLink}
              <span class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Live Ready</span>
            {/if}
          </div>

          <div class="flex items-center justify-end gap-2">
            <button onclick={() => startEdit(cls)} class="text-blue-600 hover:text-blue-800" title="Edit classroom">✏</button>
            <button onclick={() => handleDelete(cls._id, cls.name)} class="text-red-600 hover:text-red-800" title="Delete classroom">🗑</button>
          </div>

          {#if cls.meetLink}
            <div class="border-t pt-3">
              <p class="text-xs text-gray-600 mb-2">Meeting Link</p>
              <a href={cls.meetLink} target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                ▶ Join Classroom
              </a>
            </div>
          {:else}
            <div class="border-t pt-3">
              <p class="text-sm text-gray-500">No live class link has been added yet.</p>
            </div>
          {/if}

          <div class="border-t pt-3">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">👥 {cls.studentCount} Students</span>
            </div>
          </div>

          {#if cls.academicYear}
            <div class="border-t pt-3">
              <p class="text-xs text-gray-600">Academic Year: {cls.academicYear}</p>
            </div>
          {/if}

          {#if cls.description}
            <div class="border-t pt-3">
              <p class="text-xs text-gray-600 mb-1">Teaching Notes</p>
              <p class="text-sm text-gray-700">{cls.description}</p>
            </div>
          {/if}

          {#if cls.meetLink}
            <div class="border-t pt-3">
              <a href={cls.meetLink} target="_blank" rel="noopener noreferrer"
                class="text-sm text-blue-600 hover:text-blue-800 underline break-all">
                🔗 {cls.meetLink}
              </a>
            </div>
          {/if}

          <button onclick={() => toggleClassDetails(cls._id, getClassLabel(cls))}
            class="w-full border-t pt-3 flex items-center justify-between text-blue-600 hover:text-blue-800 text-sm font-medium">
            <span>{expandedClass === cls._id ? 'Hide' : 'View'} Student List</span>
            <span class="transition-transform {expandedClass === cls._id ? 'rotate-180' : ''}">▼</span>
          </button>

          {#if expandedClass === cls._id && classDetails[cls._id]}
            <div class="border-t pt-3 space-y-2">
              <h4 class="font-semibold text-sm">Students in this class</h4>
              <div class="max-h-48 overflow-y-auto space-y-2">
                {#if classDetails[cls._id].students.length > 0}
                  {#each classDetails[cls._id].students as student (student._id)}
                    <div class="bg-gray-50 p-2 rounded text-sm">
                      <p class="font-medium">{student.rollNumber}. {student.name}</p>
                      <p class="text-xs text-gray-600">{student.email}</p>
                    </div>
                  {/each}
                {:else}
                  <p class="text-sm text-gray-500">No students in this class yet.</p>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if classList.length > 0}
    <div class="stat-card p-6">
      <h3 class="text-lg font-semibold mb-4">Teaching Overview</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><p class="text-sm text-gray-600">My Classes</p><p class="text-2xl font-bold">{classList.length}</p></div>
        <div><p class="text-sm text-gray-600">My Students</p><p class="text-2xl font-bold">{totalStudents}</p></div>
        <div><p class="text-sm text-gray-600">Live Links Ready</p><p class="text-2xl font-bold">{classesWithMeetLinks}</p></div>
        <div><p class="text-sm text-gray-600">Classes Without Links</p><p class="text-2xl font-bold">{classList.length - classesWithMeetLinks}</p></div>
      </div>
    </div>
  {/if}
</div>

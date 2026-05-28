<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Building, Edit, Home, Users } from 'lucide-svelte';

  type Student = { _id: string; name: string; class: string; rollNumber: string };
  type Hostel = { _id: string; name: string; assignedStudents: Student[] };
  type HostelForm = { hostelId: string; hostelName: string; assignedStudents: string[] };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let hostels = $state<Hostel[]>([]);
  let students = $state<Student[]>([]);
  let editingHostel = $state<HostelForm | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');

  async function fetchHostelData() {
    if (!schoolId) return;
    try {
      loading = true; error = '';
      const [hostelRes, studentRes] = await Promise.all([
        fetch(`/api/hostels/${schoolId}`),
        fetch(`/api/students/${schoolId}`),
      ]);
      if (!hostelRes.ok || !studentRes.ok) throw new Error('Failed to load hostel data');
      const unwrap = (d: unknown): unknown[] => {
        const inner = (d as Record<string, unknown>)?.data;
        if (Array.isArray(inner)) return inner;
        if (Array.isArray((inner as Record<string, unknown>)?.students)) return (inner as Record<string, unknown[]>).students;
        if (Array.isArray(d)) return d;
        return [];
      };
      hostels = unwrap(await hostelRes.json()) as typeof hostels;
      students = unwrap(await studentRes.json()) as typeof students;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load hostel data';
      hostels = []; students = [];
    } finally { loading = false; }
  }

  onMount(() => { fetchHostelData(); });

  function startEdit(hostel: Hostel) {
    editingHostel = { hostelId: hostel._id, hostelName: hostel.name, assignedStudents: hostel.assignedStudents.map(s => s._id) };
  }

  function toggleStudent(studentId: string) {
    if (!editingHostel) return;
    const ids = editingHostel.assignedStudents;
    editingHostel = { ...editingHostel, assignedStudents: ids.includes(studentId) ? ids.filter(id => id !== studentId) : [...ids, studentId] };
  }

  const studentHostelMap = $derived(
    hostels.reduce((acc, h) => { h.assignedStudents.forEach(s => { acc[s._id] = h.name; }); return acc; }, {} as Record<string, string>)
  );

  const assignmentCards = $derived(
    hostels.flatMap(h => h.assignedStudents.map(s => ({ id: `${h._id}-${s._id}`, hostelName: h.name, student: s })))
  );

  async function saveAssignments() {
    if (!editingHostel) return;
    try {
      saving = true; error = '';
      const res = await fetch(`/api/hostels/${editingHostel.hostelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedStudents: editingHostel.assignedStudents }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save hostel assignments');
      editingHostel = null;
      await fetchHostelData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save';
    } finally { saving = false; }
  }
</script>

<svelte:head><title>Hostel — ERP Portal</title></svelte:head>

<div class="space-y-6">
  {#if editingHostel}
    <div class="stat-card p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Building class="w-5 h-5 text-blue-600" />
          <h3 class="text-lg font-semibold">Assign Students to {editingHostel.hostelName}</h3>
        </div>
        <button onclick={() => (editingHostel = null)} class="text-sm text-gray-500">Close</button>
      </div>
      {#if error}<p class="text-red-600 text-sm mb-4">{error}</p>{/if}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto border rounded p-3">
        {#if students.length === 0}
          <p class="text-sm text-gray-500">No students available.</p>
        {:else}
          {#each students as student}
            {@const assignedHostel = studentHostelMap[student._id]}
            {@const isAssignedElsewhere = assignedHostel && assignedHostel !== editingHostel!.hostelName}
            {@const isSelected = editingHostel!.assignedStudents.includes(student._id)}
            <label class="flex items-center gap-2 text-sm {isAssignedElsewhere ? 'opacity-60' : ''}">
              <input type="checkbox" checked={isSelected} disabled={Boolean(isAssignedElsewhere)} onchange={() => toggleStudent(student._id)} />
              <span>{student.name} ({student.class} - {student.rollNumber}){isAssignedElsewhere ? ` - Already in ${assignedHostel}` : ''}</span>
            </label>
          {/each}
        {/if}
      </div>
      <div class="flex gap-2 mt-4">
        <button onclick={saveAssignments} disabled={saving} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          {saving ? 'Saving...' : 'Save Assignments'}
        </button>
        <button onclick={() => (editingHostel = null)} class="bg-gray-200 px-4 py-2 rounded">Cancel</button>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="text-center text-gray-500">Loading hostels...</p>
  {:else if hostels.length === 0}
    <p class="text-center text-gray-500">No hostels found.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {#each hostels as hostel}
        <div class="stat-card p-6 space-y-4">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-2">
              <Home class="w-5 h-5 text-blue-600" />
              <div>
                <h3 class="text-lg font-bold">{hostel.name}</h3>
                <p class="text-sm text-gray-500">Default Hostel</p>
              </div>
            </div>
            <button onclick={() => startEdit(hostel)} class="text-blue-600 hover:text-blue-800" title="Edit assignments">
              <Edit class="w-4 h-4" />
            </button>
          </div>
          <div class="rounded-xl bg-blue-50 p-3">
            <div class="flex items-center gap-2 mb-1">
              <Users class="w-4 h-4 text-blue-600" />
              <p class="text-sm font-medium text-blue-700">Assigned Students</p>
            </div>
            <p class="text-2xl font-bold text-blue-800">{hostel.assignedStudents.length}</p>
          </div>
          <div class="space-y-2 max-h-56 overflow-y-auto">
            {#if hostel.assignedStudents.length === 0}
              <p class="text-sm text-gray-500">No students assigned yet.</p>
            {:else}
              {#each hostel.assignedStudents as student}
                <div class="bg-gray-50 rounded p-2 text-sm">
                  <p class="font-medium">{student.name}</p>
                  <p class="text-gray-500">{student.class} - Roll {student.rollNumber}</p>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if !loading}
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <Users class="w-5 h-5 text-blue-600" />
        <h3 class="text-lg font-semibold">Student Hostel Assignments</h3>
      </div>
      {#if assignmentCards.length === 0}
        <p class="text-sm text-gray-500">No student hostel assignments yet.</p>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {#each assignmentCards as assignment}
            <div class="stat-card p-4 space-y-2">
              <p class="text-xs text-gray-500">Student</p>
              <p class="font-semibold">{assignment.student.name}</p>
              <p class="text-sm text-gray-500">{assignment.student.class} - Roll {assignment.student.rollNumber}</p>
              <div class="pt-2 border-t">
                <p class="text-xs text-gray-500">Hostel</p>
                <p class="font-medium text-blue-700">{assignment.hostelName}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

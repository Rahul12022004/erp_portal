<script lang="ts">
  import { page } from '$app/stores';

  type Assignment = { _id: string; title: string; description: string; className: string; fileName?: string; fileData?: string; dueDate?: string; createdAt?: string };
  type SchoolClass = { _id: string; name: string; classTeacher?: string | { _id: string; name: string } };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');

  let title = $state('');
  let description = $state('');
  let className = $state('');
  let file = $state<File | null>(null);
  let dueDate = $state('');
  let assignments = $state<Assignment[]>([]);
  let classes = $state<SchoolClass[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');

  $effect(() => {
    if (!schoolId || !teacherId) { loading = false; return; }
    loading = true; error = '';
    Promise.all([fetch(`/api/classes/${schoolId}`), fetch(`/api/assignments/${schoolId}/${teacherId}`)])
      .then(async ([cRes, aRes]) => {
        if (!cRes.ok) throw new Error(`Failed to load classes (${cRes.status})`);
        if (!aRes.ok) throw new Error(`Failed to load assignments (${aRes.status})`);
        const [cData, aData] = await Promise.all([cRes.json(), aRes.json()]);
        const teacherClasses = (Array.isArray(cData) ? cData : []).filter((cls: SchoolClass) => {
          if (!cls.classTeacher) return false;
          if (typeof cls.classTeacher === 'string') return cls.classTeacher === teacherId;
          return cls.classTeacher._id === teacherId;
        });
        classes = teacherClasses;
        assignments = Array.isArray(aData) ? aData : [];
      })
      .catch(e => { error = e instanceof Error ? e.message : 'Failed to load assignments'; })
      .finally(() => { loading = false; });
  });

  function resetForm() { title = ''; description = ''; className = ''; file = null; dueDate = ''; }

  async function addAssignment() {
    if (!title.trim() || !className || !schoolId || !teacherId) { alert('Title and class are required'); return; }
    try {
      saving = true;
      let fileData = '';
      if (file) {
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file!);
        });
      }
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), className, dueDate, fileName: file?.name || '', fileData, teacherId, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to create assignment');
      assignments = [data.data, ...assignments];
      resetForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create assignment');
    } finally { saving = false; }
  }

  async function deleteAssignment(assignmentId: string) {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to delete assignment');
      assignments = assignments.filter(a => a._id !== assignmentId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete assignment');
    }
  }
</script>

<svelte:head><title>Assignments — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="stat-card p-6 space-y-4">
    <h3 class="text-lg font-semibold">Add Assignment</h3>
    <input type="text" placeholder="Assignment Title" class="border p-2 rounded w-full" bind:value={title} />
    <textarea placeholder="Description" class="border p-2 rounded w-full" rows={3} bind:value={description}></textarea>
    <select class="border p-2 rounded w-full" bind:value={className} disabled={loading || classes.length === 0}>
      <option value="">Select Class</option>
      {#each classes as cls (cls._id)}
        <option value={cls.name}>{cls.name}</option>
      {/each}
    </select>
    <label class="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
      <span class="text-sm text-gray-600">{file ? file.name : 'Click to upload PDF'}</span>
      <input type="file" accept="application/pdf" class="hidden" onchange={e => { file = (e.target as HTMLInputElement).files?.[0] || null; }} />
    </label>
    <input type="date" class="border p-2 rounded w-full" bind:value={dueDate} />
    <button onclick={addAssignment} class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" disabled={saving || loading || classes.length === 0}>
      {saving ? 'Saving...' : 'Add Assignment'}
    </button>
    {#if classes.length === 0 && !loading}
      <p class="text-sm text-amber-600">No classes are assigned to this teacher yet.</p>
    {/if}
  </div>

  <div class="stat-card p-6">
    <h3 class="text-lg font-semibold mb-4">Assignments</h3>
    {#if loading}
      <p class="text-gray-500">Loading assignments...</p>
    {:else if error}
      <p class="text-red-600">{error}</p>
    {:else if assignments.length === 0}
      <p class="text-gray-500">No assignments created yet.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full border">
          <thead>
            <tr class="bg-gray-100">
              <th class="p-2 text-left">Title</th>
              <th class="p-2 text-left">Class</th>
              <th class="p-2 text-left">Description</th>
              <th class="p-2 text-left">PDF</th>
              <th class="p-2 text-left">Due Date</th>
              <th class="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each assignments as assignment (assignment._id)}
              <tr class="border-t">
                <td class="p-2">{assignment.title}</td>
                <td class="p-2">{assignment.className}</td>
                <td class="p-2 text-sm text-gray-600">{assignment.description || '-'}</td>
                <td class="p-2">
                  {#if assignment.fileData}
                    <a href={assignment.fileData} target="_blank" rel="noreferrer" class="text-blue-600 underline">{assignment.fileName || 'View PDF'}</a>
                  {:else}
                    No file
                  {/if}
                </td>
                <td class="p-2">{assignment.dueDate || '-'}</td>
                <td class="p-2">
                  <button onclick={() => deleteAssignment(assignment._id)} class="text-red-600 hover:text-red-800" title="Delete assignment">🗑</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

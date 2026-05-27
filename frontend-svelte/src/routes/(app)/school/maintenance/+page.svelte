<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { MapPin, Trash2, UserRound, Wrench } from 'lucide-svelte';

  type MaintenanceRecord = { _id: string; title: string; location: string; workDone: string; raisedBy: string; technician: string; maintenanceDate: string };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let records = $state<MaintenanceRecord[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let showForm = $state(false);
  let formData = $state({ title: '', location: '', workDone: '', raisedBy: '', technician: '', maintenanceDate: new Date().toISOString().split('T')[0] });

  onMount(async () => {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      const res = await fetch(`/api/maintenance/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      records = await res.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load';
      records = [];
    } finally { loading = false; }
  });

  function resetForm() {
    formData = { title: '', location: '', workDone: '', raisedBy: '', technician: '', maintenanceDate: new Date().toISOString().split('T')[0] };
    showForm = false;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!schoolId) { alert('School not found.'); return; }
    try {
      saving = true;
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to save');
      records = [data.data, ...records];
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally { saving = false; }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this maintenance record?')) return;
    try {
      const res = await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to delete');
      records = records.filter(r => r._id !== id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }
</script>

<svelte:head><title>Maintenance — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <button onclick={() => (showForm = !showForm)} class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
      {showForm ? 'Close Form' : 'Add Maintenance'}
    </button>
  </div>

  {#if showForm}
    <div class="stat-card p-6">
      <h3 class="mb-4 text-lg font-semibold">Add Maintenance Record</h3>
      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input type="text" placeholder="Complaint / Maintenance Title" class="rounded border p-2" bind:value={formData.title} required />
          <input type="text" placeholder="Location" class="rounded border p-2" bind:value={formData.location} required />
          <input type="text" placeholder="Raised By" class="rounded border p-2" bind:value={formData.raisedBy} required />
          <input type="text" placeholder="Technician Name" class="rounded border p-2" bind:value={formData.technician} required />
          <input type="date" class="rounded border p-2" bind:value={formData.maintenanceDate} required />
        </div>
        <textarea placeholder="What maintenance was done?" class="w-full rounded border p-2" rows={4} bind:value={formData.workDone} required></textarea>
        <div class="flex gap-2">
          <button type="submit" class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700" disabled={saving}>
            {saving ? 'Saving...' : 'Save Record'}
          </button>
          <button type="button" onclick={resetForm} class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <p class="text-center text-gray-500">Loading maintenance records...</p>
  {:else if error}
    <p class="text-center text-red-600">{error}</p>
  {:else if records.length === 0}
    <p class="text-center text-gray-500">No maintenance records yet.</p>
  {:else}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each records as record}
        <div class="stat-card space-y-4 p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold">{record.title}</h3>
              <p class="text-sm text-muted-foreground">{record.maintenanceDate}</p>
            </div>
            <button onclick={() => handleDelete(record._id)} class="text-red-600 hover:text-red-800" title="Delete">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin class="h-4 w-4" /><span>{record.location}</span>
          </div>
          <div class="rounded-lg bg-muted/40 p-3">
            <p class="text-xs uppercase tracking-wide text-muted-foreground">Work Done</p>
            <p class="mt-1 text-sm">{record.workDone}</p>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-lg bg-muted/30 p-3">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">Raised By</p>
              <p class="mt-1 inline-flex items-center gap-2 text-sm font-medium">
                <UserRound class="h-4 w-4" />{record.raisedBy}
              </p>
            </div>
            <div class="rounded-lg bg-muted/30 p-3">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">Technician</p>
              <p class="mt-1 inline-flex items-center gap-2 text-sm font-medium">
                <Wrench class="h-4 w-4" />{record.technician}
              </p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

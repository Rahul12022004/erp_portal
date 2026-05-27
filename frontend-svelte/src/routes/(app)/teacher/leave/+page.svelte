<script lang="ts">
  import { page } from '$app/stores';

  type LeaveApplication = { _id: string; title: string; description: string; leaveType: 'Paid' | 'Unpaid' | 'Emergency'; fileName?: string; fileData?: string; status: 'Pending' | 'Approved' | 'Rejected'; createdAt: string };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');

  let leaves = $state<LeaveApplication[]>([]);
  let showForm = $state(false);
  let title = $state('');
  let description = $state('');
  let leaveType = $state<'Paid' | 'Unpaid' | 'Emergency'>('Paid');
  let file = $state<File | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');

  const statusClasses: Record<string, string> = {
    Approved: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Rejected: 'bg-red-100 text-red-700',
  };

  const pendingCount = $derived(leaves.filter(l => l.status === 'Pending').length);
  const approvedCount = $derived(leaves.filter(l => l.status === 'Approved').length);
  const rejectedCount = $derived(leaves.filter(l => l.status === 'Rejected').length);
  const unpaidUsed = $derived(leaves.filter(l => l.leaveType === 'Unpaid' && l.status !== 'Rejected').length);
  const emergencyUsed = $derived(leaves.filter(l => l.leaveType === 'Emergency' && l.status !== 'Rejected').length);
  const paidUsed = $derived(leaves.filter(l => l.leaveType === 'Paid').length);

  $effect(() => {
    if (!schoolId || !teacherId) { loading = false; return; }
    loading = true; error = '';
    fetch(`/api/leaves/${schoolId}/${teacherId}`)
      .then(r => { if (!r.ok) throw new Error(`Failed to load leaves (${r.status})`); return r.json(); })
      .then(data => { leaves = Array.isArray(data) ? data : []; })
      .catch(e => { error = e instanceof Error ? e.message : 'Failed to load leave applications'; })
      .finally(() => { loading = false; });
  });

  async function handleApply() {
    if (!title.trim() || !description.trim() || !leaveType || !schoolId || !teacherId) {
      alert('Title, description and leave type are required');
      return;
    }
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
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), leaveType, fileName: file?.name || '', fileData, teacherId, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to submit leave application');
      leaves = [data.data, ...leaves];
      title = ''; description = ''; leaveType = 'Paid'; file = null; showForm = false;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to submit leave application');
    } finally { saving = false; }
  }
</script>

<svelte:head><title>Leave — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <button onclick={() => (showForm = !showForm)} class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
      + Apply Leave
    </button>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="stat-card p-4 text-center">
      <p class="text-sm text-muted-foreground">Pending</p>
      <h3 class="text-2xl font-semibold text-yellow-600">{pendingCount}</h3>
    </div>
    <div class="stat-card p-4 text-center">
      <p class="text-sm text-muted-foreground">Approved</p>
      <h3 class="text-2xl font-semibold text-green-600">{approvedCount}</h3>
    </div>
    <div class="stat-card p-4 text-center">
      <p class="text-sm text-muted-foreground">Rejected</p>
      <h3 class="text-2xl font-semibold text-red-600">{rejectedCount}</h3>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="stat-card p-4 text-center">
      <p class="text-sm text-muted-foreground">Unpaid Leave Used</p>
      <h3 class="text-2xl font-semibold">{unpaidUsed}/4</h3>
    </div>
    <div class="stat-card p-4 text-center">
      <p class="text-sm text-muted-foreground">Emergency Leave Used</p>
      <h3 class="text-2xl font-semibold">{emergencyUsed}/3</h3>
    </div>
    <div class="stat-card p-4 text-center">
      <p class="text-sm text-muted-foreground">Paid Leave Applied</p>
      <h3 class="text-2xl font-semibold">{paidUsed}</h3>
    </div>
  </div>

  {#if showForm}
    <div class="stat-card p-4 space-y-4">
      <h3 class="font-semibold">Apply for Leave</h3>
      <input type="text" placeholder="Leave Title" class="px-3 py-2 bg-muted rounded-lg w-full" bind:value={title} />
      <textarea placeholder="Description" class="px-3 py-2 bg-muted rounded-lg w-full" rows={4} bind:value={description}></textarea>
      <select class="px-3 py-2 bg-muted rounded-lg w-full" bind:value={leaveType}>
        <option value="Paid">Paid Leave</option>
        <option value="Unpaid">Unpaid Leave</option>
        <option value="Emergency">Emergency Leave</option>
      </select>
      <label class="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
        <span class="text-sm text-gray-600">{file ? file.name : 'Click to upload supporting document'}</span>
        <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" class="hidden" onchange={e => { file = (e.target as HTMLInputElement).files?.[0] || null; }} />
      </label>
      <button onclick={handleApply} class="px-4 py-2 bg-primary text-white rounded-lg" disabled={saving}>
        {saving ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  {/if}

  <div class="stat-card overflow-x-auto">
    <div class="p-4 border-b">
      <h3 class="font-semibold">Leave Applications</h3>
      <p class="text-sm text-muted-foreground mt-1">Only 4 unpaid leaves and 3 emergency leaves are allowed. All other leave applications should use paid leave.</p>
    </div>
    {#if loading}
      <p class="p-4 text-sm text-gray-500">Loading leave applications...</p>
    {:else if error}
      <p class="p-4 text-sm text-red-600">{error}</p>
    {:else if leaves.length === 0}
      <p class="p-4 text-sm text-gray-500">No leave applications yet.</p>
    {:else}
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="p-3 text-left">Title</th>
            <th class="p-3 text-left">Description</th>
            <th class="p-3 text-left">Type</th>
            <th class="p-3 text-left">File</th>
            <th class="p-3 text-left">Status</th>
            <th class="p-3 text-left">Applied On</th>
          </tr>
        </thead>
        <tbody>
          {#each leaves as leave (leave._id)}
            <tr class="border-b hover:bg-muted/30">
              <td class="p-3 font-medium">{leave.title}</td>
              <td class="p-3">{leave.description}</td>
              <td class="p-3">{leave.leaveType}</td>
              <td class="p-3">
                {#if leave.fileData}
                  <a href={leave.fileData} target="_blank" rel="noreferrer" class="text-blue-600 hover:underline">{leave.fileName || 'View File'}</a>
                {:else}
                  No file
                {/if}
              </td>
              <td class="p-3">
                <span class="px-2 py-1 rounded-full text-xs {statusClasses[leave.status] || ''}">{leave.status}</span>
              </td>
              <td class="p-3">{new Date(leave.createdAt).toLocaleDateString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

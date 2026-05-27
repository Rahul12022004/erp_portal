<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Check, FileText, X } from 'lucide-svelte';

  type TeacherInfo = { _id: string; name: string; email: string; position: string };
  type LeaveApplication = {
    _id: string; title: string; description: string;
    leaveType: 'Paid' | 'Unpaid' | 'Emergency';
    fileName?: string; fileData?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    createdAt: string;
    teacherId?: TeacherInfo;
  };

  const statusClasses: Record<LeaveApplication['status'], string> = {
    Approved: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Rejected: 'bg-red-100 text-red-700',
  };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let leaves = $state<LeaveApplication[]>([]);
  let loading = $state(true);
  let error = $state('');
  let updatingId = $state<string | null>(null);

  onMount(async () => {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      const res = await fetch(`/api/leaves/school/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      leaves = await res.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load';
    } finally { loading = false; }
  });

  async function updateLeaveStatus(leaveId: string, status: LeaveApplication['status']) {
    try {
      updatingId = leaveId; error = '';
      const res = await fetch(`/api/leaves/${leaveId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to update');
      leaves = leaves.map(l => l._id === leaveId ? { ...l, status: data.data.status } : l);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update leave';
    } finally { updatingId = null; }
  }

  const pendingCount = $derived(leaves.filter(l => l.status === 'Pending').length);
  const approvedCount = $derived(leaves.filter(l => l.status === 'Approved').length);
  const rejectedCount = $derived(leaves.filter(l => l.status === 'Rejected').length);
</script>

<svelte:head><title>Approvals — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

  <div class="stat-card p-6">
    <h3 class="mb-4 text-lg font-semibold">Teacher Leave Approvals</h3>
    {#if loading}
      <p class="text-sm text-gray-500">Loading leave requests...</p>
    {:else if error}
      <p class="text-sm text-red-600">{error}</p>
    {:else if leaves.length === 0}
      <p class="text-sm text-gray-500">No teacher leave requests yet.</p>
    {:else}
      <div class="space-y-4">
        {#each leaves as leave}
          <div class="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p class="text-lg font-semibold">{leave.title}</p>
                <p class="mt-1 text-sm text-muted-foreground">{leave.description}</p>
              </div>
              <span class="w-fit rounded-full px-2 py-1 text-xs {statusClasses[leave.status]}">{leave.status}</span>
            </div>
            <div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <p class="text-muted-foreground">Teacher</p>
                <p class="font-medium">{leave.teacherId?.name || 'Unknown Teacher'}</p>
                <p class="text-xs text-muted-foreground">{leave.teacherId?.email || '-'}</p>
              </div>
              <div>
                <p class="text-muted-foreground">Leave Type</p>
                <p class="font-medium">{leave.leaveType}</p>
                <p class="text-xs text-muted-foreground">Applied on {new Date(leave.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                {#if leave.fileData}
                  <a href={leave.fileData} target="_blank" rel="noreferrer" class="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <FileText class="h-4 w-4" />{leave.fileName || 'View Attachment'}
                  </a>
                {:else}
                  <p class="text-sm text-muted-foreground">No attachment</p>
                {/if}
              </div>
              <div class="flex gap-2">
                <button
                  onclick={() => updateLeaveStatus(leave._id, 'Approved')}
                  class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
                  disabled={updatingId === leave._id || leave.status === 'Approved'}
                >
                  <Check class="h-4 w-4" /> Approve
                </button>
                <button
                  onclick={() => updateLeaveStatus(leave._id, 'Rejected')}
                  class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                  disabled={updatingId === leave._id || leave.status === 'Rejected'}
                >
                  <X class="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

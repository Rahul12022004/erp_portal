<script lang="ts">
  import { onMount } from 'svelte';

  interface SchoolInfo {
    name: string;
    logo: string;
    email: string;
    address?: string;
    phone?: string;
    website?: string;
  }
  interface AdminInfo {
    name: string;
    email: string;
    phone: string;
  }
  interface SystemInfo {
    subscriptionPlan: string;
    maxStudents: number;
    subscriptionEndDate: string;
  }
  interface School {
    _id: string;
    schoolInfo: SchoolInfo;
    adminInfo: AdminInfo;
    systemInfo: SystemInfo;
    modules: string[];
  }

  let schools = $state<School[]>([]);
  let loading = $state(true);
  let search = $state('');
  let showModal = $state(false);
  let editData = $state<School | null>(null);
  let viewData = $state<School | null>(null);

  onMount(async () => {
    await fetchSchools();
  });

  async function fetchSchools() {
    loading = true;
    try {
      const res = await fetch('/api/schools');
      schools = await res.json();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  const filtered = $derived(
    schools.filter(s =>
      s.schoolInfo?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.schoolInfo?.email?.toLowerCase().includes(search.toLowerCase())
    )
  );

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this school?')) return;
    try {
      await fetch(`/api/schools/${id}`, { method: 'DELETE' });
      await fetchSchools();
    } catch (e) {
      console.error(e);
    }
  }

  function handleEdit(school: School) {
    editData = school;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editData = null;
  }

  function closeView() {
    viewData = null;
  }
</script>

<svelte:head><title>Schools — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Schools</h1>
      <p class="text-sm text-gray-500 mt-1">{filtered.length} school{filtered.length !== 1 ? 's' : ''}</p>
    </div>
    <button
      onclick={() => { editData = null; showModal = true; }}
      class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
    >
      + Add School
    </button>
  </div>

  <!-- Search -->
  <div class="bg-white shadow rounded-xl p-4">
    <input
      bind:value={search}
      type="text"
      placeholder="Search..."
      class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>

  <!-- Table -->
  {#if loading}
    <p class="text-gray-500">Loading...</p>
  {:else}
    <div class="bg-white shadow rounded-xl overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filtered as school}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  {#if school.schoolInfo?.logo}
                    <img src={school.schoolInfo.logo} alt="logo" class="w-8 h-8 rounded-full object-cover" />
                  {:else}
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {school.schoolInfo?.name?.charAt(0) ?? '?'}
                    </div>
                  {/if}
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{school.schoolInfo?.name}</p>
                    <p class="text-xs text-gray-500">{school.schoolInfo?.email}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.adminInfo?.name}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.systemInfo?.subscriptionPlan}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {school.systemInfo?.subscriptionEndDate
                  ? new Date(school.systemInfo.subscriptionEndDate).toLocaleDateString()
                  : '—'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <button
                    onclick={() => { viewData = school; }}
                    class="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 border border-green-200 rounded"
                    title="View"
                  >
                    Eye
                  </button>
                  <button
                    onclick={() => handleEdit(school)}
                    class="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 border border-blue-200 rounded"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onclick={() => handleDelete(school._id)}
                    class="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 border border-red-200 rounded"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr>
              <td colspan="5" class="px-6 py-8 text-center text-gray-400">No schools found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- View Modal -->
{#if viewData}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick={closeView}>
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center gap-4">
        {#if viewData.schoolInfo?.logo}
          <img src={viewData.schoolInfo.logo} alt="logo" class="w-16 h-16 rounded-full object-cover" />
        {:else}
          <div class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
            {viewData.schoolInfo?.name?.charAt(0) ?? '?'}
          </div>
        {/if}
        <div>
          <h2 class="text-xl font-bold text-gray-900">{viewData.schoolInfo?.name}</h2>
          <p class="text-sm text-gray-500">{viewData.schoolInfo?.email}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">Address</p>
          <p class="text-gray-800">{viewData.schoolInfo?.address ?? '—'}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">Phone</p>
          <p class="text-gray-800">{viewData.schoolInfo?.phone ?? '—'}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">Website</p>
          <p class="text-gray-800">{viewData.schoolInfo?.website ?? '—'}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">Admin Name</p>
          <p class="text-gray-800">{viewData.adminInfo?.name}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">Admin Email</p>
          <p class="text-gray-800">{viewData.adminInfo?.email}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">Admin Phone</p>
          <p class="text-gray-800">{viewData.adminInfo?.phone}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">Plan</p>
          <p class="text-gray-800">{viewData.systemInfo?.subscriptionPlan}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">Max Students</p>
          <p class="text-gray-800">{viewData.systemInfo?.maxStudents}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium">End Date</p>
          <p class="text-gray-800">
            {viewData.systemInfo?.subscriptionEndDate
              ? new Date(viewData.systemInfo.subscriptionEndDate).toLocaleDateString()
              : '—'}
          </p>
        </div>
      </div>

      {#if viewData.modules?.length}
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium mb-2">Modules</p>
          <div class="flex flex-wrap gap-2">
            {#each viewData.modules as mod}
              <span class="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{mod}</span>
            {/each}
          </div>
        </div>
      {/if}

      <button
        onclick={closeView}
        class="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm"
      >
        Close
      </button>
    </div>
  </div>
{/if}

<!-- Add/Edit Modal (placeholder) -->
{#if showModal}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick={closeModal}>
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onclick={(e) => e.stopPropagation()}>
      <h2 class="text-lg font-bold text-gray-900 mb-4">{editData ? 'Edit School' : 'Add School'}</h2>
      <p class="text-gray-500 text-sm">Add/Edit modal coming soon</p>
      <button
        onclick={closeModal}
        class="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm"
      >
        Close
      </button>
    </div>
  </div>
{/if}

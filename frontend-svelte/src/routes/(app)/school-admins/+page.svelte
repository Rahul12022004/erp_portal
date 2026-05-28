<script lang="ts">
  import { onMount } from 'svelte';

  interface School {
    _id: string;
    schoolInfo: { name: string; logo: string; email: string };
    adminInfo: { name: string; email: string; phone: string; status?: string };
    systemInfo: { subscriptionPlan?: string };
  }

  interface Admin {
    id: string;
    name: string;
    email: string;
    phone: string;
    school: string;
    logo: string;
    status: boolean;
    role: string;
    lastLogin: string;
  }

  let schools = $state<School[]>([]);
  let loading = $state(true);
  let search = $state('');

  onMount(async () => {
    await fetchSchools();
  });

  async function fetchSchools() {
    loading = true;
    try {
      const res = await fetch('/api/schools');
      const json = await res.json();
      schools = json?.data?.schools ?? json?.schools ?? (Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  const admins = $derived<Admin[]>(
    schools.map(s => ({
      id: s._id,
      name: s.adminInfo?.name ?? '',
      email: s.adminInfo?.email ?? '',
      phone: s.adminInfo?.phone ?? '',
      school: s.schoolInfo?.name ?? '',
      logo: s.schoolInfo?.logo ?? '',
      // Status lives in adminInfo.status ("Active" | "Disabled") — not systemInfo
      status: (s.adminInfo?.status ?? 'Active') !== 'Disabled',
      role: 'School Admin',
      lastLogin: '',  // not stored in DB
    }))
  );

  const filtered = $derived(
    admins.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.school.toLowerCase().includes(search.toLowerCase())
    )
  );

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this school admin?')) return;
    try {
      await fetch(`/api/schools/${id}`, { method: 'DELETE' });
      await fetchSchools();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggle(id: string) {
    try {
      await fetch(`/api/schools/toggle/${id}`, { method: 'PUT' });
      await fetchSchools();
    } catch (e) {
      console.error(e);
    }
  }
</script>

<svelte:head><title>School Admins — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h1 class="text-2xl font-bold text-gray-900">School Admins</h1>
    <p class="text-sm text-gray-500 mt-1">{filtered.length} admin{filtered.length !== 1 ? 's' : ''}</p>
  </div>

  <!-- Search -->
  <div class="relative">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    </span>
    <input
      bind:value={search}
      type="text"
      placeholder="Search admins..."
      class="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filtered as admin}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  {#if admin.logo}
                    <img src={admin.logo} alt="logo" class="w-8 h-8 rounded-full object-cover" />
                  {:else}
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {admin.name?.charAt(0) ?? '?'}
                    </div>
                  {/if}
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{admin.name}</p>
                    <p class="text-xs text-gray-500">{admin.email}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{admin.school}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{admin.phone}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{admin.role}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {admin.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                  {admin.status ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : '—'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <button
                    onclick={() => handleToggle(admin.id)}
                    class="text-xs font-medium px-3 py-1 rounded border {admin.status ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}"
                  >
                    {admin.status ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onclick={() => handleDelete(admin.id)}
                    class="text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 0 0-1 1v1h6V4a1 1 0 0 0-1-1m-4 0h4" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr>
              <td colspan="7" class="px-6 py-8 text-center text-gray-400">No admins found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

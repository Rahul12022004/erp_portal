<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';

  interface SchoolInfo { Name: string; Logo: string; Email: string; }
  interface AdminInfo { Name: string; Email: string; Phone: string; }
  interface SystemInfo { SubscriptionPlan: string; MaxStudents: number; SubscriptionEndDate: string; }
  interface School {
    ID: string;
    SchoolInfo: SchoolInfo;
    AdminInfo: AdminInfo;
    SystemInfo: SystemInfo;
    Modules: string[];
  }

  let schools = $state<School[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const result = await api.get<{ success: boolean; data: { schools: School[] } }>('/api/schools');
      schools = result.data?.schools ?? [];
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  const total = $derived(schools.length);
  const paid = $derived(schools.filter(s => s.SystemInfo?.SubscriptionPlan !== 'Basic').length);
  const unpaid = $derived(schools.filter(s => s.SystemInfo?.SubscriptionPlan === 'Basic').length);

  interface StatCard {
    title: string;
    value: number | string;
    color?: 'green' | 'red' | undefined;
  }

  const stats = $derived<StatCard[]>([
    { title: 'Total Schools', value: total },
    { title: 'Paid', value: paid, color: 'green' },
    { title: 'Unpaid', value: unpaid, color: 'red' },
  ]);
</script>

<svelte:head><title>Dashboard — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>

  {#if loading}
    <p class="text-gray-500">Loading...</p>
  {:else}
    <!-- Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {#each stats as stat}
        <div class="bg-white shadow rounded-xl p-5">
          <p class="text-sm text-gray-500">{stat.title}</p>
          <p class="text-2xl font-bold {stat.color === 'green' ? 'text-green-600' : stat.color === 'red' ? 'text-red-600' : 'text-gray-900'}">
            {stat.value}
          </p>
        </div>
      {/each}
    </div>

    <!-- Schools Table -->
    <div class="bg-white shadow rounded-xl overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modules</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each schools as school}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  {#if school.SchoolInfo?.Logo}
                    <img src={school.SchoolInfo.Logo} alt="logo" class="w-8 h-8 rounded-full object-cover" />
                  {:else}
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {school.SchoolInfo?.Name?.charAt(0) ?? '?'}
                    </div>
                  {/if}
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{school.SchoolInfo?.Name}</p>
                    <p class="text-xs text-gray-500">{school.SchoolInfo?.Email}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.AdminInfo?.Name}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.AdminInfo?.Email}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.AdminInfo?.Phone}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.SystemInfo?.MaxStudents}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.Modules?.length ?? 0}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.SystemInfo?.SubscriptionPlan}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {school.SystemInfo?.SubscriptionEndDate
                  ? new Date(school.SystemInfo.SubscriptionEndDate).toLocaleDateString()
                  : '—'}
              </td>
            </tr>
          {/each}
          {#if schools.length === 0}
            <tr>
              <td colspan="8" class="px-6 py-8 text-center text-gray-400">No schools found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

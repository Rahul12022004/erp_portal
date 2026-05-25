<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';

  const user = $derived($page.data.user);
</script>

<svelte:head><title>School Dashboard — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">
      {$_('dashboard.schoolAdmin.title')}
    </h1>
    <p class="text-gray-500 text-sm mt-1">
      {$_('dashboard.welcome', { values: { name: user?.name ?? '' } })}
    </p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {#each [
      { key: 'totalStudents', value: '—', color: 'text-blue-700' },
      { key: 'totalStaff', value: '—', color: 'text-green-700' },
      { key: 'attendanceToday', value: '—', color: 'text-orange-700' },
    ] as stat}
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <p class="text-sm text-gray-500 mb-1">{$_(`dashboard.schoolAdmin.${stat.key}`)}</p>
        <p class={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
      </div>
    {/each}
  </div>
</div>

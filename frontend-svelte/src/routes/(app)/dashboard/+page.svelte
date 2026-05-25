<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';

  const user = $derived($page.data.user);
</script>

<svelte:head><title>Dashboard — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">
      {$_('dashboard.superAdmin.title')}
    </h1>
    <p class="text-gray-500 text-sm mt-1">
      {$_('dashboard.welcome', { values: { name: user?.name ?? '' } })}
    </p>
  </div>

  <!-- Stats cards (placeholder data — replaced in Plan 2) -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {#each [
      { key: 'totalSchools', value: '—', color: 'bg-blue-50 text-blue-700' },
      { key: 'totalAdmins', value: '—', color: 'bg-green-50 text-green-700' },
      { key: 'activeSubscriptions', value: '—', color: 'bg-purple-50 text-purple-700' },
    ] as stat}
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <p class="text-sm text-gray-500 mb-1">{$_(`dashboard.superAdmin.${stat.key}`)}</p>
        <p class={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
      </div>
    {/each}
  </div>
</div>

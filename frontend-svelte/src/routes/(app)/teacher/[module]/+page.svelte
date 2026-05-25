<script lang="ts">
  import { page } from '$app/stores';
  import { _ } from 'svelte-i18n';

  const moduleName = $derived($page.params.module ?? '');
  const titleKey = $derived(`common.nav.${moduleName}`);
</script>

<svelte:head><title>{moduleName} — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 capitalize">
      {$_(titleKey, { default: moduleName })}
    </h1>
    <p class="text-gray-400 text-sm mt-1">Module content coming soon.</p>
  </div>

  <div class="bg-white rounded-xl border border-gray-200 border-dashed p-12 text-center">
    <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
      <span class="text-gray-400 text-lg font-bold capitalize">{moduleName.charAt(0)}</span>
    </div>
    <p class="text-gray-500 text-sm">
      <strong class="capitalize">{moduleName}</strong> module — implementation in Plan 2
    </p>
  </div>
</div>

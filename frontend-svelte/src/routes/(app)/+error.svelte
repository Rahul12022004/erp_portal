<script lang="ts">
  import { page } from '$app/stores';
  import { _ } from 'svelte-i18n';
</script>

<div class="flex items-center justify-center min-h-[60vh]">
  <div class="text-center max-w-md">
    <h2 class="text-4xl font-bold text-gray-200 mb-2">{$page.status}</h2>
    <h3 class="text-lg font-semibold text-gray-700 mb-2">
      {$page.status === 403 ? $_('error.unauthorized') : $_('error.serverError')}
    </h3>
    <p class="text-gray-500 text-sm mb-6">{$page.error?.message ?? ''}</p>
    <a
      href="/"
      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
    >
      {$_('error.goHome')}
    </a>
  </div>
</div>

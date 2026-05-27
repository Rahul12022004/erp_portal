<script lang="ts">
  import { page } from '$app/stores';
  import { _, isLoading } from 'svelte-i18n';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="text-center max-w-md px-4">
    <h1 class="text-6xl font-bold text-gray-300 mb-4">{$page.status}</h1>
    <h2 class="text-xl font-semibold text-gray-800 mb-2">
      {#if !$isLoading}
        {$page.status === 404 ? $_('error.notFound') : $_('error.serverError')}
      {:else}
        {$page.status === 404 ? 'Page not found' : 'Server error'}
      {/if}
    </h2>
    <p class="text-gray-500 mb-6">{$page.error?.message ?? ''}</p>
    <a
      href="/"
      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      {#if !$isLoading}{$_('error.goHome')}{:else}Go Home{/if}
    </a>
  </div>
</div>

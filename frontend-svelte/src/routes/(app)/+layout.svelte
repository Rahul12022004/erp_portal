<script lang="ts">
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import TopNavbar from '$lib/components/layout/TopNavbar.svelte';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  let sidebarOpen = $state(true);

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }
</script>

<div class="flex h-screen overflow-hidden bg-gray-50">
  <!-- Sidebar -->
  <div
    class={[
      'transition-all duration-200 flex-shrink-0',
      sidebarOpen ? 'w-60' : 'w-0 overflow-hidden',
    ].join(' ')}
  >
    {#if data.user}
      <Sidebar user={data.user} />
    {/if}
  </div>

  <!-- Main content area -->
  <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
    {#if data.user}
      <TopNavbar user={data.user} onToggleSidebar={toggleSidebar} />
    {/if}

    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>

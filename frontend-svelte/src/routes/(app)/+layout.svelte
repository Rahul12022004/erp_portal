<script lang="ts">
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import TopNavbar from '$lib/components/layout/TopNavbar.svelte';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="flex min-h-screen w-full">
  <Sidebar user={data.user} />
  <div class="flex-1 flex flex-col ml-0 lg:ml-64">
    <TopNavbar user={data.user} />
    <main class="flex-1 p-6 pt-20 lg:pt-6 overflow-auto">
      {@render children()}
    </main>
  </div>
</div>

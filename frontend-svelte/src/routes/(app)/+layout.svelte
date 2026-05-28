<script lang="ts">
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import TopNavbar from '$lib/components/layout/TopNavbar.svelte';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const ann = $derived(data.announcement);
  const role = $derived(data.user?.role ?? '');

  const showBanner = $derived(
    !!ann &&
    ann.enabled &&
    !!ann.message &&
    (ann.target === 'all' || ann.target === role)
  );

  const bannerClass = $derived(
    ann?.type === 'critical' ? 'bg-red-600 text-white' :
    ann?.type === 'warning'  ? 'bg-yellow-400 text-yellow-900' :
                               'bg-blue-600 text-white'
  );
</script>

<div class="flex min-h-screen w-full">
  <Sidebar user={data.user} />
  <div class="flex-1 flex flex-col ml-0 lg:ml-64">
    <TopNavbar user={data.user} />

    {#if showBanner}
      <div class="w-full px-4 py-2.5 text-sm font-medium text-center {bannerClass} lg:pl-4">
        {ann?.message}
      </div>
    {/if}

    <main class="flex-1 p-6 pt-20 lg:pt-6 overflow-auto">
      {@render children()}
    </main>
  </div>
</div>

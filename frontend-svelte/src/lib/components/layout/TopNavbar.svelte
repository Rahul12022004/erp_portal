<script lang="ts">
  import { page } from '$app/stores';
  import { Bell, ChevronDown, LogOut, PencilLine } from 'lucide-svelte';
  import type { User } from '$lib/types';

  let { user }: { user: User | undefined } = $props();

  let dropdownOpen = $state(false);

  const role = $derived(user?.role ?? 'super-admin');
  const currentPath = $derived($page.url.pathname);

  const superAdminTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/schools': 'Schools Management',
    '/school-admins': 'School Admins',
    '/subscriptions': 'Subscriptions',
    '/settings': 'Settings',
    '/logs': 'Activity Logs',
    '/security': 'Security',
    '/user-change': 'User Change',
  };

  const title = $derived((() => {
    if (role === 'super-admin') return superAdminTitles[currentPath] ?? 'Dashboard';
    if (role === 'school-admin' && currentPath === '/school') return 'School Dashboard';
    if (role === 'teacher' && currentPath === '/teacher') return 'Teacher Dashboard';
    const segment = currentPath.split('/').filter(Boolean).pop() ?? 'dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  })());

  const displayName = $derived(user?.name ?? (role === 'super-admin' ? 'Super Admin' : role === 'school-admin' ? 'School Admin' : 'Teacher'));
  const displayEmail = $derived(user?.email ?? '');

  const initials = $derived(
    displayName
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AD'
  );

  function closeDropdown() {
    dropdownOpen = false;
  }
</script>

<svelte:window onclick={(e) => { if (!(e.target as Element).closest('.navbar-dropdown')) dropdownOpen = false; }} />

<header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
  <div>
    <h1 class="text-lg font-semibold text-foreground">{title}</h1>
    <p class="text-sm text-muted-foreground">Manage your workspace from one place.</p>
  </div>

  <div class="flex items-center gap-4">
    <button
      type="button"
      class="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell class="h-4 w-4" />
    </button>

    <!-- User dropdown -->
    <div class="relative navbar-dropdown">
      <button
        type="button"
        onclick={() => (dropdownOpen = !dropdownOpen)}
        class="flex items-center gap-3 rounded-full border border-border bg-background/80 px-2 py-1.5 shadow-sm backdrop-blur transition-colors hover:bg-muted"
      >
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
          {initials}
        </div>
        <div class="hidden text-left sm:block">
          <p class="text-sm font-medium text-foreground">{displayName}</p>
          <p class="text-xs text-muted-foreground">{displayEmail}</p>
        </div>
        <ChevronDown class="h-4 w-4 text-muted-foreground" />
      </button>

      {#if dropdownOpen}
        <div class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-lg z-50">
          <div class="px-3 py-2.5 border-b border-border">
            <p class="text-sm font-semibold">{displayName}</p>
            <p class="text-xs text-muted-foreground">{displayEmail}</p>
          </div>

          {#if role === 'school-admin'}
            <a
              href="/school/profile"
              onclick={closeDropdown}
              class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <PencilLine class="h-4 w-4" />
              View Profile
            </a>
            <div class="border-t border-border"></div>
          {/if}

          <form method="POST" action="/logout">
            <button
              type="submit"
              class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-xl"
            >
              <LogOut class="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
      {/if}
    </div>
  </div>
</header>

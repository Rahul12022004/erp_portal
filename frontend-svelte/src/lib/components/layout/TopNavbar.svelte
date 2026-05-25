<script lang="ts">
  import { locale } from 'svelte-i18n';
  import { SUPPORTED_LOCALES } from '$lib/i18n';
  import type { User } from '$lib/types';
  import { Menu, Bell } from 'lucide-svelte';

  let { user, onToggleSidebar }: { user: User; onToggleSidebar: () => void } = $props();

  function changeLocale(code: string) {
    locale.set(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', code);
    }
  }

  const currentLocale = $derived($locale ?? 'en');
</script>

<header
  class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0"
>
  <!-- Left: hamburger (mobile) -->
  <div class="flex items-center gap-3">
    <button
      onclick={onToggleSidebar}
      class="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
      aria-label="Toggle sidebar"
    >
      <Menu class="w-5 h-5 text-gray-600" />
    </button>

    <span class="text-sm text-gray-500 hidden sm:block capitalize">
      {user.role.replace('-', ' ')}
    </span>
  </div>

  <!-- Right: locale switcher + notifications + avatar -->
  <div class="flex items-center gap-2">
    <!-- Locale switcher -->
    <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {#each SUPPORTED_LOCALES as loc (loc.code)}
        <button
          onclick={() => changeLocale(loc.code)}
          class={[
            'px-2 py-1 rounded text-xs font-medium transition-colors',
            currentLocale === loc.code
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          {loc.code.toUpperCase()}
        </button>
      {/each}
    </div>

    <!-- Notifications (stub) -->
    <button
      class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label="Notifications"
    >
      <Bell class="w-5 h-5 text-gray-600" />
    </button>

    <!-- User avatar -->
    <div
      class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold"
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  </div>
</header>

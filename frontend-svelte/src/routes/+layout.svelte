<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { setupI18n, applyClientLocale } from '$lib/i18n';
  import { currentUser } from '$lib/auth/stores';

  let { data, children } = $props();

  // Init with 'en' — same on server and client, no hydration mismatch.
  setupI18n();

  // Patch window.fetch at init time (runs before any child onMount callbacks)
  // so all plain fetch('/api/...') calls across the app get the Authorization header.
  if (typeof window !== 'undefined') {
    const _orig = window.fetch;
    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
      if (url.startsWith('/api') || url.includes('localhost:5000/api') || url.includes('/api/')) {
        const m = document.cookie.match(/(?:^|;\s*)client_token=([^;]*)/);
        const token = m ? decodeURIComponent(m[1]) : (data.token ?? null);
        if (token) {
          const headers = new Headers(init.headers ?? {});
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          return _orig(input, { ...init, headers });
        }
      }
      return _orig(input, init);
    };
  }

  $effect(() => {
    if (data.user) currentUser.set(data.user);
    else currentUser.set(null);
  });

  onMount(() => {
    applyClientLocale();
  });
</script>

{@render children()}

<script lang="ts">
  import '../app.css';
  import { setupI18n } from '$lib/i18n';
  import { currentUser } from '$lib/auth/stores';
  import { onMount } from 'svelte';

  let { data, children } = $props();

  onMount(() => {
    setupI18n();
    if (data.user) {
      currentUser.set(data.user);
    }
  });
</script>

{@render children()}

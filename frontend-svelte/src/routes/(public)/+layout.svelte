<script lang="ts">
  let { children } = $props();
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
  {@render children()}
</div>

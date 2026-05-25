<script lang="ts">
  import { _ } from 'svelte-i18n';
</script>

<svelte:head>
  <title>ERP Portal</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center text-white px-4">
  <div class="text-center max-w-2xl">
    <div class="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6">
      E
    </div>
    <h1 class="text-4xl font-bold mb-4">ERP Portal</h1>
    <p class="text-slate-300 text-lg mb-10">School management made simple</p>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a
        href="/login"
        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
      >
        Teacher Login
      </a>
      <a
        href="/school-login"
        class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20"
      >
        School Admin Login
      </a>
      <a
        href="/super-login"
        class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/20"
      >
        Super Admin Login
      </a>
    </div>
  </div>
</div>

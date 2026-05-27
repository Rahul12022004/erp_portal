<script lang="ts">
  import { enhance } from '$app/forms';
  import { Shield } from 'lucide-svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Super Admin Login — ERP Portal</title></svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4">
  <div class="absolute inset-0 opacity-10 pointer-events-none">
    <div class="absolute left-0 top-0 h-96 w-96 rounded-full bg-white blur-3xl"></div>
    <div class="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white blur-3xl"></div>
  </div>

  <div class="relative z-10 w-full max-w-md">
    <div class="mb-8 text-center">
      <div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-lg">
        <Shield class="h-8 w-8 text-slate-900" />
      </div>
      <h1 class="text-3xl font-bold text-white">Super Admin Login</h1>
      <p class="mt-2 text-slate-300">Access platform-level controls and system settings</p>
    </div>

    <div class="rounded-xl border-0 bg-white/95 shadow-2xl backdrop-blur p-6">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-slate-900">Sign In</h2>
        <p class="text-sm text-slate-500">Enter your credentials to access the super admin panel</p>
      </div>

      {#if form?.error}
        <div class="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <span class="font-medium">Error:</span> {form.error}
        </div>
      {/if}

      <form method="POST" use:enhance={() => {
        submitting = true;
        return async ({ update }) => { submitting = false; await update(); };
      }} class="space-y-4">
        <div class="space-y-2">
          <label for="email" class="text-sm font-medium text-slate-700">Email Address</label>
          <input id="email" name="email" type="email" placeholder="Enter super admin email"
            value={form?.email ?? ''}
            disabled={submitting}
            class="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            autocomplete="email" />
          <p class="text-xs text-slate-500">Use your gmail.com super admin email.</p>
        </div>
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium text-slate-700">Password</label>
          <input id="password" name="password" type="password" placeholder="••••••••"
            disabled={submitting}
            class="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            autocomplete="current-password" />
        </div>
        <div class="flex items-center space-x-2">
          <input id="remember" name="remember" type="checkbox" disabled={submitting}
            class="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-500" />
          <label for="remember" class="cursor-pointer text-sm text-slate-600">Remember me</label>
        </div>
        <button type="submit" disabled={submitting}
          class="h-10 w-full bg-slate-900 font-semibold text-white hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors">
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div class="mt-6 border-t border-slate-200 pt-6">
        <p class="text-center text-sm text-slate-600">
          Need another portal?
          <a href="/login" class="font-semibold text-slate-900 hover:underline ml-1">Teacher</a>
          or
          <a href="/school-login" class="font-semibold text-slate-900 hover:underline ml-1">School Admin</a>
        </p>
      </div>
    </div>

    <div class="mt-6 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
      <p class="text-xs text-blue-300">
        Super admin credentials are configured securely on the backend environment.
      </p>
    </div>
  </div>
</div>

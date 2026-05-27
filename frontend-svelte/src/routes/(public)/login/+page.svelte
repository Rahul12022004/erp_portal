<script lang="ts">
  import { enhance } from '$app/forms';
  import { UserPlus, MessageCircle } from 'lucide-svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);

  const avatar = 'https://ik.imagekit.io/fpxbgsota/memoji-alex.png?updatedAt=1752933824067';
</script>

<svelte:head><title>Teacher Login — ERP Portal</title></svelte:head>

<div class="min-h-screen bg-gray-100 flex items-center w-full justify-center p-4 relative overflow-hidden">
  <!-- Animated Grid Background -->
  <div class="absolute inset-0 opacity-20 pointer-events-none">
    <div class="absolute inset-0 grid-bg"></div>
  </div>

  <div class="relative z-10 w-full max-w-md">
    <!-- Clay card -->
    <div class="group relative overflow-hidden rounded-3xl bg-white shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.9)] transition-all duration-500 hover:shadow-[20px_20px_40px_rgba(0,0,0,0.2),-20px_-20px_40px_rgba(255,255,255,1)]">
      <div class="p-6">
        <!-- Status indicator -->
        <div class="absolute right-4 top-4 z-10">
          <div class="relative">
            <div class="h-3 w-3 rounded-full border-2 border-white transition-all duration-300 group-hover:scale-125 bg-green-500 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"></div>
            <div class="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-30"></div>
          </div>
        </div>

        <!-- Profile Photo -->
        <div class="mb-4 flex justify-center relative z-10">
          <div class="relative group-hover:animate-pulse">
            <div class="h-24 w-24 overflow-hidden rounded-full bg-white p-1 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-500 group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.15),inset_-8px_-8px_16px_rgba(255,255,255,1)] group-hover:scale-110">
              <img src={avatar} alt="Teacher" class="h-full w-full rounded-full object-contain transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div class="absolute inset-0 rounded-full border-2 border-green-400 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
          </div>
        </div>

        <!-- Profile Info -->
        <div class="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 transition-colors duration-300 group-hover:text-green-600">
            Welcome Teacher
          </h3>
          <p class="mt-1 text-sm text-gray-500 transition-colors duration-300 group-hover:text-gray-700">
            Educator
          </p>
        </div>

        <!-- Tags -->
        <div class="flex justify-center gap-2 relative z-10 mb-6">
          <span class="inline-block rounded-full bg-gradient-to-r from-green-50 to-green-100 px-3 py-1 text-xs font-medium shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] transition-all duration-300 text-green-600 group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]">
            Teacher
          </span>
        </div>

        <!-- Divider -->
        <div class="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6"></div>

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
            <label for="email" class="text-sm font-medium text-slate-700">Email</label>
            <input id="email" name="email" type="email" placeholder="teacher@school.com"
              value={form?.email ?? ''}
              disabled={submitting}
              class="w-full h-9 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autocomplete="email" />
          </div>
          <div class="space-y-2">
            <label for="password" class="text-sm font-medium text-slate-700">Password</label>
            <input id="password" name="password" type="password" placeholder="••••••••"
              disabled={submitting}
              class="w-full h-9 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autocomplete="current-password" />
          </div>
          <div class="flex items-center space-x-2 pt-1">
            <input id="remember" name="remember" type="checkbox" disabled={submitting}
              class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
            <label for="remember" class="text-sm text-slate-600 cursor-pointer">Remember me</label>
          </div>
          <button type="submit" disabled={submitting}
            class="w-full h-10 mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-all duration-300">
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div class="mt-4 text-center">
          <button type="button" class="text-xs text-green-600 hover:text-green-700 font-medium transition-colors duration-300">
            Forgot password?
          </button>
        </div>

        <div class="mt-6 pt-4 border-t border-gray-200">
          <div class="space-y-1 text-center text-xs text-slate-600">
            <p>Not a teacher? <a href="/school-login" class="text-green-600 font-semibold hover:underline">School Admin Login</a></p>
            <p>Need access? <a href="/super-login" class="font-semibold text-green-600 hover:underline">Super Admin</a></p>
          </div>
        </div>

        <!-- Action buttons at bottom -->
        <div class="mt-6 flex gap-2 relative z-10">
          <button class="flex-1 rounded-full bg-gradient-to-r from-green-50 to-green-100 py-2.5 text-sm font-medium text-green-600 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] hover:scale-95 active:scale-90">
            <UserPlus class="mx-auto h-4 w-4" />
          </button>
          <button class="flex-1 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 py-2.5 text-sm font-medium text-gray-700 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] hover:scale-95 active:scale-90">
            <MessageCircle class="mx-auto h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Animated hover border -->
      <div class="absolute inset-0 rounded-3xl border border-green-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>

    <!-- Demo note -->
    <div class="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
      <p class="text-xs text-green-700">
        <strong>💡 Note:</strong> Use a valid teacher email from your school to log in.
      </p>
    </div>
  </div>
</div>

<style>
  .grid-bg {
    background-image:
      linear-gradient(rgba(156, 163, 175, 0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(156, 163, 175, 0.3) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: gridMove 20s linear infinite;
  }
  @keyframes gridMove {
    0% { transform: translate(0, 0); }
    100% { transform: translate(40px, 40px); }
  }
</style>

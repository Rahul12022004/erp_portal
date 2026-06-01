<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import { UserPlus, MessageCircle } from 'lucide-svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);

  const CONSENT_KEY = 'erp-cookie-consent';
  const avatar = 'https://ik.imagekit.io/fpxbgsota/memoji-alex.png?updatedAt=1752933824067';

  // 'pending' | 'accepted' | 'declined'
  let consent = $state<'pending' | 'accepted' | 'declined'>('pending');
  // Controls the animated state of the cookie icon
  let cookieAnim = $state<'spin' | 'bite' | 'crack'>('spin');
  let bannerVisible = $state(false);

  onMount(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === 'accepted') {
      consent = 'accepted';
      bannerVisible = false;
    } else {
      bannerVisible = true;
    }
  });

  function accept() {
    cookieAnim = 'bite';
    // After bite animation completes, hide banner and enable login
    setTimeout(() => {
      bannerVisible = false;
      consent = 'accepted';
      localStorage.setItem(CONSENT_KEY, 'accepted');
    }, 700);
  }

  function decline() {
    cookieAnim = 'crack';
    consent = 'declined';
    // Reset cookie back to spin after crack animation
    setTimeout(() => { cookieAnim = 'spin'; }, 500);
  }

  const canSubmit = $derived(consent === 'accepted' && !submitting);
</script>

<svelte:head><title>School Admin Login — ERP Portal</title></svelte:head>

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
              <img src={avatar} alt="School Admin" class="h-full w-full rounded-full object-contain transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div class="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
          </div>
        </div>

        <!-- Profile Info -->
        <div class="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 transition-colors duration-300 group-hover:text-blue-600">
            Your School
          </h3>
          <p class="mt-1 text-sm text-gray-500 transition-colors duration-300 group-hover:text-gray-700">
            Administrator
          </p>
        </div>

        <!-- Tags -->
        <div class="flex justify-center gap-2 relative z-10 mb-6">
          <span class="inline-block rounded-full bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-1 text-xs font-medium shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] transition-all duration-300 text-blue-600 group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            School Admin
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
            <input id="email" name="email" type="email" placeholder="admin@school.com"
              value={form?.email ?? ''}
              disabled={submitting}
              class="w-full h-9 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autocomplete="email" />
          </div>
          <div class="space-y-2">
            <label for="password" class="text-sm font-medium text-slate-700">Password</label>
            <input id="password" name="password" type="password" placeholder="••••••••"
              disabled={submitting}
              class="w-full h-9 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autocomplete="current-password" />
          </div>
          <div class="flex items-center space-x-2 pt-1">
            <input id="remember" name="remember" type="checkbox" disabled={submitting}
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label for="remember" class="text-sm text-slate-600 cursor-pointer">Remember me</label>
          </div>

          <button type="submit" disabled={!canSubmit}
            class="w-full h-10 mt-6 font-semibold rounded-lg transition-all duration-300
              {canSubmit
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>

          {#if consent === 'declined'}
            <p class="text-center text-xs text-red-500 -mt-2">Accept cookies to enable login</p>
          {/if}
        </form>

        <div class="mt-4 text-center">
          <button type="button" class="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300">
            Forgot password?
          </button>
        </div>

        <div class="mt-6 pt-4 border-t border-gray-200">
          <div class="space-y-1 text-center text-xs text-slate-600">
            <p>Are you a teacher? <a href="/login" class="text-blue-600 font-semibold hover:underline">Teacher Login</a></p>
            <p>Need access? <a href="/super-login" class="font-semibold text-blue-600 hover:underline">Super Admin</a></p>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="mt-6 flex gap-2 relative z-10">
          <button class="flex-1 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 py-2.5 text-sm font-medium text-blue-600 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] hover:scale-95 active:scale-90">
            <UserPlus class="mx-auto h-4 w-4" />
          </button>
          <button class="flex-1 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 py-2.5 text-sm font-medium text-gray-700 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.8)] hover:scale-95 active:scale-90">
            <MessageCircle class="mx-auto h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Animated hover border -->
      <div class="absolute inset-0 rounded-3xl border border-blue-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>


    <!-- Note -->
    <div class="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
      <p class="text-xs text-blue-700">
        <strong>💡 Note:</strong> Your admin credentials were sent to your email during registration.
      </p>
    </div>
  </div>
</div>

<!-- ── Cookie Consent Card (fixed bottom-right) ── -->
{#if bannerVisible}
  <div class="cookie-card">
    <!-- Header row -->
    <div class="flex items-start justify-between mb-2">
      <h4 class="text-sm font-bold text-slate-900">Cookies</h4>
      <button onclick={decline}
        class="text-slate-400 hover:text-slate-700 transition-colors ml-4 leading-none text-lg"
        aria-label="Decline">×</button>
    </div>

    <!-- Body: text + cookie icon side by side -->
    <div class="flex items-center gap-3">
      <!-- Text -->
      <p class="text-xs text-slate-500 leading-relaxed flex-1">
        We use essential cookies to manage your login session and keep you signed in securely.
        By clicking Accept you agree to this.
      </p>

      <!-- Animated cookie SVG -->
      <div class="flex-shrink-0 w-16 h-16">
        <svg viewBox="0 0 40 40" width="64" height="64" class="overflow-visible">
          <defs>
            <clipPath id="c-top"><rect x="0" y="0" width="40" height="20"/></clipPath>
            <clipPath id="c-bot"><rect x="0" y="20" width="40" height="20"/></clipPath>
          </defs>

          {#if cookieAnim !== 'crack'}
            <g class:anim-spin={cookieAnim === 'spin'}
               class:anim-bite={cookieAnim === 'bite'}
               style="transform-origin:20px 20px">
              <circle cx="20" cy="20" r="18" fill="#c8852d"/>
              <circle cx="13" cy="13" r="3.2" fill="#7c4a1a"/>
              <circle cx="27" cy="11" r="2.8" fill="#7c4a1a"/>
              <circle cx="21" cy="22" r="3.2" fill="#7c4a1a"/>
              <circle cx="11" cy="25" r="2.4" fill="#7c4a1a"/>
              <circle cx="29" cy="26" r="3.0" fill="#7c4a1a"/>
              <circle cx="24" cy="13" r="2.0" fill="#7c4a1a"/>
            </g>
          {/if}

          {#if cookieAnim === 'crack'}
            <g class="anim-crack-top" clip-path="url(#c-top)" style="transform-origin:20px 20px">
              <circle cx="20" cy="20" r="18" fill="#c8852d"/>
              <circle cx="13" cy="13" r="3.2" fill="#7c4a1a"/>
              <circle cx="27" cy="11" r="2.8" fill="#7c4a1a"/>
              <circle cx="24" cy="13" r="2.0" fill="#7c4a1a"/>
              <line x1="2" y1="20" x2="38" y2="20" stroke="white" stroke-width="1" opacity="0.4"/>
            </g>
            <g class="anim-crack-bot" clip-path="url(#c-bot)" style="transform-origin:20px 20px">
              <circle cx="20" cy="20" r="18" fill="#c8852d"/>
              <circle cx="21" cy="22" r="3.2" fill="#7c4a1a"/>
              <circle cx="11" cy="25" r="2.4" fill="#7c4a1a"/>
              <circle cx="29" cy="26" r="3.0" fill="#7c4a1a"/>
            </g>
          {/if}
        </svg>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-2 mt-4">
      <button onclick={accept}
        class="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-colors duration-150 btn-accept">
        Accept
      </button>
      <button onclick={decline}
        class="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors duration-150">
        Decline
      </button>
    </div>
  </div>
{/if}

<style>
  .grid-bg {
    background-image:
      linear-gradient(rgba(156, 163, 175, 0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(156, 163, 175, 0.3) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: gridMove 20s linear infinite;
  }
  @keyframes gridMove {
    0%   { transform: translate(0, 0); }
    100% { transform: translate(40px, 40px); }
  }

  /* ── Cookie consent card ── */
  .cookie-card {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    width: 300px;
    background: white;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08);
    border: 1px solid hsl(220,13%,91%);
    animation: cardSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes cardSlideIn {
    from { opacity: 0; transform: translateY(24px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  .btn-accept {
    background: hsl(168,80%,36%);
  }
  .btn-accept:hover {
    background: hsl(168,80%,28%);
  }

  /* ── Cookie animations ── */
  @keyframes cookieSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .anim-spin { animation: cookieSpin 5s linear infinite; }

  @keyframes cookieBite {
    0%   { clip-path: circle(100%);                              opacity: 1; transform: scale(1)    rotate(0deg);  }
    35%  { clip-path: ellipse(68% 100% at 46% 50%);             opacity: 1; transform: scale(1.06) rotate(6deg);  }
    65%  { clip-path: ellipse(68% 100% at 46% 50%);             opacity: 1; transform: scale(1.06) rotate(6deg);  }
    100% { clip-path: ellipse(68% 100% at 46% 50%);             opacity: 0; transform: scale(0.5)  rotate(15deg); }
  }
  .anim-bite { animation: cookieBite 0.65s ease-in forwards; }

  @keyframes crackTop {
    0%   { opacity: 1; transform: translateY(0)    rotate(0deg);  }
    100% { opacity: 0; transform: translateY(-14px) rotate(-8deg); }
  }
  @keyframes crackBot {
    0%   { opacity: 1; transform: translateY(0)   rotate(0deg); }
    100% { opacity: 0; transform: translateY(14px) rotate(8deg); }
  }
  .anim-crack-top { animation: crackTop 0.42s ease-out forwards; }
  .anim-crack-bot { animation: crackBot 0.42s ease-out forwards; }
</style>

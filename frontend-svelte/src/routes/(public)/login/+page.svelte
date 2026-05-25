<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);
</script>

<svelte:head><title>Teacher Login — ERP Portal</title></svelte:head>

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
    <div class="text-center mb-6">
      <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
        E
      </div>
      <h1 class="text-2xl font-bold text-gray-900">{$_('auth.login.teacherTitle')}</h1>
    </div>

    {#if form?.error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          await update();
        };
      }}
      class="space-y-4"
    >
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('auth.login.emailLabel')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form?.email ?? ''}
          placeholder={$_('auth.login.emailPlaceholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('auth.login.passwordLabel')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder={$_('auth.login.passwordPlaceholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors"
      >
        {submitting ? $_('auth.login.submitting') : $_('auth.login.submitButton')}
      </button>
    </form>

    <div class="mt-5 pt-4 border-t border-gray-100 text-center space-y-2">
      <a href="/school-login" class="block text-xs text-gray-400 hover:text-blue-600 transition-colors">
        {$_('auth.login.schoolAdminLink')}
      </a>
      <a href="/super-login" class="block text-xs text-gray-400 hover:text-blue-600 transition-colors">
        {$_('auth.login.superAdminLink')}
      </a>
    </div>
  </div>
</div>

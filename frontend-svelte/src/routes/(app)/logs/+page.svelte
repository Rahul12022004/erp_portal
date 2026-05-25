<script lang="ts">
  import { onMount } from 'svelte';

  interface LogEntry {
    _id: string;
    action: string;
    message: string;
    user: string;
    createdAt: string;
  }

  let logs = $state<LogEntry[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await fetch('/api/logs');
      logs = await res.json();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>Activity Logs — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-gray-900">Activity Logs</h1>

  {#if loading}
    <p class="text-gray-500">Loading...</p>
  {:else}
    <div class="bg-white shadow rounded-xl overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each logs as log}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{log.action}</td>
              <td class="px-6 py-4 text-sm text-gray-700">{log.message}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.user}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
              </td>
            </tr>
          {/each}
          {#if logs.length === 0}
            <tr>
              <td colspan="4" class="px-6 py-8 text-center text-gray-400">No logs found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

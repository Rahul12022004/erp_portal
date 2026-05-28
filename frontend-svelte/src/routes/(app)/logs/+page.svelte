<script lang="ts">
  import { onMount } from 'svelte';

  interface LogEntry {
    _id: string;
    action: string;
    message: string;
    user: string;
    createdAt: string;
  }

  let logs    = $state<LogEntry[]>([]);
  let loading = $state(true);
  let error   = $state('');
  let search  = $state('');

  onMount(async () => {
    try {
      const res  = await fetch('/api/logs');
      const json = await res.json();
      if (!res.ok) {
        error = String(json?.error ?? json?.message ?? `Server error ${res.status}`);
        return;
      }
      // Go wraps: { success, data: [...] }
      const raw: Record<string, unknown>[] = json?.data ?? json?.logs ?? (Array.isArray(json) ? json : []);
      logs = raw.map(l => ({
        _id:       String(l._id ?? l.ID ?? ''),
        action:    String(l.action ?? l.Action ?? l.type ?? l.level ?? 'log'),
        message:   String(l.message ?? l.Message ?? l.msg ?? l.description ?? ''),
        user:      String(l.user ?? l.User ?? l.email ?? l.userId ?? ''),
        createdAt: String(l.createdAt ?? l.CreatedAt ?? l.timestamp ?? ''),
      }));
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load logs';
    } finally {
      loading = false;
    }
  });

  const filtered = $derived(
    logs.filter(l =>
      !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.message.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase())
    )
  );
</script>

<svelte:head><title>Activity Logs — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">Activity Logs</h1>
    <span class="text-sm text-gray-500">{filtered.length} entries</span>
  </div>

  <div class="bg-white shadow rounded-xl p-4">
    <input bind:value={search} type="text" placeholder="Search logs..."
      class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
  </div>

  {#if loading}
    <p class="text-gray-500">Loading...</p>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
      Failed to load logs: {error}
    </div>
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
          {#each filtered as log (log._id || log.createdAt)}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  {log.action || '—'}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{log.message || '—'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.user || '—'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '—'}
              </td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr>
              <td colspan="4" class="px-6 py-8 text-center text-gray-400">
                {search ? 'No logs match your search.' : 'No activity logs found. Logs appear here when actions are recorded in the system.'}
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

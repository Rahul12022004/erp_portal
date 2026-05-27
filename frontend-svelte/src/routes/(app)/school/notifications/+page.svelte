<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Bell, Check, CheckCheck, AlertCircle, Info, AlertTriangle } from 'lucide-svelte';

  const clayOuter = 'rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(18,165,136,0.08),transparent_40%),linear-gradient(180deg,#f0faf8_0%,#f1f8f6_50%,#f8fbff_100%)] p-3 space-y-5';
  const clayShell = 'rounded-[28px] border border-[#12A588]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2faf8_100%)] p-5 shadow-[0_18px_45px_rgba(18,165,136,0.08)]';
  const clayCard  = 'rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]';

  type Notification = {
    _id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
  };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let notifications = $state<Notification[]>([]);
  let loading = $state(true);
  let error = $state('');
  let filter = $state<'all' | 'unread'>('all');

  async function fetchNotifications() {
    if (!schoolId) return;
    try {
      loading = true;
      error = '';
      const res = await fetch(`/api/notifications?schoolId=${schoolId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      notifications = data.data ?? data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load notifications';
    } finally {
      loading = false;
    }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      notifications = notifications.map(n => n._id === id ? { ...n, read: true } : n);
    } catch {}
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markRead(n._id)));
  }

  const displayed = $derived(
    filter === 'unread' ? notifications.filter(n => !n.read) : notifications
  );

  const unreadCount = $derived(notifications.filter(n => !n.read).length);

  function typeIcon(type: string) {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'error':   return AlertCircle;
      default:        return Info;
    }
  }

  function typeColor(type: string) {
    switch (type) {
      case 'warning': return 'text-amber-500 bg-amber-50';
      case 'error':   return 'text-red-500 bg-red-50';
      case 'success': return 'text-emerald-500 bg-emerald-50';
      default:        return 'text-blue-500 bg-blue-50';
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  onMount(() => { fetchNotifications(); });
</script>

<div class={clayOuter}>
  <div class={clayShell}>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-indigo-50">
          <Bell class="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Notifications</h1>
          {#if unreadCount > 0}
            <p class="text-sm text-slate-500">{unreadCount} unread</p>
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
          <button
            class="px-3 py-1.5 {filter === 'all' ? 'bg-[#12A588] text-white' : 'text-slate-600 hover:bg-slate-50'} transition-colors"
            onclick={() => filter = 'all'}>All</button>
          <button
            class="px-3 py-1.5 {filter === 'unread' ? 'bg-[#12A588] text-white' : 'text-slate-600 hover:bg-slate-50'} transition-colors"
            onclick={() => filter = 'unread'}>Unread</button>
        </div>
        {#if unreadCount > 0}
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            onclick={markAllRead}>
            <CheckCheck class="w-4 h-4" />
            Mark all read
          </button>
        {/if}
      </div>
    </div>

    {#if loading}
      <div class="flex justify-center py-16">
        <div class="w-8 h-8 rounded-full border-2 border-[#12A588] border-t-transparent animate-spin"></div>
      </div>
    {:else if error}
      <div class="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 text-sm">
        <AlertCircle class="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    {:else if displayed.length === 0}
      <div class="text-center py-16 text-slate-400">
        <Bell class="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p class="text-sm">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each displayed as n (n._id)}
          {@const NIcon = typeIcon(n.type)}
          <div class="{clayCard} flex items-start gap-4 {n.read ? 'opacity-60' : ''}">
            <div class="p-2 rounded-xl {typeColor(n.type)} flex-shrink-0">
              <NIcon class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium text-slate-800 text-sm {!n.read ? 'font-semibold' : ''}">{n.title}</p>
                <span class="text-xs text-slate-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
              </div>
              <p class="text-sm text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
            </div>
            {#if !n.read}
              <button
                class="flex-shrink-0 p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                title="Mark read"
                onclick={() => markRead(n._id)}>
                <Check class="w-4 h-4" />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

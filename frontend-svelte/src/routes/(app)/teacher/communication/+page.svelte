<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  type Announcement = { _id: string; title: string; message: string; author: string; createdAt: string };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherName = $derived($page.data.user?.name ?? 'Teacher');

  let title = $state('');
  let message = $state('');
  let aiTopic = $state('');
  let aiDescription = $state('');
  let aiOpen = $state(false);
  let aiLoading = $state(false);
  let search = $state('');
  let success = $state('');
  let error = $state('');
  let loading = $state(true);
  let saving = $state(false);
  let announcements = $state<Announcement[]>([]);
  let dismissedIds = $state<string[]>([]);

  const dismissedKey = $derived(schoolId ? `teacher-dismissed-announcements:${schoolId}` : '');

  onMount(() => {
    if (dismissedKey) {
      try {
        const raw = localStorage.getItem(dismissedKey);
        if (raw) dismissedIds = JSON.parse(raw).filter((id: unknown): id is string => typeof id === 'string');
      } catch { /* ignore */ }
    }
    fetchAnnouncements();
  });

  async function fetchAnnouncements() {
    if (!schoolId) { error = 'School not found. Please log in again.'; loading = false; return; }
    try {
      loading = true; error = '';
      const res = await fetch(`/api/announcements?schoolId=${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load announcements (${res.status})`);
      const data = await res.json();
      announcements = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load announcements';
    } finally { loading = false; }
  }

  function dismissAnnouncement(id: string) {
    if (!dismissedIds.includes(id)) {
      dismissedIds = [...dismissedIds, id];
      if (dismissedKey) localStorage.setItem(dismissedKey, JSON.stringify(dismissedIds));
    }
  }

  async function postAnnouncement() {
    if (!title.trim() || !message.trim()) { alert('Please fill all fields'); return; }
    if (!schoolId) { alert('School not found. Please log in again.'); return; }
    try {
      saving = true; error = '';
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), author: teacherName, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to post announcement');
      announcements = [data.data, ...announcements];
      title = ''; message = '';
      success = 'Announcement posted successfully.';
      setTimeout(() => { success = ''; }, 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to post announcement';
    } finally { saving = false; }
  }

  async function createWithAi() {
    if (!aiTopic.trim()) { error = 'Please enter a topic for AI draft generation.'; return; }
    try {
      aiLoading = true; error = '';
      const res = await fetch('/api/announcements/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic.trim(), description: aiDescription.trim(), author: teacherName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to generate AI announcement');
      title = data.data?.title || '';
      message = data.data?.message || '';
      aiOpen = false;
      success = 'AI draft generated. Review and post.';
      setTimeout(() => { success = ''; }, 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to generate AI draft';
    } finally { aiLoading = false; }
  }

  async function deleteAnnouncement(id: string) {
    try {
      error = '';
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.success === false)) throw new Error(data?.message || 'Failed to delete announcement');
      announcements = announcements.filter(a => a._id !== id);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete announcement';
    }
  }

  const filteredAnnouncements = $derived(
    announcements.filter(a => {
      if (dismissedIds.includes(a._id)) return false;
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q) || a.author.toLowerCase().includes(q);
    })
  );
</script>

<svelte:head><title>Communication — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="stat-card p-6">
    <h3 class="text-lg font-semibold mb-2">Teacher Communication</h3>
    <p class="text-sm text-muted-foreground">Share updates with your school and keep track of recent announcements in one place.</p>
  </div>

  <div class="stat-card p-6">
    <h3 class="text-lg font-semibold mb-4">Create Announcement</h3>
    <div class="space-y-4">
      {#if success}<p class="text-green-600 text-sm">{success}</p>{/if}
      {#if error}<p class="text-red-600 text-sm">{error}</p>{/if}
      <input type="text" placeholder="Announcement Title" class="border rounded p-2 w-full" bind:value={title} />
      <textarea placeholder="Write announcement..." class="border rounded p-2 w-full" rows={4} bind:value={message}></textarea>
      <div class="relative flex justify-end">
        <button type="button" aria-label="Open AI draft popup" onclick={() => (aiOpen = !aiOpen)}
          class="w-8 h-8 rounded-full border border-blue-300 text-blue-700 text-xs font-semibold hover:bg-blue-50">
          AI
        </button>
        {#if aiOpen}
          <div class="absolute right-0 top-10 z-10 w-72 rounded-lg border bg-white shadow-lg p-3 space-y-2">
            <p class="text-sm font-medium text-gray-700">Create with AI</p>
            <input type="text" placeholder="Topic" class="border rounded p-2 w-full" bind:value={aiTopic} />
            <textarea placeholder="Description" rows={3} class="border rounded p-2 w-full" bind:value={aiDescription}></textarea>
            <div class="flex justify-end gap-2">
              <button type="button" onclick={() => (aiOpen = false)} class="px-3 py-1 rounded border text-sm">Close</button>
              <button type="button" onclick={createWithAi} disabled={aiLoading || saving}
                class="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-60">
                {aiLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        {/if}
      </div>
      <button onclick={postAnnouncement} class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded" disabled={saving}>
        {saving ? 'Posting...' : 'Post Announcement'}
      </button>
    </div>
  </div>

  <input placeholder="Search announcements..." class="border p-2 w-full rounded" bind:value={search} />

  <div class="stat-card p-6">
    <h3 class="text-lg font-semibold mb-4">Announcements</h3>
    {#if loading}
      <p class="text-sm text-gray-500">Loading announcements...</p>
    {:else if filteredAnnouncements.length === 0}
      <p class="text-sm text-gray-500">No announcements found.</p>
    {:else}
      <div class="space-y-4">
        {#each filteredAnnouncements as announcement, index (announcement._id)}
          {@const isOwnPost = announcement.author === teacherName}
          <div class="border rounded-xl p-4 {index === 0 ? 'bg-green-50 border-green-400' : 'bg-gray-50'}">
            <div class="flex justify-between items-start gap-4">
              <div>
                <p class="font-semibold text-gray-900">{announcement.title}</p>
                <p class="text-sm text-gray-600 mt-1">{announcement.message}</p>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-xs text-gray-500 whitespace-nowrap pt-1">{new Date(announcement.createdAt).toLocaleString()}</span>
                <button type="button" onclick={() => dismissAnnouncement(announcement._id)}
                  class="text-red-500 hover:text-red-700" aria-label="Dismiss announcement" title="Dismiss announcement">
                  ✕
                </button>
              </div>
            </div>
            <div class="mt-2 flex items-center justify-between gap-4">
              <p class="text-xs text-gray-500">Posted by: {announcement.author}</p>
              {#if isOwnPost}
                <button onclick={() => deleteAnnouncement(announcement._id)} class="text-red-500 text-xs">Delete</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

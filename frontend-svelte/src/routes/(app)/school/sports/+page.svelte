<script lang="ts">
  type SportEvent = { id: string; name: string; date: string; location: string; description: string };

  let events = $state<SportEvent[]>([]);
  let form = $state({ name: '', date: '', location: '', description: '' });
  let saving = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    await new Promise(r => setTimeout(r, 500));
    events = [...events, { ...form, id: Date.now().toString() }];
    form = { name: '', date: '', location: '', description: '' };
    saving = false;
  }
</script>

<svelte:head><title>Sports — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <h2 class="text-xl font-bold">Add Sport Event</h2>
  <form onsubmit={handleSubmit} class="space-y-4">
    <input type="text" placeholder="Event Name" class="border rounded p-2 w-full" bind:value={form.name} required />
    <input type="date" class="border rounded p-2 w-full" bind:value={form.date} required />
    <input type="text" placeholder="Location" class="border rounded p-2 w-full" bind:value={form.location} required />
    <textarea placeholder="Description" class="border rounded p-2 w-full" bind:value={form.description}></textarea>
    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded" disabled={saving}>
      {saving ? 'Saving...' : 'Add Event'}
    </button>
  </form>
  <div>
    <h3 class="font-semibold mb-2">Events</h3>
    <ul class="space-y-2">
      {#each events as event}
        <li class="border rounded p-3">
          <div class="font-bold">{event.name}</div>
          <div>Date: {event.date}</div>
          <div>Location: {event.location}</div>
          <div>{event.description}</div>
        </li>
      {/each}
    </ul>
  </div>
</div>

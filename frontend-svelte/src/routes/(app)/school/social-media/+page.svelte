<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Edit, MessageCircle, Trash2 } from 'lucide-svelte';

  type SocialPlatform = 'whatsapp' | 'instagram' | 'facebook' | 'linkedin';
  type SocialMediaAccount = { _id: string; platform: SocialPlatform; accountName: string; profileUrl?: string; phoneNumber?: string; bio?: string; isActive: boolean };

  const platformLabelMap: Record<SocialPlatform, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn' };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let accounts = $state<SocialMediaAccount[]>([]);
  let search = $state('');
  let editingId = $state<string | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let formData = $state({ platform: 'whatsapp' as SocialPlatform, accountName: '', profileUrl: '', phoneNumber: '', bio: '', isActive: true });

  async function fetchAccounts() {
    if (!schoolId) return;
    try {
      loading = true; error = '';
      const res = await fetch(`/api/social-media/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const d = await res.json();
      accounts = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load';
      accounts = [];
    } finally { loading = false; }
  }

  onMount(() => { fetchAccounts(); });

  function resetForm() { formData = { platform: 'whatsapp', accountName: '', profileUrl: '', phoneNumber: '', bio: '', isActive: true }; editingId = null; }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!formData.accountName.trim()) { error = 'Account name is required.'; return; }
    if (!schoolId) { error = 'School not found.'; return; }
    try {
      saving = true; error = '';
      const url = editingId ? `/api/social-media/${editingId}` : '/api/social-media';
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, schoolId }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to save');
      resetForm();
      await fetchAccounts();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save';
    } finally { saving = false; }
  }

  function startEdit(account: SocialMediaAccount) {
    editingId = account._id;
    formData = { platform: account.platform, accountName: account.accountName, profileUrl: account.profileUrl || '', phoneNumber: account.phoneNumber || '', bio: account.bio || '', isActive: account.isActive };
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this social media account?')) return;
    try {
      const res = await fetch(`/api/social-media/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to delete');
      if (editingId === id) resetForm();
      await fetchAccounts();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete';
    }
  }

  const filteredAccounts = $derived(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(a => [platformLabelMap[a.platform], a.accountName, a.phoneNumber || '', a.profileUrl || ''].some(v => v.toLowerCase().includes(q)));
  });

  const stats = $derived({ total: accounts.length, active: accounts.filter(a => a.isActive).length, inactive: accounts.filter(a => !a.isActive).length, platforms: new Set(accounts.map(a => a.platform)).size });
</script>

<svelte:head><title>Social Media — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <div class="stat-card p-5"><p class="text-sm text-gray-500">Total Accounts</p><p class="text-2xl font-bold">{stats.total}</p></div>
    <div class="stat-card p-5"><p class="text-sm text-green-600">Active</p><p class="text-2xl font-bold text-green-700">{stats.active}</p></div>
    <div class="stat-card p-5"><p class="text-sm text-red-600">Inactive</p><p class="text-2xl font-bold text-red-700">{stats.inactive}</p></div>
    <div class="stat-card p-5"><p class="text-sm text-blue-600">Platforms Used</p><p class="text-2xl font-bold text-blue-700">{stats.platforms}</p></div>
  </div>

  <div class="stat-card p-6">
    <div class="flex items-center gap-2 mb-4"><MessageCircle class="w-5 h-5 text-blue-600" /><h3 class="text-lg font-semibold">{editingId ? 'Edit Social Account' : 'Add Social Account'}</h3></div>
    {#if error}<p class="text-red-600 text-sm mb-4">{error}</p>{/if}
    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select class="border rounded p-2" bind:value={formData.platform} required>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="linkedin">LinkedIn</option>
        </select>
        <input type="text" placeholder="Account Name / Handle" class="border rounded p-2" bind:value={formData.accountName} required />
        <input type="text" placeholder="Profile URL" class="border rounded p-2" bind:value={formData.profileUrl} />
        <input type="text" placeholder="WhatsApp Number / Contact" class="border rounded p-2" bind:value={formData.phoneNumber} />
      </div>
      <textarea placeholder="Short bio or social media notes" class="border rounded p-2 w-full" rows={3} bind:value={formData.bio}></textarea>
      <label class="inline-flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" bind:checked={formData.isActive} /> Mark as active
      </label>
      <div class="flex gap-2">
        <button type="submit" disabled={saving} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          {saving ? 'Saving...' : editingId ? 'Update Account' : 'Add Account'}
        </button>
        <button type="button" onclick={resetForm} class="bg-gray-200 px-4 py-2 rounded">Clear</button>
      </div>
    </form>
  </div>

  <div class="stat-card p-6 space-y-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <h3 class="text-lg font-semibold">Social Media Directory</h3>
      <input type="text" placeholder="Search by platform, name, number or URL" class="border rounded p-2 w-full md:max-w-sm" bind:value={search} />
    </div>
    {#if loading}
      <p class="text-center text-gray-500 py-6">Loading social media accounts...</p>
    {:else if filteredAccounts().length === 0}
      <p class="text-center text-gray-500 py-6">No social media records found.</p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each filteredAccounts() as account}
          <div class="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-slate-500">{platformLabelMap[account.platform]}</p>
                <h4 class="text-base font-semibold text-slate-900">{account.accountName}</h4>
              </div>
              <span class="text-xs px-2 py-1 rounded-full {account.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">{account.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            {#if account.phoneNumber}<p class="text-sm text-slate-600">Contact: {account.phoneNumber}</p>{/if}
            {#if account.profileUrl}<a href={account.profileUrl} target="_blank" rel="noreferrer" class="text-sm text-blue-600 hover:underline break-all">{account.profileUrl}</a>{/if}
            {#if account.bio}<p class="text-sm text-slate-600">{account.bio}</p>{/if}
            <div class="flex items-center gap-3 pt-1">
              <button onclick={() => startEdit(account)} class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"><Edit class="w-4 h-4" /> Edit</button>
              <button onclick={() => handleDelete(account._id)} class="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"><Trash2 class="w-4 h-4" /> Delete</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

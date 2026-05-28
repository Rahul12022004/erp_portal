<script lang="ts">
  import { onMount } from 'svelte';

  interface SchoolInfo { name: string; logo: string; email: string; address?: string; phone?: string; website?: string; }
  interface AdminInfo  { name: string; email: string; phone: string; }
  interface SystemInfo { subscriptionPlan: string; maxStudents: number; subscriptionEndDate: string; }
  interface School {
    _id: string;
    schoolInfo: SchoolInfo;
    adminInfo: AdminInfo;
    systemInfo: SystemInfo;
    modules: string[];
  }

  // ── state ─────────────────────────────────────────────────────────────────
  let schools    = $state<School[]>([]);
  let loading    = $state(true);
  let search     = $state('');
  let showModal  = $state(false);
  let editData   = $state<School | null>(null);
  let viewData   = $state<School | null>(null);
  let saving     = $state(false);
  let saveError  = $state('');

  // form fields
  let fSchoolName    = $state('');
  let fSchoolEmail   = $state('');
  let fSchoolPhone   = $state('');
  let fSchoolAddress = $state('');
  let fSchoolWebsite = $state('');
  let fAdminName     = $state('');
  let fAdminEmail    = $state('');
  let fAdminPhone    = $state('');
  let fAdminPassword = $state('');
  let fPlan          = $state('Basic');
  let fMaxStudents   = $state(500);

  onMount(async () => { await fetchSchools(); });

  async function fetchSchools() {
    loading = true;
    try {
      const res  = await fetch('/api/schools');
      const json = await res.json();
      schools = json?.data?.schools ?? json?.schools ?? (Array.isArray(json) ? json : []);
    } catch (e) { console.error(e); }
    finally { loading = false; }
  }

  const filtered = $derived(
    schools.filter(s =>
      s.schoolInfo?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.schoolInfo?.email?.toLowerCase().includes(search.toLowerCase())
    )
  );

  function openAdd() {
    editData = null;
    fSchoolName = fSchoolEmail = fSchoolPhone = fSchoolAddress = fSchoolWebsite = '';
    fAdminName = fAdminEmail = fAdminPhone = fAdminPassword = '';
    fPlan = 'Basic';
    fMaxStudents = 500;
    saveError = '';
    showModal = true;
  }

  function openEdit(school: School) {
    editData = school;
    fSchoolName    = school.schoolInfo?.name    ?? '';
    fSchoolEmail   = school.schoolInfo?.email   ?? '';
    fSchoolPhone   = school.schoolInfo?.phone   ?? '';
    fSchoolAddress = school.schoolInfo?.address ?? '';
    fSchoolWebsite = school.schoolInfo?.website ?? '';
    fAdminName     = school.adminInfo?.name     ?? '';
    fAdminPhone    = school.adminInfo?.phone    ?? '';
    fAdminEmail    = school.adminInfo?.email    ?? '';
    fAdminPassword = '';
    fPlan          = school.systemInfo?.subscriptionPlan || 'Basic';
    fMaxStudents   = school.systemInfo?.maxStudents      ?? 500;
    saveError = '';
    showModal = true;
  }

  function closeModal() { showModal = false; editData = null; saveError = ''; }

  async function handleSave() {
    if (saving) return;
    saving = true;
    saveError = '';
    try {
      let res: Response;
      if (editData) {
        // Update existing school
        res = await fetch(`/api/schools/${editData._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolName:    fSchoolName,
            schoolEmail:   fSchoolEmail,
            schoolPhone:   fSchoolPhone,
            schoolAddress: fSchoolAddress,
            schoolWebsite: fSchoolWebsite,
            adminName:     fAdminName,
            adminPhone:    fAdminPhone,
          }),
        });
      } else {
        // Create new school
        res = await fetch('/api/schools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolName:       fSchoolName,
            schoolEmail:      fSchoolEmail,
            schoolPhone:      fSchoolPhone,
            schoolAddress:    fSchoolAddress,
            schoolWebsite:    fSchoolWebsite,
            adminName:        fAdminName,
            adminEmail:       fAdminEmail,
            adminPassword:    fAdminPassword || undefined,
            adminPhone:       fAdminPhone,
            subscriptionPlan: fPlan,
            maxStudents:      fMaxStudents,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        saveError = String(data?.error ?? data?.message ?? `Error ${res.status}`);
        return;
      }
      closeModal();
      await fetchSchools();
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'Network error';
    } finally {
      saving = false;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this school? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/schools/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) await fetchSchools();
    } catch (e) { console.error(e); }
  }
</script>

<svelte:head><title>Schools — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Schools</h1>
      <p class="text-sm text-gray-500 mt-1">{filtered.length} school{filtered.length !== 1 ? 's' : ''}</p>
    </div>
    <button onclick={openAdd} class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
      + Add School
    </button>
  </div>

  <!-- Search -->
  <div class="bg-white shadow rounded-xl p-4">
    <input bind:value={search} type="text" placeholder="Search by name or email..."
      class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
  </div>

  <!-- Table -->
  {#if loading}
    <p class="text-gray-500">Loading...</p>
  {:else}
    <div class="bg-white shadow rounded-xl overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filtered as school (school._id)}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  {#if school.schoolInfo?.logo}
                    <img src={school.schoolInfo.logo} alt="" class="w-8 h-8 rounded-full object-cover" />
                  {:else}
                    <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                      {school.schoolInfo?.name?.charAt(0) ?? '?'}
                    </div>
                  {/if}
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{school.schoolInfo?.name}</p>
                    <p class="text-xs text-gray-500">{school.schoolInfo?.email}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <p class="text-sm text-gray-900">{school.adminInfo?.name}</p>
                <p class="text-xs text-gray-500">{school.adminInfo?.phone}</p>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  {school.systemInfo?.subscriptionPlan === 'Premium' ? 'bg-purple-100 text-purple-700' :
                   school.systemInfo?.subscriptionPlan === 'Standard' ? 'bg-blue-100 text-blue-700' :
                   'bg-gray-100 text-gray-700'}">
                  {school.systemInfo?.subscriptionPlan || 'Basic'}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {school.systemInfo?.subscriptionEndDate
                  ? new Date(school.systemInfo.subscriptionEndDate).toLocaleDateString('en-IN')
                  : '—'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <button onclick={() => { viewData = school; }}
                    class="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 border border-green-200 rounded hover:bg-green-50">
                    View
                  </button>
                  <button onclick={() => openEdit(school)}
                    class="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50">
                    Edit
                  </button>
                  <button onclick={() => handleDelete(school._id)}
                    class="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 border border-red-200 rounded hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr>
              <td colspan="5" class="px-6 py-8 text-center text-gray-400">No schools found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- View Modal -->
{#if viewData}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" aria-label="Close" class="absolute inset-0 bg-black/50" onclick={() => { viewData = null; }}></button>
    <div class="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center gap-4">
        {#if viewData.schoolInfo?.logo}
          <img src={viewData.schoolInfo.logo} alt="" class="w-16 h-16 rounded-full object-cover" />
        {:else}
          <div class="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
            {viewData.schoolInfo?.name?.charAt(0) ?? '?'}
          </div>
        {/if}
        <div>
          <h2 class="text-xl font-bold text-gray-900">{viewData.schoolInfo?.name}</h2>
          <p class="text-sm text-gray-500">{viewData.schoolInfo?.email}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        {#each [
          ['Address',    viewData.schoolInfo?.address],
          ['Phone',      viewData.schoolInfo?.phone],
          ['Website',    viewData.schoolInfo?.website],
          ['Admin Name', viewData.adminInfo?.name],
          ['Admin Email',viewData.adminInfo?.email],
          ['Admin Phone',viewData.adminInfo?.phone],
          ['Plan',       viewData.systemInfo?.subscriptionPlan],
          ['Max Students', String(viewData.systemInfo?.maxStudents ?? '—')],
          ['End Date',   viewData.systemInfo?.subscriptionEndDate ? new Date(viewData.systemInfo.subscriptionEndDate).toLocaleDateString('en-IN') : '—'],
        ] as [label, val]}
          <div>
            <p class="text-gray-400 text-xs uppercase font-medium">{label}</p>
            <p class="text-gray-800">{val || '—'}</p>
          </div>
        {/each}
      </div>
      {#if viewData.modules?.length}
        <div>
          <p class="text-gray-400 text-xs uppercase font-medium mb-2">Modules ({viewData.modules.length})</p>
          <div class="flex flex-wrap gap-1.5">
            {#each viewData.modules as mod}
              <span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{mod}</span>
            {/each}
          </div>
        </div>
      {/if}
      <button onclick={() => { viewData = null; }}
        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm">
        Close
      </button>
    </div>
  </div>
{/if}

<!-- Add / Edit Modal -->
{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" aria-label="Close" class="absolute inset-0 bg-black/50" onclick={closeModal}></button>
    <div class="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
      <h2 class="text-lg font-bold text-gray-900 mb-5">{editData ? 'Edit School' : 'Add School'}</h2>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-5">

        <!-- School Info -->
        <fieldset class="border border-gray-200 rounded-xl p-4 space-y-3">
          <legend class="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1">School Info</legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">School Name {!editData ? '*' : ''}</label>
              <input bind:value={fSchoolName} type="text" required={!editData}
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">School Email</label>
              <input bind:value={fSchoolEmail} type="email"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input bind:value={fSchoolPhone} type="tel"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input bind:value={fSchoolWebsite} type="url" placeholder="https://"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input bind:value={fSchoolAddress} type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </fieldset>

        <!-- Admin Info -->
        <fieldset class="border border-gray-200 rounded-xl p-4 space-y-3">
          <legend class="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1">Admin Info</legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Admin Name {!editData ? '*' : ''}</label>
              <input bind:value={fAdminName} type="text" required={!editData}
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Admin Phone</label>
              <input bind:value={fAdminPhone} type="tel"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {#if !editData}
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Admin Email *</label>
                <input bind:value={fAdminEmail} type="email" required
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Admin Password <span class="text-gray-400">(auto if blank)</span></label>
                <input bind:value={fAdminPassword} type="password" placeholder="Leave blank to auto-generate"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            {/if}
          </div>
        </fieldset>

        <!-- Subscription (add only) -->
        {#if !editData}
          <fieldset class="border border-gray-200 rounded-xl p-4 space-y-3">
            <legend class="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1">Subscription</legend>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Plan</label>
                <select bind:value={fPlan}
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Max Students</label>
                <input bind:value={fMaxStudents} type="number" min="1"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </fieldset>
        {/if}

        {#if saveError}
          <p class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
        {/if}

        <div class="flex gap-3 pt-1">
          <button type="button" onclick={closeModal} disabled={saving}
            class="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm">
            {saving ? 'Saving...' : editData ? 'Save Changes' : 'Create School'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

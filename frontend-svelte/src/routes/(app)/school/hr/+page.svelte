<script lang="ts">
  import { onMount } from 'svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { Briefcase, KeyRound, Mail, Trash2, UserCheck } from 'lucide-svelte';

  type Teacher = { _id: string; name: string; email: string; position: string; status?: string };
  type TeacherRoleCard = {
    _id: string; roleName: string; modules: string[]; generatedPassword: string; teacherEmail: string;
    teacherId?: { _id: string; name: string; email: string; position?: string };
    createdAt?: string;
  };

  const SIDEBAR_MENU_GROUPS = [
    { label: 'Overview', items: ['Dashboard'] },
    { label: 'Academics', items: ['Communication', 'Academics', 'Attendance', 'Classes', 'Students', 'Staff', 'Exams', 'Time Table'] },
    { label: 'Administration', items: ['Finance', 'Admissions', 'Visitor', 'HR', 'Transport', 'Hostel', 'Library', 'Inventory', 'Social Media', 'Data Import'] },
    { label: 'Services', items: ['Sports', 'House'] },
    { label: 'Management', items: ['Approvals', 'Maintenance', 'Survey', 'Downloads', 'Support', 'Logs', 'Settings'] },
  ];

  const PORTAL_MODULES_BY_NORMALIZED: Record<string, string[]> = {
    dashboard: ['Dashboard'], communication: ['Communication'], academics: ['Academics'],
    attendance: ['Attendance'], classes: ['Classes'], students: ['Students'], staff: ['Staff'],
    exams: ['Exams'], timetable: ['Time Table'], finance: ['Finance'], admissions: ['Admissions'],
    hr: ['HR'], transport: ['Transport'], hostel: ['Hostel'], library: ['Library'],
    inventory: ['Inventory'], socialmedia: ['Social Media'], survey: ['Survey'],
    approvals: ['Approvals'], maintenance: ['Maintenance'], sports: ['Sports'], house: ['House'],
    downloads: ['Downloads'], support: ['Support'], logs: ['Logs'], settings: ['Settings'],
    visitor: ['Visitor'], dataimport: ['Data Import'],
  };

  const normalize = (v: string) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  function generatePassword(name: string) {
    const clean = name.replace(/\s+/g, '').slice(0, 4).toUpperCase() || 'TCHR';
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${clean}@${suffix}`;
  }

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let teachers = $state<Teacher[]>([]);
  let cards = $state<TeacherRoleCard[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let success = $state('');
  let teacherId = $state('');
  let roleName = $state('');
  let modules = $state<string[]>([]);
  let teacherEmail = $state('');
  let generatedPassword = $state('');
  let selectedCard = $state<TeacherRoleCard | null>(null);
  let showLoginModal = $state(false);
  let cardLoginEmail = $state('');
  let cardLoginPassword = $state('');
  let cardLoginLoading = $state(false);
  let schoolModules = $state<string[]>([]);
  let subscriptionPlan = $state('');

  const availableModules = $derived(() => {
    const sidebarItems = SIDEBAR_MENU_GROUPS.flatMap(g => g.items);
    const available = new Set(
      schoolModules.flatMap(m => {
        const n = normalize(m);
        return PORTAL_MODULES_BY_NORMALIZED[n] ?? sidebarItems.filter(item => normalize(item) === n);
      })
    );
    return sidebarItems.filter((item, idx) =>
      sidebarItems.indexOf(item) === idx &&
      (item === 'Dashboard' || item === 'Visitor' || subscriptionPlan === 'Premium' || available.has(item))
    );
  });

  onMount(async () => {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      const [teachersRes, cardsRes, schoolRes] = await Promise.all([
        fetch(`/api/staff/${schoolId}`),
        fetch(`/api/teacher-roles/${schoolId}`),
        fetch(`/api/schools/${schoolId}`),
      ]);
      if (!teachersRes.ok || !cardsRes.ok) throw new Error('Failed to load HR data');
      const [teachersData, cardsData, schoolData] = await Promise.all([
        teachersRes.json(), cardsRes.json(), schoolRes.ok ? schoolRes.json() : null,
      ]);
      teachers = (Array.isArray(teachersData) ? teachersData : []).filter(
        (s: Teacher) => /^Teacher$/i.test(s.position || '') && String(s.status || 'Active') !== 'Inactive'
      );
      cards = Array.isArray(cardsData?.data) ? cardsData.data : [];
      if (schoolData) {
        schoolModules = Array.isArray(schoolData.modules) ? schoolData.modules : [];
        subscriptionPlan = schoolData.systemInfo?.subscriptionPlan || '';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load HR data';
    } finally { loading = false; }
  });

  function onTeacherChange(id: string) {
    teacherId = id;
    const t = teachers.find(t => t._id === id);
    teacherEmail = t?.email || '';
    generatedPassword = t ? generatePassword(t.name || '') : '';
  }

  function toggleModule(m: string) {
    modules = modules.includes(m) ? modules.filter(x => x !== m) : [...modules, m];
  }

  async function handleCreateRole(e: SubmitEvent) {
    e.preventDefault();
    if (!schoolId) { error = 'School not found.'; return; }
    if (!teacherId || !roleName.trim()) { error = 'Teacher and role name are required.'; return; }
    if (!generatedPassword) { error = 'Generated password missing. Re-select teacher.'; return; }
    try {
      saving = true; error = ''; success = '';
      const res = await fetch('/api/teacher-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, teacherId, roleName: roleName.trim(), modules, generatedPassword, createdBy: 'School Admin' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to create teacher role');
      const saved = data.data as TeacherRoleCard;
      const exists = cards.some(c => c._id === saved._id);
      cards = exists ? cards.map(c => c._id === saved._id ? saved : c) : [saved, ...cards];
      success = 'Role created and credentials emailed to selected teacher.';
      roleName = ''; modules = [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create teacher role';
    } finally { saving = false; }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role card?')) return;
    try {
      const res = await fetch(`/api/teacher-roles/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to delete role card');
      cards = cards.filter(c => c._id !== id);
      success = 'Role card deleted.';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete role card';
    }
  }

  function openCardLogin(card: TeacherRoleCard) {
    selectedCard = card;
    cardLoginEmail = card.teacherEmail || '';
    cardLoginPassword = card.generatedPassword || '';
    showLoginModal = true;
    error = ''; success = '';
  }

  async function handleCardLogin() {
    if (!schoolId || !cardLoginEmail || !cardLoginPassword) { error = 'Email and password are required.'; return; }
    try {
      cardLoginLoading = true; error = '';
      const res = await fetch('/api/teacher-roles/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, teacherEmail: cardLoginEmail.trim(), generatedPassword: cardLoginPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Teacher role login failed');
      showLoginModal = false;
      await invalidateAll();
      await goto('/teacher');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Teacher role login failed';
    } finally { cardLoginLoading = false; }
  }
</script>

<svelte:head><title>HR — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="stat-card p-6">
    <div class="mb-4 flex items-center gap-2">
      <Briefcase class="h-5 w-5 text-blue-600" />
      <h3 class="text-lg font-semibold">Teacher Role & Module Assignment</h3>
    </div>

    {#if error}<p class="mb-3 text-sm text-red-600">{error}</p>{/if}
    {#if success}<p class="mb-3 text-sm text-green-600">{success}</p>{/if}

    <form onsubmit={handleCreateRole} class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <select class="rounded border p-2" value={teacherId} onchange={(e) => onTeacherChange((e.currentTarget as HTMLSelectElement).value)} required>
          <option value="">Select Teacher</option>
          {#each teachers as teacher}<option value={teacher._id}>{teacher.name}</option>{/each}
        </select>
        <input type="text" placeholder="Role Name (e.g. Attendance Manager)" class="rounded border p-2" bind:value={roleName} required />
        <div class="relative">
          <Mail class="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input type="email" class="w-full rounded border p-2 pl-8 bg-gray-50" value={teacherEmail} readonly placeholder="Teacher Email (auto-filled)" />
        </div>
        <div class="relative">
          <KeyRound class="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input type="text" class="w-full rounded border p-2 pl-8 bg-gray-50" value={generatedPassword} readonly placeholder="Password (auto-generated)" />
        </div>
      </div>

      <div>
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-semibold text-slate-800">Assign Modules</p>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{modules.length} selected</span>
        </div>
        {#if availableModules().length === 0}
          <p class="text-sm text-gray-500">No enabled school modules found.</p>
        {:else}
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {#each availableModules() as moduleName}
              {@const isSelected = modules.includes(moduleName)}
              <button
                type="button"
                onclick={() => toggleModule(moduleName)}
                class="min-h-[84px] rounded-3xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 {isSelected ? 'border-blue-600 bg-blue-100 text-blue-900' : 'border-slate-200 bg-[#eef6ff] text-slate-800'}"
                style={isSelected
                  ? 'box-shadow:8px 8px 20px rgba(37,99,235,0.22),inset -4px -4px 10px rgba(29,78,216,0.2),inset 4px 4px 10px rgba(255,255,255,0.75)'
                  : 'box-shadow:6px 6px 16px rgba(15,23,42,0.12),inset -3px -3px 8px rgba(15,23,42,0.1),inset 3px 3px 8px rgba(255,255,255,0.75)'}
              >
                <div class="flex h-full items-start justify-between gap-2">
                  <span class="break-words text-sm font-semibold leading-5">{moduleName}</span>
                  {#if isSelected}<span class="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">ON</span>{/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <button type="submit" disabled={saving || loading} class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
        {saving ? 'Creating...' : 'Create Role Card'}
      </button>
    </form>
  </div>

  <div class="stat-card p-6">
    <h3 class="mb-4 text-lg font-semibold">Role Cards</h3>
    {#if loading}
      <p class="text-gray-500">Loading role cards...</p>
    {:else if cards.length === 0}
      <p class="text-gray-500">No role cards yet.</p>
    {:else}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each cards as card}
          <div
            class="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            onclick={() => openCardLogin(card)}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter') openCardLogin(card); }}
          >
            <div class="mb-3 flex items-start justify-between">
              <div>
                <p class="font-semibold text-gray-900">{card.roleName}</p>
                <p class="text-sm text-gray-600">{card.teacherId?.name || 'Teacher'}</p>
              </div>
              <button
                onclick={(e) => { e.stopPropagation(); handleDelete(card._id); }}
                class="text-red-600 hover:text-red-700"
                title="Delete role card"
              ><Trash2 class="h-4 w-4" /></button>
            </div>

            <div class="space-y-1 text-sm">
              <p class="flex items-center gap-2 text-gray-700"><Mail class="h-4 w-4" /><span>{card.teacherEmail}</span></p>
              <p class="flex items-center gap-2 text-gray-700"><KeyRound class="h-4 w-4" /><span>{card.generatedPassword}</span></p>
              <p class="flex items-center gap-2 text-gray-700">
                <UserCheck class="h-4 w-4" />
                <span>{card.createdAt ? new Date(card.createdAt).toLocaleString() : 'Recently created'}</span>
              </p>
            </div>

            <div class="mt-3">
              <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Modules</p>
              {#if card.modules.length === 0}
                <p class="text-sm text-gray-500">No module assigned</p>
              {:else}
                <div class="flex flex-wrap gap-1.5">
                  {#each card.modules as m}
                    <span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{m}</span>
                  {/each}
                </div>
              {/if}
            </div>

            <p class="mt-3 text-xs text-blue-600">Click card to open teacher login</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if showLoginModal && selectedCard}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h4 class="mb-1 text-lg font-semibold">Teacher Login</h4>
      <p class="mb-4 text-sm text-gray-600">{selectedCard.teacherId?.name || 'Teacher'} - {selectedCard.roleName}</p>

      {#if error}<p class="mb-3 text-sm text-red-600">{error}</p>{/if}

      <div class="space-y-3">
        <input type="email" bind:value={cardLoginEmail} placeholder="Teacher Email" class="w-full rounded border p-2" />
        <input type="text" bind:value={cardLoginPassword} placeholder="Generated Password" class="w-full rounded border p-2" />
      </div>

      <div class="mt-5 flex gap-2">
        <button type="button" onclick={() => (showLoginModal = false)} class="w-full rounded bg-gray-200 py-2" disabled={cardLoginLoading}>Cancel</button>
        <button type="button" onclick={handleCardLogin} class="w-full rounded bg-blue-600 py-2 text-white" disabled={cardLoginLoading}>
          {cardLoginLoading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  </div>
{/if}

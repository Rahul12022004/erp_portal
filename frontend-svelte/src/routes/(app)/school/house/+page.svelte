<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  type HouseName = 'Ruby' | 'Emerald' | 'Safier' | 'Topaz';

  type Student = {
    _id: string;
    name: string;
    class: string;
    rollNumber: string;
    house?: HouseName | '';
  };

  type SchoolClass = {
    _id: string;
    name: string;
    section?: string;
  };

  type HouseSectionConfig = {
    id: string;
    className: string;
    section: string;
    house: HouseName;
  };

  const HOUSES: Array<{ name: HouseName; cls: string }> = [
    { name: 'Ruby',    cls: 'bg-red-100 text-red-700 border-red-300'     },
    { name: 'Emerald', cls: 'bg-green-100 text-green-700 border-green-300' },
    { name: 'Safier',  cls: 'bg-blue-100 text-blue-700 border-blue-300'   },
    { name: 'Topaz',   cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  ];

  function splitClassLabel(value: string): { className: string; section: string } {
    const [left, right] = value.split(' - ');
    return { className: (left ?? '').trim(), section: (right ?? '').trim() };
  }

  const schoolId = $derived($page.data.user?.schoolId ?? '');

  let students = $state<Student[]>([]);
  let classes  = $state<SchoolClass[]>([]);
  let loading  = $state(true);
  let error    = $state('');
  let success  = $state('');

  let selectedClass   = $state('');
  let selectedSection = $state('');
  let targetHouse     = $state<HouseName>('Ruby');
  let autoAssigning   = $state(false);

  let houseConfigs  = $state<HouseSectionConfig[]>([]);
  let configSaving  = $state(false);
  let configForm    = $state<{ className: string; section: string; house: HouseName }>({ className: '', section: '', house: 'Ruby' });

  let savingStudentId = $state('');

  // ── derived ──────────────────────────────────────────────────────────────────
  const classOptions = $derived(
    [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b))
  );

  const sectionOptions = $derived(
    !selectedClass ? [] :
    [...new Set(classes.filter(c => c.name === selectedClass).map(c => c.section ?? '').filter(Boolean))].sort()
  );

  const filteredStudents = $derived(
    !selectedClass ? [] :
    students.filter(s => {
      const parsed = splitClassLabel(s.class ?? '');
      if (parsed.className !== selectedClass) return false;
      if (sectionOptions.length > 0) return parsed.section === selectedSection;
      return true;
    })
  );

  const houseCounts = $derived(
    HOUSES.map(h => ({
      ...h,
      count: filteredStudents.filter(s => s.house === h.name).length,
    }))
  );

  const configSectionOptions = $derived(
    !configForm.className ? [] :
    [...new Set(classes.filter(c => c.name === configForm.className).map(c => c.section ?? '').filter(Boolean))].sort()
  );

  // ── effects ───────────────────────────────────────────────────────────────────
  $effect(() => {
    if (sectionOptions.length === 0) { selectedSection = ''; return; }
    if (!sectionOptions.includes(selectedSection)) selectedSection = sectionOptions[0] ?? '';
  });

  $effect(() => {
    if (!schoolId) { houseConfigs = []; return; }
    try {
      const raw = localStorage.getItem(`house-class-configs:${schoolId}`);
      const parsed = JSON.parse(raw ?? 'null');
      houseConfigs = Array.isArray(parsed) ? parsed : [];
    } catch { houseConfigs = []; }
  });

  // ── data fetch ────────────────────────────────────────────────────────────────
  onMount(async () => {
    if (!schoolId) { error = 'School not found. Please log in again.'; loading = false; return; }
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/students/${schoolId}`),
        fetch(`/api/classes?schoolId=${schoolId}`),
      ]);
      if (!sRes.ok || !cRes.ok) throw new Error(`Failed to load (${sRes.status}/${cRes.status})`);
      const [sd, cd] = await Promise.all([sRes.json(), cRes.json()]);
      const unwrap = (d: unknown): unknown[] => {
        const inner = (d as Record<string, unknown>)?.data;
        if (Array.isArray(inner)) return inner;
        if (Array.isArray((inner as Record<string, unknown>)?.students)) return (inner as Record<string, unknown[]>).students;
        if (Array.isArray(d)) return d;
        return [];
      };
      students = unwrap(sd) as typeof students;
      classes  = unwrap(cd) as typeof classes;
      if (classes.length > 0 && !selectedClass) selectedClass = classes[0]?.name ?? '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch house data';
    } finally { loading = false; }
  });

  // ── helpers ───────────────────────────────────────────────────────────────────
  function saveConfigs(configs: HouseSectionConfig[]) {
    if (!schoolId) return;
    localStorage.setItem(`house-class-configs:${schoolId}`, JSON.stringify(configs));
  }

  async function assignHouse(student: Student, house: HouseName) {
    savingStudentId = student._id; error = ''; success = '';
    try {
      const res = await fetch(`/api/students/${student._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? 'Failed to assign house');
      students = students.map(s => s._id === student._id ? { ...s, house } : s);
      success = `${student.name} assigned to ${house}.`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to assign house';
    } finally { savingStudentId = ''; }
  }

  async function assignStudentsInScope(className: string, section: string, house: HouseName) {
    const targets = students.filter(s => {
      const p = splitClassLabel(s.class ?? '');
      if (p.className !== className) return false;
      if (section) return p.section === section;
      return true;
    }).filter(s => s.house !== house);

    if (targets.length === 0) { success = `All students already in ${house}.`; return; }

    await Promise.all(targets.map(async s => {
      const res = await fetch(`/api/students/${s._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message ?? `Failed: ${s.name}`); }
    }));

    students = students.map(s => {
      const p = splitClassLabel(s.class ?? '');
      const inScope = p.className === className && (!section || p.section === section);
      return inScope ? { ...s, house } : s;
    });
  }

  async function handleAutoAssign() {
    if (!selectedClass) { error = 'Please select class first.'; return; }
    autoAssigning = true; error = ''; success = '';
    try {
      await assignStudentsInScope(selectedClass, selectedSection, targetHouse);
      success = `Students of ${selectedClass}${selectedSection ? ` / ${selectedSection}` : ''} assigned to ${targetHouse}.`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to auto assign';
    } finally { autoAssigning = false; }
  }

  async function handleCreateConfig(e: Event) {
    e.preventDefault();
    if (!configForm.className) { error = 'Please select class for house section.'; return; }
    configSaving = true; error = ''; success = '';
    try {
      const id = `${configForm.className}::${configForm.section ?? ''}`;
      const next: HouseSectionConfig = { id, ...configForm };
      const nextConfigs = [...houseConfigs.filter(c => c.id !== id), next];
      houseConfigs = nextConfigs;
      saveConfigs(nextConfigs);
      await assignStudentsInScope(configForm.className, configForm.section, configForm.house);
      success = `House section created for ${configForm.className}${configForm.section ? ` / ${configForm.section}` : ''} → ${configForm.house}.`;
      configForm = { ...configForm, section: '' };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create house section';
    } finally { configSaving = false; }
  }
</script>

<svelte:head><title>House — ERP Portal</title></svelte:head>

<div class="space-y-6">

  <!-- ── House Assignment ─────────────────────────────────────────────────────── -->
  <div class="rounded-[28px] p-6" style="background:#eef6ff;box-shadow:8px 8px 22px rgba(15,23,42,0.15),inset -4px -4px 10px rgba(15,23,42,0.08),inset 4px 4px 10px rgba(255,255,255,0.7)">
    <h3 class="mb-4 text-lg font-semibold text-slate-800">House Assignment</h3>

    {#if error}<p class="mb-3 text-sm text-red-600">{error}</p>{/if}
    {#if success}<p class="mb-3 text-sm text-green-600">{success}</p>{/if}

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <select class="rounded border border-slate-200 p-2 text-sm" bind:value={selectedClass}>
        <option value="">Select Class</option>
        {#each classOptions as name}<option value={name}>{name}</option>{/each}
      </select>

      <select class="rounded border border-slate-200 p-2 text-sm" bind:value={selectedSection} disabled={sectionOptions.length === 0}>
        {#if sectionOptions.length === 0}
          <option value="">No section required</option>
        {:else}
          {#each sectionOptions as s}<option value={s}>Section {s}</option>{/each}
        {/if}
      </select>
    </div>

    <div class="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p class="mb-2 text-sm font-semibold text-blue-800">Auto assign students to a specific house</p>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <select class="rounded border border-blue-200 p-2 text-sm" bind:value={targetHouse}>
          {#each HOUSES as h}<option value={h.name}>{h.name}</option>{/each}
        </select>
        <button
          type="button"
          onclick={handleAutoAssign}
          disabled={autoAssigning || !selectedClass}
          class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {autoAssigning ? 'Assigning...' : 'Auto Assign Selected Class'}
        </button>
        <p class="self-center text-sm text-blue-700">
          Scope: {selectedClass || '—'}{selectedSection ? ` / ${selectedSection}` : ''}
        </p>
      </div>
    </div>
  </div>

  <!-- ── House Section Config ──────────────────────────────────────────────────── -->
  <div class="rounded-[28px] p-6" style="background:#f5f3ff;box-shadow:8px 8px 22px rgba(30,41,59,0.12),inset -4px -4px 10px rgba(15,23,42,0.08),inset 4px 4px 10px rgba(255,255,255,0.72)">
    <h3 class="mb-4 text-lg font-semibold text-slate-800">Create House Section For Class</h3>

    <form onsubmit={handleCreateConfig} class="grid grid-cols-1 gap-3 md:grid-cols-4">
      <select class="rounded border border-slate-200 p-2 text-sm" bind:value={configForm.className} required>
        <option value="">Select Class</option>
        {#each classOptions as name}<option value={name}>{name}</option>{/each}
      </select>

      <select class="rounded border border-slate-200 p-2 text-sm" bind:value={configForm.section}>
        <option value="">All Sections</option>
        {#each configSectionOptions as s}<option value={s}>{s}</option>{/each}
      </select>

      <select class="rounded border border-slate-200 p-2 text-sm" bind:value={configForm.house}>
        {#each HOUSES as h}<option value={h.name}>{h.name}</option>{/each}
      </select>

      <button
        type="submit"
        disabled={configSaving}
        class="rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {configSaving ? 'Saving...' : 'Create & Apply'}
      </button>
    </form>

    {#if houseConfigs.length > 0}
      <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {#each houseConfigs as config (config.id)}
          <div class="rounded-xl border border-violet-200 bg-white/70 p-3 text-sm">
            <p class="font-semibold text-slate-800">{config.className}{config.section ? ` / ${config.section}` : ' / All'}</p>
            <p class="text-violet-700">House: {config.house}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ── House Counts ───────────────────────────────────────────────────────────── -->
  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    {#each houseCounts as h (h.name)}
      <div class="rounded-lg border p-3 {h.cls}">
        <p class="text-sm font-medium">{h.name}</p>
        <p class="text-xl font-bold">{h.count}</p>
      </div>
    {/each}
  </div>

  <!-- ── Students Table ─────────────────────────────────────────────────────────── -->
  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h4 class="mb-4 text-base font-semibold text-slate-800">
      Students{selectedClass ? ` — ${selectedClass}${selectedSection ? ` / ${selectedSection}` : ''}` : ''}
    </h4>

    {#if loading}
      <p class="text-sm text-slate-400">Loading students...</p>
    {:else if filteredStudents.length === 0}
      <p class="text-sm text-slate-400">No students found for selected class/section.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th class="p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Roll No</th>
              <th class="p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Class</th>
              <th class="p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Current House</th>
              <th class="p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Assign House</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredStudents as student (student._id)}
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="p-2 font-medium text-slate-800">{student.name}</td>
                <td class="p-2 text-slate-600">{student.rollNumber}</td>
                <td class="p-2 text-slate-600">{student.class}</td>
                <td class="p-2">
                  {#if student.house}
                    <span class="rounded-full border px-2 py-0.5 text-xs font-semibold {HOUSES.find(h => h.name === student.house)?.cls ?? ''}">
                      {student.house}
                    </span>
                  {:else}
                    <span class="text-slate-400">—</span>
                  {/if}
                </td>
                <td class="p-2">
                  <div class="flex flex-wrap gap-1.5">
                    {#each HOUSES as h (h.name)}
                      <button
                        type="button"
                        disabled={savingStudentId === student._id}
                        onclick={() => assignHouse(student, h.name)}
                        class="rounded border px-2 py-0.5 text-xs font-semibold transition-opacity disabled:opacity-50 {h.cls}"
                      >
                        {h.name}
                      </button>
                    {/each}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

</div>

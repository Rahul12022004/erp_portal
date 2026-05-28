<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  type Student = { _id: string; name: string; class: string; rollNumber: string; house?: HouseName | '' };
  type SchoolClass = { _id: string; name: string; section?: string };
  type HouseName = 'Ruby' | 'Emerald' | 'Safier' | 'Topaz';
  type HouseSectionConfig = { id: string; className: string; section: string; house: HouseName };

  const HOUSES: Array<{ name: HouseName; className: string }> = [
    { name: 'Ruby', className: 'bg-red-100 text-red-700 border-red-300' },
    { name: 'Emerald', className: 'bg-green-100 text-green-700 border-green-300' },
    { name: 'Safier', className: 'bg-blue-100 text-blue-700 border-blue-300' },
    { name: 'Topaz', className: 'bg-amber-100 text-amber-700 border-amber-300' },
  ];

  function splitClassLabel(value: string): { className: string; section: string } {
    const [left, right] = value.split(' - ');
    return { className: (left || '').trim(), section: (right || '').trim() };
  }

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let students = $state<Student[]>([]);
  let classes = $state<SchoolClass[]>([]);
  let selectedClass = $state('');
  let selectedSection = $state('');
  let targetHouse = $state<HouseName>('Ruby');
  let autoAssigning = $state(false);
  let configSaving = $state(false);
  let houseConfigs = $state<HouseSectionConfig[]>([]);
  let configForm = $state<{ className: string; section: string; house: HouseName }>({ className: '', section: '', house: 'Ruby' });
  let loading = $state(true);
  let savingStudentId = $state('');
  let error = $state('');
  let success = $state('');

  onMount(async () => {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      const [studentsRes, classesRes] = await Promise.all([
        fetch(`/api/students/${schoolId}`),
        fetch(`/api/classes?schoolId=${schoolId}`),
      ]);
      if (!studentsRes.ok || !classesRes.ok) throw new Error('Failed to load data');
      const [studentsData, classesData] = await Promise.all([studentsRes.json(), classesRes.json()]);
      const unwrap = (d: unknown): unknown[] => {
        const inner = (d as Record<string, unknown>)?.data;
        if (Array.isArray(inner)) return inner;
        if (Array.isArray((inner as Record<string, unknown>)?.students)) return (inner as Record<string, unknown[]>).students;
        if (Array.isArray(d)) return d;
        return [];
      };
      students = unwrap(studentsData) as typeof students;
      classes = unwrap(classesData) as typeof classes;
      if (classes.length > 0 && !selectedClass) selectedClass = classes[0]?.name || '';

      try {
        const saved = localStorage.getItem(`house-class-configs:${schoolId}`);
        houseConfigs = saved ? JSON.parse(saved) : [];
      } catch { houseConfigs = []; }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch house data';
    } finally { loading = false; }
  });

  const classOptions = $derived(
    [...new Set(classes.map(c => c.name))].sort((a, b) => a.localeCompare(b))
  );

  const sectionOptions = $derived(
    selectedClass
      ? [...new Set(classes.filter(c => c.name === selectedClass).map(c => c.section || '').filter(Boolean))].sort((a, b) => a.localeCompare(b))
      : []
  );

  $effect(() => {
    if (sectionOptions.length === 0) { selectedSection = ''; return; }
    if (!sectionOptions.includes(selectedSection)) selectedSection = sectionOptions[0] ?? '';
  });

  const filteredStudents = $derived(
    !selectedClass ? [] : students.filter(s => {
      const p = splitClassLabel(s.class || '');
      if (p.className !== selectedClass) return false;
      if (sectionOptions.length > 0) return p.section === selectedSection;
      return true;
    })
  );

  const houseCounts = $derived(
    HOUSES.map(h => ({ name: h.name, count: filteredStudents.filter(s => s.house === h.name).length, className: h.className }))
  );

  const configSectionOptions = $derived(
    [...new Set(classes.filter(c => c.name === configForm.className).map(c => c.section || '').filter(Boolean))].sort((a, b) => a.localeCompare(b))
  );

  async function assignHouse(student: Student, house: HouseName) {
    try {
      savingStudentId = student._id; error = ''; success = '';
      const res = await fetch(`/api/students/${student._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ house }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to assign house');
      students = students.map(s => s._id === student._id ? { ...s, house } : s);
      success = `${student.name} assigned to ${house}.`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to assign house';
    } finally { savingStudentId = ''; }
  }

  function saveConfigs(configs: HouseSectionConfig[]) {
    if (!schoolId) return;
    localStorage.setItem(`house-class-configs:${schoolId}`, JSON.stringify(configs));
  }

  async function assignStudentsInScope(className: string, section: string, house: HouseName) {
    const targets = students.filter(s => {
      const p = splitClassLabel(s.class || '');
      if (p.className !== className) return false;
      if (section) return p.section === section;
      return true;
    });
    const toUpdate = targets.filter(s => s.house !== house);
    if (toUpdate.length === 0) { success = `All students are already in ${house}.`; return; }
    await Promise.all(toUpdate.map(async s => {
      const res = await fetch(`/api/students/${s._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ house }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || `Failed to assign ${s.name}`); }
    }));
    students = students.map(s => {
      const p = splitClassLabel(s.class || '');
      const inScope = p.className === className && (!section || p.section === section);
      return inScope ? { ...s, house } : s;
    });
  }

  async function handleAutoAssignSelected() {
    if (!selectedClass) { error = 'Please select class first.'; return; }
    try {
      autoAssigning = true; error = ''; success = '';
      await assignStudentsInScope(selectedClass, selectedSection, targetHouse);
      success = `Students of ${selectedClass}${selectedSection ? ` / ${selectedSection}` : ''} assigned to ${targetHouse}.`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to auto assign house';
    } finally { autoAssigning = false; }
  }

  async function handleCreateConfig(e: SubmitEvent) {
    e.preventDefault();
    if (!configForm.className) { error = 'Please select class for house section.'; return; }
    try {
      configSaving = true; error = ''; success = '';
      const id = `${configForm.className}::${configForm.section || ''}`;
      const nextConfig: HouseSectionConfig = { id, className: configForm.className, section: configForm.section, house: configForm.house };
      const nextConfigs = [...houseConfigs.filter(c => c.id !== id), nextConfig];
      houseConfigs = nextConfigs;
      saveConfigs(nextConfigs);
      await assignStudentsInScope(configForm.className, configForm.section, configForm.house);
      success = `House section created for ${configForm.className}${configForm.section ? ` / ${configForm.section}` : ''} -> ${configForm.house}.`;
      configForm = { ...configForm, section: '' };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create house section';
    } finally { configSaving = false; }
  }
</script>

<svelte:head><title>Discipline — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="rounded-[28px] p-6" style="background:#eef6ff;box-shadow:8px 8px 22px rgba(15,23,42,0.15),inset -4px -4px 10px rgba(15,23,42,0.08),inset 4px 4px 10px rgba(255,255,255,0.7)">
    <h3 class="mb-4 text-lg font-semibold">House Assignment</h3>
    {#if error}<p class="mb-3 text-sm text-red-600">{error}</p>{/if}
    {#if success}<p class="mb-3 text-sm text-green-600">{success}</p>{/if}

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <select class="rounded border p-2" bind:value={selectedClass}>
        <option value="">Select Class</option>
        {#each classOptions as name}<option value={name}>{name}</option>{/each}
      </select>
      <select class="rounded border p-2" bind:value={selectedSection} disabled={sectionOptions.length === 0}>
        {#if sectionOptions.length === 0}
          <option value="">No section required</option>
        {:else}
          {#each sectionOptions as section}<option value={section}>Section {section}</option>{/each}
        {/if}
      </select>
    </div>

    <div class="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p class="mb-2 text-sm font-semibold text-blue-800">Auto assign students to a specific house</p>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <select class="rounded border p-2" bind:value={targetHouse}>
          {#each HOUSES as house}<option value={house.name}>{house.name}</option>{/each}
        </select>
        <button
          type="button"
          disabled={autoAssigning || !selectedClass}
          onclick={handleAutoAssignSelected}
          class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {autoAssigning ? 'Assigning...' : 'Auto Assign Selected Class'}
        </button>
        <p class="text-sm text-blue-700">Scope: {selectedClass || '-'} {selectedSection ? `/ ${selectedSection}` : ''}</p>
      </div>
    </div>
  </div>

  <div class="rounded-[28px] p-6" style="background:#f5f3ff;box-shadow:8px 8px 22px rgba(30,41,59,0.12),inset -4px -4px 10px rgba(15,23,42,0.08),inset 4px 4px 10px rgba(255,255,255,0.72)">
    <h3 class="mb-4 text-lg font-semibold">Create House Section For Class</h3>
    <form onsubmit={handleCreateConfig} class="grid grid-cols-1 gap-3 md:grid-cols-4">
      <select class="rounded border p-2" bind:value={configForm.className} required>
        <option value="">Select Class</option>
        {#each classOptions as name}<option value={name}>{name}</option>{/each}
      </select>
      <select class="rounded border p-2" bind:value={configForm.section}>
        <option value="">All Sections</option>
        {#each configSectionOptions as section}<option value={section}>{section}</option>{/each}
      </select>
      <select class="rounded border p-2" bind:value={configForm.house}>
        {#each HOUSES as house}<option value={house.name}>{house.name}</option>{/each}
      </select>
      <button type="submit" disabled={configSaving} class="rounded bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-60">
        {configSaving ? 'Saving...' : 'Create & Apply'}
      </button>
    </form>

    {#if houseConfigs.length > 0}
      <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {#each houseConfigs as config}
          <div class="rounded-xl border border-violet-200 bg-white/70 p-3 text-sm">
            <p class="font-semibold text-slate-800">{config.className}{config.section ? ` / ${config.section}` : ' / All'}</p>
            <p class="text-violet-700">House: {config.house}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    {#each houseCounts as house}
      <div class="rounded-lg border p-3 {house.className}">
        <p class="text-sm font-medium">{house.name}</p>
        <p class="text-xl font-bold">{house.count}</p>
      </div>
    {/each}
  </div>

  <div class="stat-card p-6">
    <h4 class="mb-4 text-base font-semibold">
      Students {selectedClass ? `- ${selectedClass}${selectedSection ? ` / ${selectedSection}` : ''}` : ''}
    </h4>

    {#if loading}
      <p class="text-gray-500">Loading students...</p>
    {:else if filteredStudents.length === 0}
      <p class="text-gray-500">No students found for selected class/section.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px]">
          <thead>
            <tr class="border-b">
              <th class="p-2 text-left">Name</th>
              <th class="p-2 text-left">Roll No</th>
              <th class="p-2 text-left">Class</th>
              <th class="p-2 text-left">Current House</th>
              <th class="p-2 text-left">Assign House</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredStudents as student}
              <tr class="border-b hover:bg-gray-50">
                <td class="p-2 font-medium">{student.name}</td>
                <td class="p-2">{student.rollNumber}</td>
                <td class="p-2">{student.class}</td>
                <td class="p-2">{student.house || '-'}</td>
                <td class="p-2">
                  <div class="flex flex-wrap gap-2">
                    {#each HOUSES as house}
                      <button
                        type="button"
                        disabled={savingStudentId === student._id}
                        onclick={() => assignHouse(student, house.name)}
                        class="rounded border px-2 py-1 text-xs font-semibold {house.className}"
                      >{house.name}</button>
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

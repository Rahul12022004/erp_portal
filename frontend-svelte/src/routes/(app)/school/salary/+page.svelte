<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    Plus, Pencil, Trash2, ChevronDown, ChevronUp, IndianRupee, Calculator
  } from 'lucide-svelte';

  // ── design tokens ─────────────────────────────────────────────────────────
  const clayOuter = 'rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(18,165,136,0.08),transparent_40%),linear-gradient(180deg,#f0faf8_0%,#f1f8f6_50%,#f8fbff_100%)] p-3 space-y-5';
  const clayShell = 'rounded-[28px] border border-[#12A588]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2faf8_100%)] p-5 shadow-[0_18px_45px_rgba(18,165,136,0.08)]';
  const clayCard  = 'rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]';

  // ── types ──────────────────────────────────────────────────────────────────
  type Earning   = { label: string; amount: number };
  type Deduction = { label: string; type: 'percentage' | 'amount'; value: number };
  type Structure = {
    _id: string; name: string; status: 'Active' | 'Inactive';
    earnings: Earning[]; deductions: Deduction[];
  };

  type FormEarning   = { label: string; amount: string };
  type FormDeduction = { label: string; type: 'percentage' | 'amount'; value: string };

  // ── auth ───────────────────────────────────────────────────────────────────
  const schoolId = $derived($page.data.user?.schoolId ?? '');

  // ── list state ─────────────────────────────────────────────────────────────
  let structures   = $state<Structure[]>([]);
  let loading      = $state(true);
  let loadError    = $state('');
  let expandedIds  = $state<Set<string>>(new Set());

  // ── modal state ────────────────────────────────────────────────────────────
  let showModal    = $state(false);
  let editingId    = $state<string | null>(null);
  let saving       = $state(false);
  let saveError    = $state('');

  // form fields
  let formName     = $state('');
  let formStatus   = $state<'Active' | 'Inactive'>('Active');
  let formEarnings  = $state<FormEarning[]>([{ label: '', amount: '' }]);
  let formDeductions = $state<FormDeduction[]>([]);

  // ── delete state ───────────────────────────────────────────────────────────
  let deleteTargetId   = $state<string | null>(null);
  let deleteTargetName = $state('');
  let deleting         = $state(false);

  // ── helpers ────────────────────────────────────────────────────────────────
  const fmtINR = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  function calcGross(earnings: Earning[]) {
    return earnings.reduce((s, x) => s + Number(x.amount || 0), 0);
  }
  function calcDeductions(deductions: Deduction[], gross: number) {
    return deductions.reduce((s, x) => {
      const v = Number(x.value || 0);
      return s + (x.type === 'percentage' ? (gross * v) / 100 : v);
    }, 0);
  }
  function calcNet(earnings: Earning[], deductions: Deduction[]) {
    const gross = calcGross(earnings);
    return gross - calcDeductions(deductions, gross);
  }

  function toggleExpand(id: string) {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    expandedIds = next;
  }

  // ── fetch ──────────────────────────────────────────────────────────────────
  async function loadStructures() {
    if (!schoolId) return;
    try {
      loading = true; loadError = '';
      const res = await fetch(`/api/salary-structures/${encodeURIComponent(schoolId)}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      structures = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Failed to load salary structures';
    } finally {
      loading = false;
    }
  }

  onMount(() => { loadStructures(); });

  // ── modal helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    editingId = null;
    formName = '';
    formStatus = 'Active';
    formEarnings = [{ label: '', amount: '' }];
    formDeductions = [];
    saveError = '';
    showModal = true;
  }

  function openEdit(s: Structure) {
    editingId = s._id;
    formName = s.name;
    formStatus = s.status;
    formEarnings = s.earnings.length
      ? s.earnings.map(e => ({ label: e.label, amount: String(e.amount) }))
      : [{ label: '', amount: '' }];
    formDeductions = s.deductions.map(d => ({ label: d.label, type: d.type, value: String(d.value) }));
    saveError = '';
    showModal = true;
  }

  function closeModal() { showModal = false; saveError = ''; }

  // earnings row management
  function addEarning()  { formEarnings = [...formEarnings, { label: '', amount: '' }]; }
  function removeEarning(i: number) { formEarnings = formEarnings.filter((_, idx) => idx !== i); }

  // deductions row management
  function addDeduction()  { formDeductions = [...formDeductions, { label: '', type: 'amount', value: '' }]; }
  function removeDeduction(i: number) { formDeductions = formDeductions.filter((_, idx) => idx !== i); }

  // ── live preview (derived from form state) ─────────────────────────────────
  const previewEarnings = $derived(
    formEarnings
      .filter(e => e.label.trim())
      .map(e => ({ label: e.label.trim(), amount: Number(e.amount) || 0 }))
  );
  const previewDeductions = $derived(
    formDeductions
      .filter(d => d.label.trim())
      .map(d => ({ label: d.label.trim(), type: d.type, value: Number(d.value) || 0 }))
  );
  const previewGross = $derived(calcGross(previewEarnings));
  const previewDed   = $derived(calcDeductions(previewDeductions, previewGross));
  const previewNet   = $derived(previewGross - previewDed);

  // ── save ───────────────────────────────────────────────────────────────────
  async function handleSave(e: Event) {
    e.preventDefault();
    saveError = '';
    if (!formName.trim()) { saveError = 'Structure name is required.'; return; }
    if (formEarnings.filter(r => r.label.trim()).length === 0) {
      saveError = 'At least one earning component is required.'; return;
    }

    const body = {
      name: formName.trim(),
      status: formStatus,
      earnings: formEarnings
        .filter(r => r.label.trim())
        .map(r => ({ label: r.label.trim(), amount: Number(r.amount) || 0 })),
      deductions: formDeductions
        .filter(r => r.label.trim())
        .map(r => ({ label: r.label.trim(), type: r.type, value: Number(r.value) || 0 })),
    };

    try {
      saving = true;
      let res: Response;
      if (editingId) {
        res = await fetch(
          `/api/salary-structures/${encodeURIComponent(schoolId)}/${encodeURIComponent(editingId)}`,
          { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );
      } else {
        res = await fetch(
          `/api/salary-structures/${encodeURIComponent(schoolId)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );
      }
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || `Save failed (${res.status})`);
      }
      closeModal();
      await loadStructures();
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  function confirmDelete(id: string, name: string) {
    deleteTargetId = id;
    deleteTargetName = name;
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try {
      deleting = true;
      const res = await fetch(
        `/api/salary-structures/${encodeURIComponent(schoolId)}/${encodeURIComponent(deleteTargetId)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || `Delete failed (${res.status})`);
      }
      deleteTargetId = null;
      deleteTargetName = '';
      await loadStructures();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      deleting = false;
    }
  }
</script>

<svelte:head><title>Salary Structures — ERP Portal</title></svelte:head>

<div class={clayOuter}>
  <div class={clayShell}>

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="rounded-xl bg-emerald-50 p-2">
          <IndianRupee class="h-5 w-5 text-[#12A588]" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Salary Structures</h1>
          <p class="text-xs text-slate-500">Define and manage reusable salary templates</p>
        </div>
      </div>
      <button
        onclick={openCreate}
        class="flex items-center gap-1.5 rounded-xl bg-[#12A588] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0f8f75] transition-colors">
        <Plus class="h-4 w-4" />
        New Structure
      </button>
    </div>

    <!-- ── Loading skeleton ───────────────────────────────────────────────── -->
    {#if loading}
      <div class="space-y-3">
        {#each Array(3) as _, i (i)}
          <div class="h-24 animate-pulse rounded-[24px] bg-slate-100/80"></div>
        {/each}
      </div>

    <!-- ── Error state ────────────────────────────────────────────────────── -->
    {:else if loadError}
      <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center">
        <p class="text-sm font-medium text-red-600">{loadError}</p>
        <button onclick={loadStructures} class="mt-3 rounded-xl border border-red-200 px-4 py-1.5 text-xs text-red-600 hover:bg-red-100 transition-colors">
          Retry
        </button>
      </div>

    <!-- ── Empty state ────────────────────────────────────────────────────── -->
    {:else if structures.length === 0}
      <div class="flex flex-col items-center justify-center py-16">
        <div class="rounded-full bg-slate-100 p-5 mb-4">
          <Calculator class="h-8 w-8 text-slate-400" />
        </div>
        <p class="text-base font-semibold text-slate-700">No salary structures yet</p>
        <p class="mt-1 text-sm text-slate-400">Create a reusable template to assign to staff members</p>
        <button onclick={openCreate}
          class="mt-4 flex items-center gap-1.5 rounded-xl bg-[#12A588] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0f8f75] transition-colors">
          <Plus class="h-4 w-4" /> Create First Structure
        </button>
      </div>

    <!-- ── Structure list ─────────────────────────────────────────────────── -->
    {:else}
      <div class="space-y-3">
        {#each structures as s (s._id)}
          {@const gross = calcGross(s.earnings)}
          {@const ded   = calcDeductions(s.deductions, gross)}
          {@const net   = gross - ded}
          {@const isExpanded = expandedIds.has(s._id)}

          <div class={clayCard}>
            <!-- Card header row -->
            <div class="flex items-center gap-3">
              <!-- Name + badge -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-slate-800">{s.name}</span>
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold {s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                    {s.status}
                  </span>
                </div>
                <!-- salary summary -->
                <div class="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Gross <span class="font-semibold text-slate-700">{fmtINR(gross)}</span></span>
                  <span>Deductions <span class="font-semibold text-red-500">−{fmtINR(ded)}</span></span>
                  <span>Net <span class="font-bold text-[#12A588]">{fmtINR(net)}</span></span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onclick={() => openEdit(s)}
                  class="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  title="Edit structure">
                  <Pencil class="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onclick={() => confirmDelete(s._id, s.name)}
                  class="flex items-center gap-1 rounded-xl border border-red-100 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete structure">
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
                <button
                  onclick={() => toggleExpand(s._id)}
                  class="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition-colors"
                  title="{isExpanded ? 'Collapse' : 'Expand'} breakdown">
                  {#if isExpanded}
                    <ChevronUp class="h-4 w-4" />
                  {:else}
                    <ChevronDown class="h-4 w-4" />
                  {/if}
                </button>
              </div>
            </div>

            <!-- Expanded breakdown -->
            {#if isExpanded}
              <div class="mt-3 border-t border-slate-100 pt-3 grid gap-4 sm:grid-cols-2">
                <!-- Earnings -->
                <div>
                  <p class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Earnings</p>
                  {#if s.earnings.length === 0}
                    <p class="text-xs text-slate-400 italic">No earnings defined</p>
                  {:else}
                    <div class="space-y-1">
                      {#each s.earnings as e (e.label)}
                        <div class="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3 py-1.5">
                          <span class="text-xs text-slate-700">{e.label}</span>
                          <span class="text-xs font-semibold text-emerald-700">{fmtINR(e.amount)}</span>
                        </div>
                      {/each}
                      <div class="flex items-center justify-between px-3 py-1">
                        <span class="text-xs font-bold text-slate-600">Gross Total</span>
                        <span class="text-xs font-bold text-slate-800">{fmtINR(gross)}</span>
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- Deductions -->
                <div>
                  <p class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Deductions</p>
                  {#if s.deductions.length === 0}
                    <p class="text-xs text-slate-400 italic">No deductions</p>
                  {:else}
                    <div class="space-y-1">
                      {#each s.deductions as d (d.label)}
                        {@const dAmt = d.type === 'percentage' ? (gross * d.value) / 100 : d.value}
                        <div class="flex items-center justify-between rounded-xl bg-red-50/60 px-3 py-1.5">
                          <span class="text-xs text-slate-700">
                            {d.label}
                            <span class="text-slate-400">({d.type === 'percentage' ? `${d.value}%` : fmtINR(d.value)})</span>
                          </span>
                          <span class="text-xs font-semibold text-red-600">−{fmtINR(dAmt)}</span>
                        </div>
                      {/each}
                      <div class="flex items-center justify-between px-3 py-1">
                        <span class="text-xs font-bold text-slate-600">Total Deductions</span>
                        <span class="text-xs font-bold text-red-600">−{fmtINR(ded)}</span>
                      </div>
                    </div>
                  {/if}

                  <!-- Net -->
                  <div class="mt-2 flex items-center justify-between rounded-xl bg-[#12A588]/10 px-3 py-2">
                    <span class="text-xs font-bold text-[#12A588]">Net Salary</span>
                    <span class="text-sm font-extrabold text-[#12A588]">{fmtINR(net)}</span>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- ── Create / Edit Modal ────────────────────────────────────────────────── -->
{#if showModal}
  <div
    class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>

    <div class="w-full max-w-2xl rounded-[28px] border border-[#12A588]/20 bg-white shadow-2xl">

      <!-- Modal header -->
      <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div class="flex items-center gap-2">
          <Calculator class="h-5 w-5 text-[#12A588]" />
          <h2 class="text-base font-semibold text-slate-800">
            {editingId ? 'Edit Salary Structure' : 'Create Salary Structure'}
          </h2>
        </div>
        <button onclick={closeModal} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">✕</button>
      </div>

      <form onsubmit={handleSave} class="p-6 space-y-6">

        <!-- Name + Status row -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">
              Structure Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Teaching Staff Grade A"
              bind:value={formName}
              required
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#12A588] focus:ring-2 focus:ring-[#12A588]/20 transition" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Status</label>
            <select
              bind:value={formStatus}
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#12A588] focus:ring-2 focus:ring-[#12A588]/20 transition">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <!-- Earnings section -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Earnings</p>
            <button
              type="button"
              onclick={addEarning}
              class="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[#12A588] hover:bg-emerald-50 transition-colors">
              <Plus class="h-3.5 w-3.5" /> Add Row
            </button>
          </div>
          <div class="space-y-2">
            {#each formEarnings as row, i (i)}
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Basic Salary)"
                  bind:value={formEarnings[i].label}
                  class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#12A588] focus:ring-2 focus:ring-[#12A588]/20 transition" />
                <div class="relative flex-shrink-0 w-36">
                  <IndianRupee class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Amount"
                    bind:value={formEarnings[i].amount}
                    class="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm outline-none focus:border-[#12A588] focus:ring-2 focus:ring-[#12A588]/20 transition" />
                </div>
                <button
                  type="button"
                  onclick={() => removeEarning(i)}
                  disabled={formEarnings.length === 1}
                  class="rounded-lg p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Deductions section -->
        <div>
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Deductions</p>
            <button
              type="button"
              onclick={addDeduction}
              class="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[#12A588] hover:bg-emerald-50 transition-colors">
              <Plus class="h-3.5 w-3.5" /> Add Row
            </button>
          </div>
          {#if formDeductions.length === 0}
            <p class="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-400 text-center">
              No deductions — click "Add Row" to add one
            </p>
          {:else}
            <div class="space-y-2">
              {#each formDeductions as row, i (i)}
                <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    placeholder="Label (e.g. PF, TDS)"
                    bind:value={formDeductions[i].label}
                    class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#12A588] focus:ring-2 focus:ring-[#12A588]/20 transition" />
                  <select
                    bind:value={formDeductions[i].type}
                    class="w-28 flex-shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-[#12A588] focus:ring-2 focus:ring-[#12A588]/20 transition">
                    <option value="amount">Fixed ₹</option>
                    <option value="percentage">% of Gross</option>
                  </select>
                  <div class="relative flex-shrink-0 w-28">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={formDeductions[i].type === 'percentage' ? '%' : '₹'}
                      bind:value={formDeductions[i].value}
                      class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#12A588] focus:ring-2 focus:ring-[#12A588]/20 transition" />
                  </div>
                  <button
                    type="button"
                    onclick={() => removeDeduction(i)}
                    class="rounded-lg p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Live net salary preview -->
        <div class="rounded-[20px] border border-[#12A588]/20 bg-[linear-gradient(135deg,#f0faf8,#f8fffd)] px-5 py-4">
          <div class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#12A588]">
            <Calculator class="h-3.5 w-3.5" />
            Live Preview
          </div>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <p class="text-xs text-slate-500">Gross</p>
              <p class="text-base font-bold text-slate-800">{fmtINR(previewGross)}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Deductions</p>
              <p class="text-base font-bold text-red-500">−{fmtINR(previewDed)}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Net Salary</p>
              <p class="text-lg font-extrabold text-[#12A588]">{fmtINR(previewNet)}</p>
            </div>
          </div>
        </div>

        <!-- Error message -->
        {#if saveError}
          <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {saveError}
          </div>
        {/if}

        <!-- Action buttons -->
        <div class="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            class="flex-1 rounded-xl bg-[#12A588] py-2.5 text-sm font-semibold text-white hover:bg-[#0f8f75] disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : editingId ? 'Update Structure' : 'Create Structure'}
          </button>
          <button
            type="button"
            onclick={closeModal}
            class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ── Delete Confirm Dialog ──────────────────────────────────────────────── -->
{#if deleteTargetId}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    role="dialog"
    aria-modal="true">
    <div class="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl">
      <div class="mb-1 flex items-center gap-2">
        <Trash2 class="h-5 w-5 text-red-500" />
        <h3 class="text-base font-semibold text-slate-800">Delete Structure</h3>
      </div>
      <p class="mt-1 text-sm text-slate-500">
        Are you sure you want to delete <strong class="text-slate-700">"{deleteTargetName}"</strong>?
        This action cannot be undone.
      </p>
      <div class="mt-5 flex gap-2">
        <button
          onclick={handleDelete}
          disabled={deleting}
          class="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors">
          {deleting ? 'Deleting…' : 'Yes, Delete'}
        </button>
        <button
          onclick={() => { deleteTargetId = null; deleteTargetName = ''; }}
          class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

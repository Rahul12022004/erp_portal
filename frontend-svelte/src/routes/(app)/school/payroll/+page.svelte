<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { IndianRupee, Plus, Check, AlertCircle, ChevronDown } from 'lucide-svelte';

  const clayOuter = 'rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(18,165,136,0.08),transparent_40%),linear-gradient(180deg,#f0faf8_0%,#f1f8f6_50%,#f8fbff_100%)] p-3 space-y-5';
  const clayShell = 'rounded-[28px] border border-[#12A588]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2faf8_100%)] p-5 shadow-[0_18px_45px_rgba(18,165,136,0.08)]';
  const clayCard  = 'rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]';
  const clayInset = 'rounded-[22px] border border-slate-200/75 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_20px_rgba(148,163,184,0.10)]';

  type PayrollEntry = {
    _id: string;
    staffId: string;
    staffName: string;
    month: number;
    year: number;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    status: 'pending' | 'paid' | 'cancelled';
    paidAt?: string;
    createdAt: string;
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let entries = $state<PayrollEntry[]>([]);
  let loading = $state(true);
  let error = $state('');

  const now = new Date();
  let selMonth = $state(now.getMonth() + 1);
  let selYear = $state(now.getFullYear());

  let showForm = $state(false);
  let saving = $state(false);
  let form = $state({ staffId: '', staffName: '', basicSalary: '', allowances: '0', deductions: '0' });

  async function fetchPayroll() {
    if (!schoolId) return;
    try {
      loading = true;
      error = '';
      const params = new URLSearchParams({ schoolId, month: String(selMonth), year: String(selYear) });
      const res = await fetch(`/api/payroll?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      entries = data.data ?? data ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load payroll';
    } finally {
      loading = false;
    }
  }

  async function markPaid(id: string) {
    try {
      const res = await fetch(`/api/payroll/${id}/pay`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await fetchPayroll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark paid');
    }
  }

  async function createEntry() {
    if (!form.staffName || !form.basicSalary) return;
    try {
      saving = true;
      const body = {
        schoolId,
        staffId: form.staffId,
        staffName: form.staffName,
        month: selMonth,
        year: selYear,
        basicSalary: parseFloat(form.basicSalary) || 0,
        allowances: parseFloat(form.allowances) || 0,
        deductions: parseFloat(form.deductions) || 0,
      };
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      form = { staffId: '', staffName: '', basicSalary: '', allowances: '0', deductions: '0' };
      showForm = false;
      await fetchPayroll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create entry');
    } finally {
      saving = false;
    }
  }

  const totalNet = $derived(entries.reduce((s, e) => s + e.netSalary, 0));
  const totalPaid = $derived(entries.filter(e => e.status === 'paid').reduce((s, e) => s + e.netSalary, 0));
  const totalPending = $derived(totalNet - totalPaid);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  $effect(() => {
    selMonth; selYear;
    fetchPayroll();
  });
</script>

<div class={clayOuter}>
  <div class={clayShell}>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-emerald-50">
          <IndianRupee class="w-5 h-5 text-emerald-600" />
        </div>
        <h1 class="text-xl font-semibold text-slate-800">Payroll</h1>
      </div>
      <div class="flex items-center gap-2">
        <!-- Month picker -->
        <div class="flex items-center gap-1 rounded-xl border border-slate-200 px-2 py-1.5 text-sm">
          <select bind:value={selMonth} class="bg-transparent outline-none text-slate-700 cursor-pointer">
            {#each MONTHS as m, i}
              <option value={i + 1}>{m}</option>
            {/each}
          </select>
          <select bind:value={selYear} class="bg-transparent outline-none text-slate-700 cursor-pointer">
            {#each [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1] as y}
              <option value={y}>{y}</option>
            {/each}
          </select>
        </div>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-[#12A588] text-white hover:bg-[#0f8f75] transition-colors"
          onclick={() => showForm = !showForm}>
          <Plus class="w-4 h-4" />
          Add Entry
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <div class={clayInset}>
        <p class="text-xs text-slate-500 mb-1">Total Payroll</p>
        <p class="text-lg font-bold text-slate-800">{fmt(totalNet)}</p>
      </div>
      <div class={clayInset}>
        <p class="text-xs text-slate-500 mb-1">Paid</p>
        <p class="text-lg font-bold text-emerald-600">{fmt(totalPaid)}</p>
      </div>
      <div class={clayInset}>
        <p class="text-xs text-slate-500 mb-1">Pending</p>
        <p class="text-lg font-bold text-amber-600">{fmt(totalPending)}</p>
      </div>
    </div>

    <!-- Add form -->
    {#if showForm}
      <div class="{clayCard} mb-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">New Payroll Entry — {MONTHS[selMonth - 1]} {selYear}</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="col-span-2">
            <label for="payroll-staff-name" class="block text-xs text-slate-500 mb-1">Staff Name *</label>
            <input id="payroll-staff-name" bind:value={form.staffName} placeholder="Full name"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/80 outline-none focus:border-[#12A588] text-slate-800" />
          </div>
          <div>
            <label for="payroll-basic-salary" class="block text-xs text-slate-500 mb-1">Basic Salary (₹) *</label>
            <input id="payroll-basic-salary" bind:value={form.basicSalary} type="number" min="0" placeholder="0"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/80 outline-none focus:border-[#12A588] text-slate-800" />
          </div>
          <div>
            <label for="payroll-allowances" class="block text-xs text-slate-500 mb-1">Allowances (₹)</label>
            <input id="payroll-allowances" bind:value={form.allowances} type="number" min="0" placeholder="0"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/80 outline-none focus:border-[#12A588] text-slate-800" />
          </div>
          <div>
            <label for="payroll-deductions" class="block text-xs text-slate-500 mb-1">Deductions (₹)</label>
            <input id="payroll-deductions" bind:value={form.deductions} type="number" min="0" placeholder="0"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/80 outline-none focus:border-[#12A588] text-slate-800" />
          </div>
          <div class="flex items-end">
            <p class="text-xs text-slate-500">
              Net: <span class="font-bold text-slate-700">
                {fmt((parseFloat(form.basicSalary) || 0) + (parseFloat(form.allowances) || 0) - (parseFloat(form.deductions) || 0))}
              </span>
            </p>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button onclick={createEntry} disabled={saving}
            class="px-4 py-2 rounded-xl text-sm bg-[#12A588] text-white hover:bg-[#0f8f75] disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
          <button onclick={() => showForm = false}
            class="px-4 py-2 rounded-xl text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- List -->
    {#if loading}
      <div class="flex justify-center py-12">
        <div class="w-8 h-8 rounded-full border-2 border-[#12A588] border-t-transparent animate-spin"></div>
      </div>
    {:else if error}
      <div class="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 text-sm">
        <AlertCircle class="w-4 h-4 flex-shrink-0" />{error}
      </div>
    {:else if entries.length === 0}
      <div class="text-center py-12 text-slate-400">
        <IndianRupee class="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p class="text-sm">No payroll entries for {MONTHS[selMonth - 1]} {selYear}</p>
      </div>
    {:else}
      <div class="space-y-2">
        <div class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>Staff</span><span class="text-right">Basic</span><span class="text-right">Net</span><span>Status</span><span></span>
        </div>
        {#each entries as e (e._id)}
          <div class="{clayCard} grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center">
            <div>
              <p class="font-medium text-slate-800 text-sm">{e.staffName}</p>
              <p class="text-xs text-slate-400">{MONTHS[e.month - 1]} {e.year}</p>
            </div>
            <p class="text-sm text-slate-600 text-right">{fmt(e.basicSalary)}</p>
            <p class="text-sm font-semibold text-slate-800 text-right">{fmt(e.netSalary)}</p>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium
              {e.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
               e.status === 'cancelled' ? 'bg-red-100 text-red-600' :
               'bg-amber-100 text-amber-700'}">
              {e.status}
            </span>
            {#if e.status === 'pending'}
              <button
                class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                onclick={() => markPaid(e._id)}>
                <Check class="w-3 h-3" />Pay
              </button>
            {:else}
              <span></span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

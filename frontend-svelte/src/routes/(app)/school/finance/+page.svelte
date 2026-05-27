<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  // ── types ───────────────────────────────────────────────────────────────────

  type FeeStats = { totalFeeAmount: number; collectedAmount: number; pendingAmount: number; totalStudents: number; paidCount: number; partialCount: number; unpaidCount: number; overdueCount: number };
  type DashboardSummary = { fee?: FeeStats };

  type ClassFeeStructure = {
    _id: string; class_id: string; section_id?: string; academic_year: string;
    academic_fee: number; default_transport_fee: number; other_fee: number; due_date: string;
    late_fee_type: string; late_fee_amount: number; late_fee_grace_days: number; late_fee_description?: string;
    paidCount: number; pendingCount: number; assignedCount: number;
  };

  type SchoolClassItem = { _id: string; name: string; section?: string };
  type FeeComponent = { label: string; amount: number };
  type StudentFeeItem = {
    studentId: string; financeId?: string;
    student: { name: string; class: string; rollNumber?: string };
    status: string; totalFee: number; paidAmount: number; remainingAmount: number;
    currentDueAmount?: number; dueDate?: string; feeComponents: FeeComponent[]; olderPendingAmount?: number;
  };
  type SummaryMetrics = { totalStudents: number; currentTotalFee: number; currentPaidAmount: number; currentPendingAmount: number; overdueCount: number; outstandingBalance: number };
  type StudentSummaryResponse = { items: StudentFeeItem[]; metrics?: SummaryMetrics; pagination?: { totalPages: number; totalItems: number } };

  // ── auth ────────────────────────────────────────────────────────────────────

  const schoolId = $derived($page.data.user?.schoolId ?? '');

  // ── tab ─────────────────────────────────────────────────────────────────────

  type Tab = 'overview' | 'fee-structures' | 'student-fees';
  let activeTab = $state<Tab>('overview');

  // ── overview state ──────────────────────────────────────────────────────────

  let years = $state<string[]>([]);
  let selectedYear = $state('');
  let summary = $state<DashboardSummary | null>(null);
  let overviewLoading = $state(false);
  let overviewError = $state('');

  // ── fee structures state ─────────────────────────────────────────────────

  type LateFeeType = 'none' | 'fixed' | 'daily' | 'percentage';
  type FeeForm = { classId: string; academicYear: string; academicFee: string; transportFee: string; otherFee: string; dueDate: string; lateFeeType: LateFeeType; lateFeeAmount: string; lateFeeGraceDays: string; lateFeeDescription: string };

  const EMPTY_FORM: FeeForm = { classId: '', academicYear: '', academicFee: '', transportFee: '0', otherFee: '0', dueDate: '', lateFeeType: 'none', lateFeeAmount: '0', lateFeeGraceDays: '0', lateFeeDescription: '' };

  let structures = $state<ClassFeeStructure[]>([]);
  let schoolClasses = $state<SchoolClassItem[]>([]);
  let structuresLoading = $state(false);
  let structuresError = $state('');
  let editingId = $state<string | null>(null);
  let feeForm = $state<FeeForm>({ ...EMPTY_FORM });
  let showLateFee = $state(false);
  let savingStructure = $state(false);
  let structureSaveError = $state('');
  let structureSaveSuccess = $state('');

  // ── student fees state ───────────────────────────────────────────────────

  let sfYear = $state('');
  let sfClass = $state('');
  let sfStatus = $state('all');
  let sfSearch = $state('');
  let sfPage = $state(1);
  let sfItems = $state<StudentFeeItem[]>([]);
  let sfMetrics = $state<SummaryMetrics | null>(null);
  let sfPagination = $state<{ totalPages: number; totalItems: number } | null>(null);
  let sfLoading = $state(false);
  let sfError = $state('');
  let sfDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let modalItem = $state<StudentFeeItem | null>(null);
  let payForm = $state({ amount: '', mode: 'cash', date: new Date().toISOString().slice(0, 10), refNo: '', remarks: '' });
  let payError = $state('');
  let payLoading = $state(false);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const fmtShort = (n: number) => {
    const v = Number(n || 0);
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
    if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
    if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  };
  const pct = (part: number, total: number) => total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;

  const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
    paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700' },
    partial: { label: 'Partial', bg: 'bg-amber-100', text: 'text-amber-700' },
    overdue: { label: 'Overdue', bg: 'bg-red-100', text: 'text-red-700' },
    pending: { label: 'Pending', bg: 'bg-slate-100', text: 'text-slate-600' },
  };

  // ── load helpers ─────────────────────────────────────────────────────────

  async function loadYears() {
    if (!schoolId) return;
    try {
      const r = await fetch(`/api/finance/${encodeURIComponent(schoolId)}/available-years`);
      const data = await r.json();
      years = Array.isArray(data?.years) ? data.years : [];
      if (years.length && !selectedYear) { selectedYear = years[0]; sfYear = years[0]; }
    } catch { /* ignore */ }
  }

  async function loadSummary() {
    if (!schoolId) return;
    try {
      overviewLoading = true; overviewError = '';
      const qs = selectedYear ? `?academicYear=${encodeURIComponent(selectedYear)}` : '';
      const r = await fetch(`/api/finance/${encodeURIComponent(schoolId)}/dashboard-summary${qs}`);
      if (!r.ok) throw new Error(`Failed to load summary (${r.status})`);
      summary = await r.json();
    } catch (e) { overviewError = e instanceof Error ? e.message : 'Failed to load finance overview'; }
    finally { overviewLoading = false; }
  }

  async function loadStructures() {
    if (!schoolId) return;
    try {
      structuresLoading = true; structuresError = '';
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/finance/class-fee-structures?schoolId=${encodeURIComponent(schoolId)}`),
        fetch(`/api/classes/${schoolId}`),
      ]);
      if (!sRes.ok) throw new Error(`Failed to load fee structures (${sRes.status})`);
      const sData = await sRes.json();
      structures = Array.isArray(sData?.data) ? sData.data : Array.isArray(sData) ? sData : [];
      const cData = cRes.ok ? await cRes.json() : [];
      schoolClasses = Array.isArray(cData) ? cData : [];
    } catch (e) { structuresError = e instanceof Error ? e.message : 'Failed to load fee structures'; }
    finally { structuresLoading = false; }
  }

  async function loadStudentFees() {
    if (!schoolId) return;
    try {
      sfLoading = true; sfError = '';
      const params = new URLSearchParams({ page: String(sfPage), limit: '20' });
      if (sfYear) params.set('academicYear', sfYear);
      if (sfClass) params.set('className', sfClass);
      if (sfSearch) params.set('search', sfSearch);
      const r = await fetch(`/api/finance/${encodeURIComponent(schoolId)}/students/summary?${params}`);
      if (!r.ok) throw new Error(`Failed to load student fees (${r.status})`);
      const resp = await r.json();
      const data: StudentSummaryResponse = resp?.data || resp;
      sfItems = Array.isArray(data?.items) ? data.items : [];
      sfMetrics = data?.metrics || null;
      sfPagination = data?.pagination || null;
    } catch (e) { sfError = e instanceof Error ? e.message : 'Failed to load student fees'; }
    finally { sfLoading = false; }
  }

  // ── lifecycle ────────────────────────────────────────────────────────────

  onMount(async () => {
    if (!schoolId) return;
    await loadYears();
    loadSummary();
    loadStructures();
    loadStudentFees();
  });

  $effect(() => {
    if (schoolId && selectedYear) loadSummary();
  });

  $effect(() => {
    if (schoolId && sfYear !== undefined && sfClass !== undefined && sfPage !== undefined) {
      if (sfDebounceTimer) clearTimeout(sfDebounceTimer);
      sfDebounceTimer = setTimeout(() => loadStudentFees(), 300);
    }
  });

  // ── fee structure form ───────────────────────────────────────────────────

  function startEdit(s: ClassFeeStructure) {
    editingId = s._id;
    feeForm = { classId: s.class_id, academicYear: s.academic_year, academicFee: String(s.academic_fee), transportFee: String(s.default_transport_fee), otherFee: String(s.other_fee), dueDate: s.due_date, lateFeeType: s.late_fee_type as LateFeeType, lateFeeAmount: String(s.late_fee_amount), lateFeeGraceDays: String(s.late_fee_grace_days), lateFeeDescription: s.late_fee_description || '' };
    showLateFee = s.late_fee_type !== 'none';
    structureSaveError = ''; structureSaveSuccess = '';
  }

  function cancelEdit() {
    editingId = null; feeForm = { ...EMPTY_FORM }; showLateFee = false;
    structureSaveError = ''; structureSaveSuccess = '';
  }

  async function saveStructure(e: Event) {
    e.preventDefault();
    structureSaveError = ''; structureSaveSuccess = '';
    const acFee = Number(feeForm.academicFee) || 0;
    const trFee = Number(feeForm.transportFee) || 0;
    const otFee = Number(feeForm.otherFee) || 0;
    if (!feeForm.classId || !feeForm.academicYear || !feeForm.dueDate) { structureSaveError = 'Class, Academic Year, and Due Date are required.'; return; }
    if (acFee <= 0 && trFee <= 0 && otFee <= 0) { structureSaveError = 'At least one fee amount must be greater than 0.'; return; }
    const lateFeePayload = showLateFee
      ? { late_fee_type: feeForm.lateFeeType, late_fee_amount: Number(feeForm.lateFeeAmount) || 0, late_fee_grace_days: Number(feeForm.lateFeeGraceDays) || 0, late_fee_description: feeForm.lateFeeDescription }
      : { late_fee_type: 'none', late_fee_amount: 0, late_fee_grace_days: 0, late_fee_description: '' };
    try {
      savingStructure = true;
      if (editingId) {
        const r = await fetch(`/api/finance/class-fee-structures/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId, academic_fee: acFee, default_transport_fee: trFee, other_fee: otFee, due_date: feeForm.dueDate, ...lateFeePayload }) });
        if (!r.ok) { const d = await r.json().catch(() => null); throw new Error(d?.message || 'Update failed.'); }
        structureSaveSuccess = 'Updated and assignments synced.';
      } else {
        const r = await fetch('/api/finance/class-fee-structures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId, class_id: feeForm.classId, academic_year: feeForm.academicYear, academic_fee: acFee, default_transport_fee: trFee, other_fee: otFee, due_date: feeForm.dueDate, ...lateFeePayload }) });
        if (!r.ok) { const d = await r.json().catch(() => null); throw new Error(d?.message || 'Create failed.'); }
        structureSaveSuccess = 'Created and auto-assigned to all active students.';
        feeForm = { ...EMPTY_FORM }; showLateFee = false;
      }
      await loadStructures();
    } catch (e) { structureSaveError = e instanceof Error ? e.message : 'Save failed.'; }
    finally { savingStructure = false; }
  }

  // ── payment modal ────────────────────────────────────────────────────────

  function openPayModal(item: StudentFeeItem) {
    modalItem = item;
    payForm = { amount: String(item.currentDueAmount && item.currentDueAmount > 0 ? item.currentDueAmount : item.remainingAmount), mode: 'cash', date: new Date().toISOString().slice(0, 10), refNo: '', remarks: '' };
    payError = '';
  }

  async function recordPayment(e: Event) {
    e.preventDefault();
    if (!modalItem?.financeId) { payError = 'No fee assignment found for this student'; return; }
    if (!payForm.amount || Number(payForm.amount) <= 0) { payError = 'Enter a valid amount'; return; }
    try {
      payLoading = true; payError = '';
      const r = await fetch('/api/finance/student-fee-payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId, student_fee_assignment_id: modalItem.financeId, payment_date: payForm.date, payment_amount: Number(payForm.amount), payment_mode: payForm.mode, reference_no: payForm.refNo || undefined, remarks: payForm.remarks || undefined }) });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.message || 'Payment failed');
      modalItem = null;
      await loadStudentFees();
      await loadSummary();
    } catch (e) { payError = e instanceof Error ? e.message : 'Payment failed'; }
    finally { payLoading = false; }
  }

  // ── derived ──────────────────────────────────────────────────────────────

  const fee = $derived(summary?.fee);
  const collPct = $derived(pct(fee?.collectedAmount ?? 0, fee?.totalFeeAmount ?? 0));

  const filteredSfItems = $derived(
    sfStatus === 'all' ? sfItems : sfItems.filter(i => i.status === sfStatus)
  );

  const uniqueClasses = $derived.by(() => {
    const seen = new Set<string>();
    return schoolClasses.filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; });
  });
</script>

<svelte:head><title>Finance — ERP Portal</title></svelte:head>

<!-- ── Tab navigation ────────────────────────────────────────────────────── -->
<div class="space-y-6">
  <div class="flex gap-1 rounded-2xl bg-slate-100 p-1.5 w-fit">
    {#each [['overview','Overview'],['fee-structures','Fee Structures'],['student-fees','Student Fees']] as [id, label] (id)}
      <button onclick={() => (activeTab = id as Tab)}
        class="px-4 py-2 rounded-xl text-sm font-semibold transition-all {activeTab === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
        {label}
      </button>
    {/each}
  </div>

  <!-- ── OVERVIEW TAB ────────────────────────────────────────────────────── -->
  {#if activeTab === 'overview'}
    <div class="stat-card p-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold">Finance Overview</h2>
        <p class="text-sm text-muted-foreground">School-wide fee health and collection status</p>
      </div>
      <div class="flex gap-2">
        <select class="border rounded-lg px-3 py-1.5 text-sm bg-white" bind:value={selectedYear}>
          {#each years as y (y)}<option value={y}>{y}</option>{/each}
          {#if years.length === 0}<option value="">All Years</option>{/if}
        </select>
        <button onclick={loadSummary} disabled={overviewLoading} class="border rounded-lg px-3 py-1.5 text-sm bg-white hover:bg-slate-50 disabled:opacity-50">
          {overviewLoading ? '↻' : '↻'} Refresh
        </button>
      </div>
    </div>

    {#if overviewError}
      <div class="stat-card p-4 text-red-600 text-sm">{overviewError}</div>
    {/if}

    <!-- KPI cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {#if overviewLoading}
        {#each Array(6) as _, i (i)}
          <div class="h-28 animate-pulse rounded-2xl bg-slate-100"></div>
        {/each}
      {:else}
        <div class="stat-card p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Total Billed</p>
          <p class="text-xl font-extrabold mt-2">{fmtShort(fee?.totalFeeAmount ?? 0)}</p>
          <p class="text-xs text-slate-500">{fee?.totalStudents ?? 0} students</p>
        </div>
        <div class="stat-card p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Collected</p>
          <p class="text-xl font-extrabold mt-2 text-emerald-600">{fmtShort(fee?.collectedAmount ?? 0)}</p>
          <p class="text-xs text-slate-500">{collPct}% of billed</p>
        </div>
        <div class="stat-card p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Pending</p>
          <p class="text-xl font-extrabold mt-2 text-amber-600">{fmtShort(fee?.pendingAmount ?? 0)}</p>
          <p class="text-xs text-slate-500">outstanding</p>
        </div>
        <div class="stat-card p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Collection %</p>
          <p class="text-xl font-extrabold mt-2 {collPct >= 75 ? 'text-emerald-600' : 'text-rose-600'}">{collPct}%</p>
          <p class="text-xs text-slate-500">{collPct >= 75 ? 'On track' : 'Needs attention'}</p>
        </div>
        <div class="stat-card p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Overdue</p>
          <p class="text-xl font-extrabold mt-2 text-rose-600">{fee?.overdueCount ?? 0}</p>
          <p class="text-xs text-slate-500">students</p>
        </div>
        <div class="stat-card p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Daily Rate</p>
          <p class="text-xl font-extrabold mt-2 text-violet-600">{fmtShort((fee?.collectedAmount ?? 0) / Math.max(1, Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000)))}</p>
          <p class="text-xs text-slate-500">avg per day</p>
        </div>
      {/if}
    </div>

    <!-- Collection progress -->
    {#if !overviewLoading && fee}
      <div class="stat-card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Collection Progress</p>
          <span class="text-2xl font-extrabold {collPct >= 75 ? 'text-emerald-600' : collPct >= 40 ? 'text-amber-600' : 'text-rose-600'}">{collPct}%</span>
        </div>
        <div class="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div class="h-full rounded-full transition-all duration-700 {collPct >= 75 ? 'bg-emerald-400' : collPct >= 40 ? 'bg-amber-400' : 'bg-rose-400'}" style="width: {collPct}%"></div>
        </div>
        <div class="flex justify-between text-xs text-slate-500">
          <span>Collected <strong class="text-slate-800">{fmtShort(fee.collectedAmount)}</strong></span>
          <span>Target <strong class="text-slate-800">{fmtShort(fee.totalFeeAmount)}</strong></span>
        </div>
        <div class="grid grid-cols-4 gap-2 pt-1">
          <div class="rounded-[18px] border py-3 text-center bg-emerald-50 text-emerald-700 border-emerald-100">
            <p class="text-xl font-extrabold">{fee.paidCount}</p>
            <p class="text-xs font-semibold uppercase tracking-wide opacity-80">Paid</p>
          </div>
          <div class="rounded-[18px] border py-3 text-center bg-amber-50 text-amber-700 border-amber-100">
            <p class="text-xl font-extrabold">{fee.partialCount}</p>
            <p class="text-xs font-semibold uppercase tracking-wide opacity-80">Partial</p>
          </div>
          <div class="rounded-[18px] border py-3 text-center bg-slate-50 text-slate-600 border-slate-100">
            <p class="text-xl font-extrabold">{fee.unpaidCount}</p>
            <p class="text-xs font-semibold uppercase tracking-wide opacity-80">Unpaid</p>
          </div>
          <div class="rounded-[18px] border py-3 text-center bg-rose-50 text-rose-700 border-rose-100">
            <p class="text-xl font-extrabold">{fee.overdueCount}</p>
            <p class="text-xs font-semibold uppercase tracking-wide opacity-80">Overdue</p>
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- ── FEE STRUCTURES TAB ──────────────────────────────────────────────── -->
  {#if activeTab === 'fee-structures'}
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <!-- Form panel -->
      <div class="lg:col-span-2">
        <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div class="mb-5 flex items-start justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-900">{editingId ? 'Edit Fee Structure' : 'New Fee Structure'}</h3>
              <p class="mt-0.5 text-xs text-slate-400">{editingId ? 'Update fees or due date — assignments sync automatically' : 'Define fees for a class then auto-assign to all active students'}</p>
            </div>
            {#if editingId}
              <button onclick={cancelEdit} class="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">✕</button>
            {/if}
          </div>

          <form onsubmit={saveStructure} class="space-y-4">
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-600">Class <span class="text-rose-500">*</span></label>
              <select class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" bind:value={feeForm.classId} disabled={!!editingId} required>
                <option value="">Select class…</option>
                {#each uniqueClasses as c (c._id)}<option value={c._id}>{c.name}</option>{/each}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-600">Academic Year <span class="text-rose-500">*</span></label>
              <input type="text" placeholder="e.g. 2025-26" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400" bind:value={feeForm.academicYear} disabled={!!editingId} required />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-600">Academic Fee <span class="text-rose-500">*</span></label>
                <input type="number" min="0" step="1" placeholder="0" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" bind:value={feeForm.academicFee} />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-600">Transport Fee</label>
                <input type="number" min="0" step="1" placeholder="0" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" bind:value={feeForm.transportFee} />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-600">Other Fee</label>
                <input type="number" min="0" step="1" placeholder="0" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" bind:value={feeForm.otherFee} />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-600">Due Date <span class="text-rose-500">*</span></label>
              <input type="date" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" bind:value={feeForm.dueDate} required />
            </div>

            <!-- Late fee accordion -->
            <div class="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              <button type="button" onclick={() => (showLateFee = !showLateFee)}
                class="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                <span>Late Fee Config (optional)</span>
                <span>{showLateFee ? '▲' : '▼'}</span>
              </button>
              {#if showLateFee}
                <div class="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-slate-600">Type</label>
                    <select class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" bind:value={feeForm.lateFeeType}>
                      <option value="none">None</option>
                      <option value="fixed">Fixed (one-time)</option>
                      <option value="daily">Daily (per day overdue)</option>
                      <option value="percentage">Percentage of due amount</option>
                    </select>
                  </div>
                  {#if feeForm.lateFeeType !== 'none'}
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="mb-1 block text-xs font-semibold text-slate-600">{feeForm.lateFeeType === 'percentage' ? 'Rate (%)' : 'Amount (₹)'}</label>
                        <input type="number" min="0" step="0.01" placeholder="0" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" bind:value={feeForm.lateFeeAmount} />
                      </div>
                      <div>
                        <label class="mb-1 block text-xs font-semibold text-slate-600">Grace Days</label>
                        <input type="number" min="0" step="1" placeholder="0" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" bind:value={feeForm.lateFeeGraceDays} />
                      </div>
                    </div>
                  {/if}
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-slate-600">Description</label>
                    <input type="text" placeholder="e.g. ₹50/day after 7-day grace period" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" bind:value={feeForm.lateFeeDescription} />
                  </div>
                </div>
              {/if}
            </div>

            {#if structureSaveError}<div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{structureSaveError}</div>{/if}
            {#if structureSaveSuccess}<div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ {structureSaveSuccess}</div>{/if}

            <div class="flex gap-2">
              <button type="submit" disabled={savingStructure}
                class="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                {savingStructure ? 'Saving…' : editingId ? 'Update & Sync' : 'Create & Auto-Assign'}
              </button>
              {#if editingId}
                <button type="button" onclick={cancelEdit} class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              {/if}
            </div>
          </form>
        </div>
      </div>

      <!-- Table panel -->
      <div class="lg:col-span-3">
        <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div class="mb-4">
            <h3 class="text-sm font-bold text-slate-900">Existing Fee Structures</h3>
            <p class="mt-0.5 text-xs text-slate-400">{structures.length} structure{structures.length !== 1 ? 's' : ''} configured</p>
          </div>

          {#if structuresLoading}
            <div class="space-y-2">{#each Array(5) as _, i (i)}<div class="h-12 animate-pulse rounded-lg bg-slate-100"></div>{/each}</div>
          {:else if structuresError}
            <p class="py-8 text-center text-sm text-rose-600">{structuresError}</p>
          {:else if structures.length === 0}
            <div class="flex flex-col items-center justify-center py-12 text-center">
              <div class="mb-3 rounded-full bg-slate-100 p-4 text-2xl">+</div>
              <p class="text-sm font-semibold text-slate-700">No fee structures yet</p>
              <p class="mt-1 text-xs text-slate-400">Use the form to create one</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th class="py-2 text-left">Class / Year</th>
                    <th class="py-2 text-right">Acad.</th>
                    <th class="py-2 text-right">Trans.</th>
                    <th class="py-2 text-right">Other</th>
                    <th class="py-2 text-right">Due</th>
                    <th class="py-2 text-center">Paid/Total</th>
                    <th class="py-2 text-right">%</th>
                    <th class="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {#each structures as s (s._id)}
                    {@const cp = pct(s.paidCount, s.assignedCount)}
                    {@const className = schoolClasses.find(c => c._id === s.class_id)?.name || s.class_id}
                    <tr class="border-b transition-colors {editingId === s._id ? 'bg-indigo-50' : 'hover:bg-slate-50'}">
                      <td class="py-2.5">
                        <p class="font-medium text-slate-800">{className}</p>
                        <p class="text-xs text-slate-400">{s.academic_year}</p>
                      </td>
                      <td class="py-2.5 text-right text-slate-700">₹{s.academic_fee}</td>
                      <td class="py-2.5 text-right text-slate-500">₹{s.default_transport_fee}</td>
                      <td class="py-2.5 text-right text-slate-500">₹{s.other_fee}</td>
                      <td class="py-2.5 text-right text-xs text-slate-500">{s.due_date}</td>
                      <td class="py-2.5 text-center text-xs">
                        <span class="font-semibold text-emerald-600">{s.paidCount}</span>
                        <span class="mx-1 text-slate-300">/</span>
                        <span class="text-slate-500">{s.assignedCount}</span>
                        {#if s.pendingCount > 0}<span class="ml-1 text-amber-500">({s.pendingCount} pending)</span>{/if}
                      </td>
                      <td class="py-2.5 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <div class="h-1.5 w-10 overflow-hidden rounded-full bg-slate-100">
                            <div class="h-full rounded-full bg-emerald-400 transition-all" style="width: {cp}%"></div>
                          </div>
                          <span class="text-xs font-bold {cp >= 75 ? 'text-emerald-600' : cp >= 40 ? 'text-amber-600' : 'text-rose-600'}">{cp}%</span>
                        </div>
                      </td>
                      <td class="py-2.5 pl-2">
                        <button onclick={() => startEdit(s)}
                          class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors {editingId === s._id ? 'border-indigo-300 bg-indigo-100 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}">
                          ✏ {editingId === s._id ? 'Editing' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- ── STUDENT FEES TAB ────────────────────────────────────────────────── -->
  {#if activeTab === 'student-fees'}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-slate-900">Student Fees</h2>
          <p class="text-sm text-slate-500">View fee status and record payments for individual students</p>
        </div>
        <button onclick={() => loadStudentFees()} disabled={sfLoading}
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          ↻ Refresh
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2">
        <select class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm" bind:value={sfYear} onchange={() => sfPage = 1}>
          {#each years as y (y)}<option value={y}>{y}</option>{/each}
          {#if years.length === 0}<option value="">All Years</option>{/if}
        </select>
        <select class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm" bind:value={sfClass} onchange={() => sfPage = 1}>
          <option value="">All Classes</option>
          {#each uniqueClasses as c (c._id)}<option value={c.name}>{c.name}</option>{/each}
        </select>
        <select class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm" bind:value={sfStatus}>
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        <div class="relative min-w-[200px] flex-1">
          <input type="text" placeholder="Search name, roll no…" class="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" bind:value={sfSearch} oninput={() => sfPage = 1} />
          {#if sfSearch}
            <button onclick={() => { sfSearch = ''; sfPage = 1; }} class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>
          {/if}
        </div>
      </div>

      <!-- Metrics bar -->
      {#if sfMetrics}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Students</p>
            <p class="mt-1.5 text-lg font-bold">{sfMetrics.totalStudents}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Fee</p>
            <p class="mt-1.5 text-lg font-bold">{fmt(sfMetrics.currentTotalFee)}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Collected</p>
            <p class="mt-1.5 text-lg font-bold text-green-700">{fmt(sfMetrics.currentPaidAmount)}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
            <p class="mt-1.5 text-lg font-bold text-amber-600">{fmt(sfMetrics.currentPendingAmount)}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Overdue</p>
            <p class="mt-1.5 text-lg font-bold text-red-600">{sfMetrics.overdueCount}</p>
            <p class="text-xs text-slate-400">students</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding</p>
            <p class="mt-1.5 text-lg font-bold">{fmt(sfMetrics.outstandingBalance)}</p>
            <p class="text-xs text-slate-400">incl. older years</p>
          </div>
        </div>
      {/if}

      <!-- Table -->
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Student</th>
              <th class="px-4 py-3 text-right">Total Fee</th>
              <th class="px-4 py-3 text-right">Paid</th>
              <th class="px-4 py-3 text-right">Remaining</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Due Date</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#if sfLoading}
              {#each Array(8) as _, i (i)}
                <tr>{#each Array(7) as __, j (j)}<td class="px-4 py-3"><div class="h-3 animate-pulse rounded bg-slate-100"></div></td>{/each}</tr>
              {/each}
            {:else if sfError}
              <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-red-600">{sfError}</td></tr>
            {:else if filteredSfItems.length === 0}
              <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-slate-400">No students found</td></tr>
            {:else}
              {#each filteredSfItems as item (item.studentId)}
                {@const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.pending}
                <tr class="transition-colors hover:bg-slate-50">
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900">{item.student.name}</div>
                    <div class="mt-0.5 text-xs text-slate-400">{item.student.class}{item.student.rollNumber ? ` · Roll ${item.student.rollNumber}` : ''}</div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-slate-700">{fmt(item.totalFee)}</td>
                  <td class="px-4 py-3 text-right font-medium text-green-700">{fmt(item.paidAmount)}</td>
                  <td class="px-4 py-3 text-right font-medium text-amber-700">{fmt(item.remainingAmount)}</td>
                  <td class="px-4 py-3"><span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {cfg.bg} {cfg.text}">{cfg.label}</span></td>
                  <td class="px-4 py-3 text-xs text-slate-500">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td class="px-4 py-3">
                    <button disabled={!item.financeId || item.status === 'paid'} onclick={() => openPayModal(item)}
                      class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40">
                      {item.status === 'paid' ? 'Paid' : 'Record Payment'}
                    </button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if sfPagination && sfPagination.totalPages > 1}
        <div class="flex items-center justify-between text-sm text-slate-500">
          <span>{(sfPage - 1) * 20 + 1}–{Math.min(sfPage * 20, sfPagination.totalItems)} of {sfPagination.totalItems} students</span>
          <div class="flex gap-1">
            <button onclick={() => sfPage--} disabled={sfPage <= 1} class="px-3 py-1 border rounded disabled:opacity-40">‹</button>
            {#each Array.from({ length: Math.min(5, sfPagination.totalPages) }, (_, i) => i + Math.max(1, sfPage - 2)) as p (p)}
              {#if p <= sfPagination.totalPages}
                <button onclick={() => (sfPage = p)} class="px-3 py-1 border rounded {p === sfPage ? 'bg-blue-600 text-white border-blue-600' : ''}">{p}</button>
              {/if}
            {/each}
            <button onclick={() => sfPage++} disabled={sfPage >= sfPagination.totalPages} class="px-3 py-1 border rounded disabled:opacity-40">›</button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- ── Payment Modal ──────────────────────────────────────────────────────── -->
{#if modalItem}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 class="font-semibold text-slate-900">Record Payment</h3>
          <p class="text-xs text-slate-500 mt-0.5">{modalItem.student.name} · {modalItem.student.class}</p>
        </div>
        <button onclick={() => { modalItem = null; }} class="rounded-lg p-1 hover:bg-slate-100">✕</button>
      </div>

      <div class="border-b bg-slate-50 px-5 py-3">
        <div class="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Fee Breakdown</span>
          <span>Remaining: <span class="font-semibold text-red-600">{fmt(modalItem.remainingAmount)}</span></span>
        </div>
        <div class="space-y-1">
          {#each modalItem.feeComponents as fc (fc.label)}
            <div class="flex justify-between text-xs text-slate-600">
              <span>{fc.label}</span><span>{fmt(fc.amount)}</span>
            </div>
          {/each}
          {#if (modalItem.olderPendingAmount ?? 0) > 0}
            <div class="flex justify-between text-xs font-medium text-amber-700">
              <span>Older year dues</span><span>{fmt(modalItem.olderPendingAmount ?? 0)}</span>
            </div>
          {/if}
        </div>
      </div>

      <form onsubmit={recordPayment} class="space-y-3 px-5 py-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Amount (₹) *</label>
            <input type="number" min="1" step="0.01" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" bind:value={payForm.amount} />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Payment Date *</label>
            <input type="date" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" bind:value={payForm.date} />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Payment Mode *</label>
          <select class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" bind:value={payForm.mode}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Reference No.</label>
          <input type="text" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Transaction ID / Cheque No." bind:value={payForm.refNo} />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Remarks</label>
          <input type="text" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Optional notes" bind:value={payForm.remarks} />
        </div>
        {#if payError}<p class="text-xs text-red-600">{payError}</p>{/if}
        <div class="flex gap-2 pt-1">
          <button type="button" onclick={() => { modalItem = null; }} class="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={payLoading} class="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {payLoading ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

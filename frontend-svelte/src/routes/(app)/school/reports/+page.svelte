<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { FileText, Users, IndianRupee, CalendarCheck, BriefcaseBusiness, AlertCircle, RefreshCw } from 'lucide-svelte';

  const clayOuter = 'rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(18,165,136,0.08),transparent_40%),linear-gradient(180deg,#f0faf8_0%,#f1f8f6_50%,#f8fbff_100%)] p-3 space-y-5';
  const clayShell = 'rounded-[28px] border border-[#12A588]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2faf8_100%)] p-5 shadow-[0_18px_45px_rgba(18,165,136,0.08)]';
  const clayCard  = 'rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]';
  const clayInset = 'rounded-[22px] border border-slate-200/75 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_20px_rgba(148,163,184,0.10)]';

  type StrengthRow = { _id: string; count: number };
  type AttendanceRow = { _id: string; count: number };
  type StaffRow = { _id: string; count: number };
  type FeeCollection = { totalFee: number; paidAmount: number; dueAmount: number };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let strengthData = $state<StrengthRow[]>([]);
  let feeData = $state<FeeCollection | null>(null);
  let attendanceData = $state<AttendanceRow[]>([]);
  let staffData = $state<StaffRow[]>([]);
  let loading = $state(true);
  let error = $state('');

  async function fetchAll() {
    if (!schoolId) return;
    try {
      loading = true;
      error = '';
      const [strRes, feeRes, attRes, staffRes] = await Promise.all([
        fetch(`/api/reports/students/strength?schoolId=${schoolId}`),
        fetch(`/api/reports/finance/collection?schoolId=${schoolId}`),
        fetch(`/api/reports/attendance/summary?schoolId=${schoolId}`),
        fetch(`/api/reports/staff?schoolId=${schoolId}`),
      ]);

      const extract = async (r: Response) => {
        const d = await r.json();
        return d.data ?? d;
      };

      [strengthData, feeData, attendanceData, staffData] = await Promise.all([
        extract(strRes),
        extract(feeRes),
        extract(attRes),
        extract(staffRes),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load reports';
    } finally {
      loading = false;
    }
  }

  const totalStudents = $derived(strengthData.reduce((s, r) => s + r.count, 0));
  const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  function attendancePercent(status: string) {
    const total = attendanceData.reduce((s, r) => s + r.count, 0);
    if (total === 0) return 0;
    const row = attendanceData.find(r => r._id === status);
    return total > 0 ? Math.round(((row?.count ?? 0) / total) * 100) : 0;
  }

  onMount(() => { fetchAll(); });
</script>

<div class={clayOuter}>
  <div class={clayShell}>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-violet-50">
          <FileText class="w-5 h-5 text-violet-500" />
        </div>
        <h1 class="text-xl font-semibold text-slate-800">Reports</h1>
      </div>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        onclick={fetchAll}>
        <RefreshCw class="w-4 h-4" />
        Refresh
      </button>
    </div>

    {#if loading}
      <div class="flex justify-center py-16">
        <div class="w-8 h-8 rounded-full border-2 border-[#12A588] border-t-transparent animate-spin"></div>
      </div>
    {:else if error}
      <div class="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 text-sm">
        <AlertCircle class="w-4 h-4 flex-shrink-0" />{error}
      </div>
    {:else}
      <div class="space-y-4">

        <!-- Student Strength -->
        <div class={clayCard}>
          <div class="flex items-center gap-2 mb-4">
            <Users class="w-4 h-4 text-indigo-500" />
            <h2 class="text-sm font-semibold text-slate-700">Student Strength by Class</h2>
            <span class="ml-auto text-xs text-slate-500">Total: <span class="font-bold text-slate-700">{totalStudents}</span></span>
          </div>
          {#if strengthData.length === 0}
            <p class="text-sm text-slate-400 text-center py-4">No data</p>
          {:else}
            <div class="space-y-2">
              {#each strengthData as row}
                <div class="flex items-center gap-3">
                  <span class="w-20 text-xs text-slate-600 truncate">{row._id || 'Unclassified'}</span>
                  <div class="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-indigo-400"
                      style="width: {totalStudents > 0 ? Math.round((row.count / totalStudents) * 100) : 0}%">
                    </div>
                  </div>
                  <span class="text-xs font-medium text-slate-700 w-8 text-right">{row.count}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Fee Collection -->
        <div class={clayCard}>
          <div class="flex items-center gap-2 mb-4">
            <IndianRupee class="w-4 h-4 text-emerald-500" />
            <h2 class="text-sm font-semibold text-slate-700">Fee Collection</h2>
          </div>
          {#if !feeData}
            <p class="text-sm text-slate-400 text-center py-4">No data</p>
          {:else}
            <div class="grid grid-cols-3 gap-3">
              <div class={clayInset}>
                <p class="text-xs text-slate-500">Total Fee</p>
                <p class="text-base font-bold text-slate-800 mt-1">{fmt(feeData.totalFee)}</p>
              </div>
              <div class={clayInset}>
                <p class="text-xs text-slate-500">Collected</p>
                <p class="text-base font-bold text-emerald-600 mt-1">{fmt(feeData.paidAmount)}</p>
              </div>
              <div class={clayInset}>
                <p class="text-xs text-slate-500">Pending</p>
                <p class="text-base font-bold text-amber-600 mt-1">{fmt(feeData.dueAmount)}</p>
              </div>
            </div>
            {#if feeData.totalFee > 0}
              <div class="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  class="h-full rounded-full bg-emerald-400"
                  style="width: {Math.round((feeData.paidAmount / feeData.totalFee) * 100)}%">
                </div>
              </div>
              <p class="text-xs text-slate-400 mt-1 text-right">
                {Math.round((feeData.paidAmount / feeData.totalFee) * 100)}% collected
              </p>
            {/if}
          {/if}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Attendance -->
          <div class={clayCard}>
            <div class="flex items-center gap-2 mb-4">
              <CalendarCheck class="w-4 h-4 text-sky-500" />
              <h2 class="text-sm font-semibold text-slate-700">Attendance</h2>
            </div>
            {#if attendanceData.length === 0}
              <p class="text-sm text-slate-400 text-center py-4">No data</p>
            {:else}
              <div class="space-y-3">
                {#each ['present', 'absent', 'late'] as status}
                  {@const row = attendanceData.find(r => r._id === status)}
                  <div>
                    <div class="flex justify-between text-xs mb-1">
                      <span class="capitalize text-slate-600">{status}</span>
                      <span class="font-medium text-slate-700">{row?.count ?? 0} ({attendancePercent(status)}%)</span>
                    </div>
                    <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        class="h-full rounded-full {status === 'present' ? 'bg-emerald-400' : status === 'absent' ? 'bg-red-400' : 'bg-amber-400'}"
                        style="width: {attendancePercent(status)}%">
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Staff -->
          <div class={clayCard}>
            <div class="flex items-center gap-2 mb-4">
              <BriefcaseBusiness class="w-4 h-4 text-rose-500" />
              <h2 class="text-sm font-semibold text-slate-700">Staff by Department</h2>
            </div>
            {#if staffData.length === 0}
              <p class="text-sm text-slate-400 text-center py-4">No data</p>
            {:else}
              <div class="space-y-2">
                {#each staffData as row}
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-600 text-xs truncate">{row._id || 'General'}</span>
                    <span class="font-medium text-slate-800 text-xs">{row.count}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

      </div>
    {/if}
  </div>
</div>

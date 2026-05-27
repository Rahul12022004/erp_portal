<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    BarChart3 as BarIcon,
    TrendingUp as TrendIcon,
    Users as UserIcon,
    IndianRupee as RupeeIcon,
    AlertCircle as AlertIcon,
    RefreshCw as RefreshIcon,
  } from 'lucide-svelte';
  import {
    Chart,
    BarElement, BarController,
    LineElement, LineController,
    PointElement,
    CategoryScale, LinearScale,
    Tooltip, Legend,
  } from 'chart.js';
  Chart.register(BarElement, BarController, LineElement, LineController, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

  const clayOuter = 'rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(18,165,136,0.08),transparent_40%),linear-gradient(180deg,#f0faf8_0%,#f1f8f6_50%,#f8fbff_100%)] p-3 space-y-5';
  const clayShell = 'rounded-[28px] border border-[#12A588]/20 bg-[linear-gradient(180deg,#ffffff_0%,#f2faf8_100%)] p-5 shadow-[0_18px_45px_rgba(18,165,136,0.08)]';
  const clayCard  = 'rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_10px_28px_rgba(148,163,184,0.14)]';
  const clayInset = 'rounded-[22px] border border-slate-200/75 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_20px_rgba(148,163,184,0.10)]';

  type Dashboard = { students: number; staff: number; feeCollection: { totalFee: number; paidAmount: number; dueAmount: number } };
  type TrendRow = { _id: string; count?: number; collected?: number; pending?: number };
  type AttendanceRow = { _id: string; present: number; absent: number };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let dashboard = $state<Dashboard | null>(null);
  let enrollmentTrend = $state<TrendRow[]>([]);
  let feeTrend = $state<TrendRow[]>([]);
  let attendanceRate = $state<AttendanceRow[]>([]);
  let loading = $state(true);
  let error = $state('');

  let enrollCanvas = $state<HTMLCanvasElement | null>(null);
  let feeCanvas = $state<HTMLCanvasElement | null>(null);
  let attCanvas = $state<HTMLCanvasElement | null>(null);
  let enrollChart: Chart | null = null;
  let feeChart: Chart | null = null;
  let attChart: Chart | null = null;

  async function fetchAll() {
    if (!schoolId) return;
    try {
      loading = true;
      error = '';
      const [dashRes, enrollRes, feeRes, attRes] = await Promise.all([
        fetch(`/api/analytics/dashboard?schoolId=${schoolId}`),
        fetch(`/api/analytics/enrollment/trend?schoolId=${schoolId}`),
        fetch(`/api/analytics/fee/trend?schoolId=${schoolId}`),
        fetch(`/api/analytics/attendance/rate?schoolId=${schoolId}`),
      ]);
      const extract = async (r: Response) => { const d = await r.json(); return d.data ?? d; };
      [dashboard, enrollmentTrend, feeTrend, attendanceRate] = await Promise.all([
        extract(dashRes), extract(enrollRes), extract(feeRes), extract(attRes),
      ]);
      setTimeout(renderCharts, 50);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load analytics';
    } finally {
      loading = false;
    }
  }

  function renderCharts() {
    if (enrollCanvas && enrollmentTrend.length > 0) {
      enrollChart?.destroy();
      enrollChart = new Chart(enrollCanvas, {
        type: 'bar',
        data: {
          labels: enrollmentTrend.map(r => r._id),
          datasets: [{ label: 'New Students', data: enrollmentTrend.map(r => r.count ?? 0), backgroundColor: '#6366f1', borderRadius: 6 }],
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
      });
    }

    if (feeCanvas && feeTrend.length > 0) {
      feeChart?.destroy();
      feeChart = new Chart(feeCanvas, {
        type: 'bar',
        data: {
          labels: feeTrend.map(r => r._id),
          datasets: [
            { label: 'Collected', data: feeTrend.map(r => r.collected ?? 0), backgroundColor: '#10b981', borderRadius: 4 },
            { label: 'Pending', data: feeTrend.map(r => r.pending ?? 0), backgroundColor: '#f59e0b', borderRadius: 4 },
          ],
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } },
      });
    }

    if (attCanvas && attendanceRate.length > 0) {
      attChart?.destroy();
      attChart = new Chart(attCanvas, {
        type: 'line',
        data: {
          labels: attendanceRate.map(r => r._id),
          datasets: [
            { label: 'Present', data: attendanceRate.map(r => r.present), borderColor: '#10b981', tension: 0.3, fill: false },
            { label: 'Absent', data: attendanceRate.map(r => r.absent), borderColor: '#ef4444', tension: 0.3, fill: false },
          ],
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } },
      });
    }
  }

  const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  onMount(() => { fetchAll(); });
</script>

<div class={clayOuter}>
  <div class={clayShell}>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-indigo-50">
          <BarIcon class="w-5 h-5 text-indigo-500" />
        </div>
        <h1 class="text-xl font-semibold text-slate-800">Analytics</h1>
      </div>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        onclick={fetchAll}>
        <RefreshIcon class="w-4 h-4" />
        Refresh
      </button>
    </div>

    {#if loading}
      <div class="flex justify-center py-16">
        <div class="w-8 h-8 rounded-full border-2 border-[#12A588] border-t-transparent animate-spin"></div>
      </div>
    {:else if error}
      <div class="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 text-sm">
        <AlertIcon class="w-4 h-4 flex-shrink-0" />{error}
      </div>
    {:else}
      <!-- KPI cards -->
      {#if dashboard}
        <div class="grid grid-cols-4 gap-3 mb-5">
          <div class="{clayInset} flex items-center gap-3">
            <UserIcon class="w-8 h-8 text-indigo-400 flex-shrink-0" />
            <div>
              <p class="text-xs text-slate-500">Students</p>
              <p class="text-xl font-bold text-slate-800">{dashboard.students}</p>
            </div>
          </div>
          <div class="{clayInset} flex items-center gap-3">
            <RupeeIcon class="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <p class="text-xs text-slate-500">Staff</p>
              <p class="text-xl font-bold text-slate-800">{dashboard.staff}</p>
            </div>
          </div>
          <div class="{clayInset} flex items-center gap-3">
            <TrendIcon class="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <p class="text-xs text-slate-500">Fee Collected</p>
              <p class="text-lg font-bold text-emerald-600">{fmt(dashboard.feeCollection.paidAmount)}</p>
            </div>
          </div>
          <div class="{clayInset} flex items-center gap-3">
            <BarIcon class="w-8 h-8 text-rose-400 flex-shrink-0" />
            <div>
              <p class="text-xs text-slate-500">Fee Pending</p>
              <p class="text-lg font-bold text-amber-600">{fmt(dashboard.feeCollection.dueAmount)}</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Charts -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class={clayCard}>
          <h3 class="text-sm font-semibold text-slate-700 mb-3">Enrollment Trend (12 months)</h3>
          {#if enrollmentTrend.length === 0}
            <p class="text-sm text-slate-400 text-center py-8">No enrollment data</p>
          {:else}
            <canvas bind:this={enrollCanvas}></canvas>
          {/if}
        </div>
        <div class={clayCard}>
          <h3 class="text-sm font-semibold text-slate-700 mb-3">Fee Collection Trend (12 months)</h3>
          {#if feeTrend.length === 0}
            <p class="text-sm text-slate-400 text-center py-8">No fee trend data</p>
          {:else}
            <canvas bind:this={feeCanvas}></canvas>
          {/if}
        </div>
      </div>

      <div class={clayCard}>
        <h3 class="text-sm font-semibold text-slate-700 mb-3">Daily Attendance (Last 30 Days)</h3>
        {#if attendanceRate.length === 0}
          <p class="text-sm text-slate-400 text-center py-8">No attendance data</p>
        {:else}
          <canvas bind:this={attCanvas} style="max-height: 220px;"></canvas>
        {/if}
      </div>
    {/if}
  </div>
</div>

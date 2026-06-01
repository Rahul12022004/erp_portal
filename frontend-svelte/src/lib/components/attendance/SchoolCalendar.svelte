<script lang="ts">
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  type AttendanceRecord = {
    _id: string;
    date: string;
    status: string;
    staffId: string | { _id?: string };
  };

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  let {
    teacherAttendanceMap,
    year,
    month,
    onMonthChange,
    onSelectDay,
  }: {
    teacherAttendanceMap: Record<string, AttendanceRecord[]>;
    year: number;
    month: number;
    onMonthChange: (y: number, m: number) => void;
    onSelectDay: (iso: string) => void;
  } = $props();

  let selectedDayIso = $state<string | null>(null);

  const yearOptions = $derived(
    Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i)
  );

  const selectedMonthLabel = $derived(`${MONTH_NAMES[month - 1]} ${year}`);

  type DayCell = {
    iso: string | null;
    day: number | null;
    percent: number | null;
    present: number;
    total: number;
  };

  const calendarCells = $derived.by<DayCell[]>(() => {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const teacherIds = Object.keys(teacherAttendanceMap);
    const totalTeachers = teacherIds.length;

    const cells: DayCell[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ iso: null, day: null, percent: null, present: 0, total: 0 });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${monthStr}-${String(d).padStart(2, '0')}`;
      let present = 0;
      let marked = 0;
      for (const records of Object.values(teacherAttendanceMap)) {
        const rec = records.find((r) => r.date === iso);
        if (rec) {
          marked++;
          if (rec.status === 'Present') present++;
        }
      }
      cells.push({
        iso,
        day: d,
        percent: marked > 0 ? Math.round((present / marked) * 100) : null,
        present,
        total: totalTeachers,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ iso: null, day: null, percent: null, present: 0, total: 0 });
    }

    return cells;
  });

  function cellTone(percent: number | null): string {
    if (percent === null) return 'bg-muted/30 border-border text-muted-foreground';
    if (percent >= 80) return 'bg-green-50 border-green-200 text-green-800';
    if (percent >= 60) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-red-50 border-red-200 text-red-800';
  }

  function percentBadge(percent: number | null): string {
    if (percent === null) return '';
    if (percent >= 80) return 'bg-green-100 text-green-700';
    if (percent >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }

  function changeMonth(dir: -1 | 1) {
    const d = new Date(year, month - 1 + dir, 1);
    selectedDayIso = null;
    onMonthChange(d.getFullYear(), d.getMonth() + 1);
  }

  type DayDetailItem = { staffId: string; status: string | null };

  // Day detail: teachers for selectedDayIso
  const dayDetail = $derived.by<DayDetailItem[]>(() => {
    if (!selectedDayIso) return [];
    return Object.entries(teacherAttendanceMap).map(([staffId, records]) => {
      const rec = records.find((r) => r.date === selectedDayIso);
      return { staffId, status: rec?.status ?? null };
    });
  });
</script>

<div class="rounded-xl border border-border bg-card shadow-sm">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
    <h3 class="font-display text-base font-semibold text-foreground">{selectedMonthLabel}</h3>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => changeMonth(-1)}
        class="rounded-lg border border-border p-1.5 hover:bg-muted"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <select
        class="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
        value={month}
        onchange={(e) => {
          selectedDayIso = null;
          onMonthChange(year, Number((e.currentTarget as HTMLSelectElement).value));
        }}
      >
        {#each MONTH_NAMES as name, i (name)}
          <option value={i + 1}>{name}</option>
        {/each}
      </select>
      <select
        class="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
        value={year}
        onchange={(e) => {
          selectedDayIso = null;
          onMonthChange(Number((e.currentTarget as HTMLSelectElement).value), month);
        }}
      >
        {#each yearOptions as y (y)}
          <option value={y}>{y}</option>
        {/each}
      </select>
      <button
        type="button"
        onclick={() => changeMonth(1)}
        class="rounded-lg border border-border p-1.5 hover:bg-muted"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>

  <div class="p-4">
    <!-- Legend -->
    <div class="mb-3 flex flex-wrap gap-2 text-xs">
      <span class="rounded border border-green-200 bg-green-100 px-2 py-0.5 text-green-700">≥ 80% Present</span>
      <span class="rounded border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-yellow-700">60–79%</span>
      <span class="rounded border border-red-200 bg-red-100 px-2 py-0.5 text-red-700">&lt; 60%</span>
      <span class="rounded border border-border bg-muted/30 px-2 py-0.5 text-muted-foreground">No data</span>
    </div>

    <!-- Day headers -->
    <div class="mb-1 grid grid-cols-7 gap-1 text-center">
      {#each ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as d (d)}
        <div class="rounded bg-muted py-1.5 text-xs font-semibold text-muted-foreground">{d}</div>
      {/each}
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-1">
      {#each calendarCells as cell, i (cell.iso ?? `blank-${i}`)}
        {#if cell.day}
          <button
            type="button"
            onclick={() => {
              selectedDayIso = selectedDayIso === cell.iso ? null : (cell.iso ?? null);
              if (cell.iso) onSelectDay(cell.iso);
            }}
            class={`min-h-[72px] rounded-lg border p-2 text-left transition-all ${cellTone(cell.percent)} ${
              selectedDayIso === cell.iso ? 'ring-2 ring-primary ring-offset-1' : ''
            }`}
          >
            <p class="text-xs font-semibold">{cell.day}</p>
            {#if cell.percent !== null}
              <span class={`mt-1 inline-block rounded px-1 py-0.5 text-[11px] font-medium ${percentBadge(cell.percent)}`}>
                {cell.percent}%
              </span>
              <p class="mt-0.5 text-[10px] opacity-70">{cell.present}/{cell.total}</p>
            {:else}
              <p class="mt-1 text-[11px] opacity-40">—</p>
            {/if}
          </button>
        {:else}
          <div class="min-h-[72px] rounded-lg"></div>
        {/if}
      {/each}
    </div>

    <!-- Day detail panel -->
    {#if selectedDayIso && dayDetail.length > 0}
      <div class="mt-4 rounded-xl border border-border bg-muted/30 p-4">
        <p class="mb-2 text-sm font-semibold text-foreground">{selectedDayIso}</p>
        <div class="flex flex-wrap gap-2">
          {#each dayDetail as item (item.staffId)}
            <span class={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              item.status === 'Present' ? 'border-green-200 bg-green-100 text-green-700'
              : item.status === 'Absent' ? 'border-red-200 bg-red-100 text-red-700'
              : 'border-border bg-muted text-muted-foreground'
            }`}>
              {item.staffId.slice(-4)} · {item.status ?? 'Not Marked'}
            </span>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

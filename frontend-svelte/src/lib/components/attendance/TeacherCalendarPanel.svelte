<script lang="ts">
  import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { api } from '$lib/api/client';

  type AttendanceRecord = {
    _id: string;
    date: string;
    status: string;
    remarks?: string;
    staffId: string | { _id?: string };
  };

  type LeaveRecord = {
    _id: string;
    leaveType: 'Paid' | 'Unpaid' | 'Emergency';
    status: 'Pending' | 'Approved' | 'Rejected';
    teacherId: string | { _id?: string };
    createdAt?: string;
    title?: string;
  };

  type TeacherTarget = { staffId: string; name: string; position: string };
  type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Half Day';

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const LEAVE_LIMITS = { Paid: 12, Unpaid: 4, Emergency: 3 } as const;

  let {
    teacher,
    year: initYear,
    month: initMonth,
    attendanceRecords,
    leaveRecords,
    schoolId,
    onClose,
    onUpdate,
  }: {
    teacher: TeacherTarget;
    year: number;
    month: number;
    attendanceRecords: AttendanceRecord[];
    leaveRecords: LeaveRecord[];
    schoolId: string;
    onClose: () => void;
    onUpdate: () => void;
  } = $props();

  let year = $state(initYear);
  let month = $state(initMonth);
  let editingDate = $state<string | null>(null);
  let editStatus = $state<AttendanceStatus>('Present');
  let editReason = $state('');
  let saving = $state(false);
  let message = $state('');

  const yearOptions = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i);

  const selectedMonth = $derived(`${year}-${String(month).padStart(2, '0')}`);

  const approvedLeaveDates = $derived(
    new Set(
      leaveRecords
        .filter((l) => l.status === 'Approved' && l.createdAt?.startsWith(selectedMonth))
        .map((l) => l.createdAt!.slice(0, 10))
    )
  );

  const attByDate = $derived(
    new Map(
      attendanceRecords
        .filter((r) => r.date.startsWith(selectedMonth))
        .map((r) => [r.date, r])
    )
  );

  type CalendarCell = {
    date: Date | null;
    iso: string | null;
    status: string | null;
    remarks: string;
  };

  const calendarCells = $derived.by<CalendarCell[]>(() => {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: CalendarCell[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, iso: null, status: null, remarks: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const rec = attByDate.get(iso);
      let status: string | null = rec?.status ?? null;
      if (approvedLeaveDates.has(iso)) status = 'Approved Leave';
      cells.push({
        date: new Date(year, month - 1, d),
        iso,
        status,
        remarks: rec?.remarks ?? '',
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, iso: null, status: null, remarks: '' });
    }
    return cells;
  });

  function cellTone(status: string | null): string {
    if (status === 'Present') return 'bg-green-50 border-green-200 text-green-800';
    if (status === 'Approved Leave' || status === 'Leave') return 'bg-orange-50 border-orange-200 text-orange-800';
    if (status === 'Absent') return 'bg-red-50 border-red-200 text-red-800';
    if (status === 'Half Day') return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-muted/30 border-border text-muted-foreground';
  }

  function changeMonth(dir: -1 | 1) {
    const d = new Date(year, month - 1 + dir, 1);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    editingDate = null;
    message = '';
  }

  function startEdit(cell: CalendarCell) {
    if (!cell.iso) return;
    editingDate = cell.iso;
    editStatus = (cell.status as AttendanceStatus) ?? 'Present';
    editReason = cell.remarks;
    message = '';
  }

  async function saveEdit() {
    if (!editingDate || !editReason.trim()) {
      message = 'Reason required.';
      return;
    }
    try {
      saving = true;
      message = '';
      await api.post('/api/attendance', {
        staffId: teacher.staffId,
        schoolId,
        date: editingDate,
        status: editStatus,
        remarks: editReason.trim(),
      });
      message = 'Saved.';
      editingDate = null;
      editReason = '';
      onUpdate();
    } catch (e) {
      message = e instanceof Error ? e.message : 'Error saving';
    } finally {
      saving = false;
    }
  }

  // Leave balance
  const allApproved = $derived(leaveRecords.filter((l) => l.status === 'Approved'));
  const yearStr = $derived(String(year));
  const paidTaken = $derived(allApproved.filter((l) => l.leaveType === 'Paid' && l.createdAt?.startsWith(yearStr)).length);
  const unpaidTaken = $derived(allApproved.filter((l) => l.leaveType === 'Unpaid' && l.createdAt?.startsWith(yearStr)).length);
  const emergencyTaken = $derived(allApproved.filter((l) => l.leaveType === 'Emergency' && l.createdAt?.startsWith(yearStr)).length);

  function leaveChip(remaining: number) {
    if (remaining <= 1) return 'bg-red-100 text-red-700';
    if (remaining <= 3) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }
</script>

<!-- Backdrop — z-[500] keeps it above Leaflet's max pane z-index of 400 -->
<div
  class="fixed inset-0 z-[500] bg-black/30 backdrop-blur-[2px]"
  role="presentation"
  onclick={onClose}
></div>

<!-- Slide-over panel -->
<div class="fixed inset-y-0 right-0 z-[510] flex w-full max-w-2xl flex-col bg-card shadow-2xl">

  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border px-5 py-4">
    <div>
      <p class="font-display text-base font-semibold text-foreground">{teacher.name}</p>
      <p class="text-xs text-muted-foreground">{teacher.position}</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => changeMonth(-1)}
        class="rounded-lg border border-border p-1.5 hover:bg-muted"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <select
        class="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        value={month}
        onchange={(e) => { month = Number((e.currentTarget as HTMLSelectElement).value); editingDate = null; }}
      >
        {#each MONTH_NAMES as name, i (name)}
          <option value={i + 1}>{name}</option>
        {/each}
      </select>
      <select
        class="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        value={year}
        onchange={(e) => { year = Number((e.currentTarget as HTMLSelectElement).value); editingDate = null; }}
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
      <button
        type="button"
        onclick={onClose}
        class="rounded-lg border border-border p-1.5 hover:bg-muted"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>

  <!-- Scrollable body -->
  <div class="flex-1 overflow-y-auto p-5 space-y-4">

    <!-- Month stats -->
    <div class="grid grid-cols-4 gap-2 text-sm">
      {#snippet statPill(label: string, value: number | string, cls = 'bg-muted text-foreground')}
        <div class={`rounded-lg p-2 text-center ${cls}`}>
          <p class="text-[10px] text-muted-foreground">{label}</p>
          <p class="font-semibold">{value}</p>
        </div>
      {/snippet}
      {@render statPill('Present', attendanceRecords.filter(r => r.date.startsWith(selectedMonth) && r.status === 'Present').length, 'bg-green-50 text-green-700')}
      {@render statPill('Absent', attendanceRecords.filter(r => r.date.startsWith(selectedMonth) && r.status === 'Absent').length, 'bg-red-50 text-red-700')}
      {@render statPill('Leave', leaveRecords.filter(l => l.createdAt?.startsWith(selectedMonth) && l.status === 'Approved').length, 'bg-orange-50 text-orange-700')}
      {@render statPill('Half Day', attendanceRecords.filter(r => r.date.startsWith(selectedMonth) && r.status === 'Half Day').length, 'bg-yellow-50 text-yellow-700')}
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-2 text-xs">
      <span class="rounded border border-green-200 bg-green-100 px-2 py-0.5 text-green-700">Present</span>
      <span class="rounded border border-red-200 bg-red-100 px-2 py-0.5 text-red-700">Absent</span>
      <span class="rounded border border-orange-200 bg-orange-100 px-2 py-0.5 text-orange-700">Leave</span>
      <span class="rounded border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-yellow-700">Half Day</span>
    </div>

    <!-- Calendar grid -->
    <div>
      <div class="mb-1 grid grid-cols-7 gap-1 text-center">
        {#each ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as d (d)}
          <div class="rounded bg-muted py-1 text-xs font-semibold text-muted-foreground">{d}</div>
        {/each}
      </div>
      <div class="grid grid-cols-7 gap-1">
        {#each calendarCells as cell, i (cell.iso ?? `blank-${i}`)}
          {#if cell.date}
            <button
              type="button"
              onclick={() => startEdit(cell)}
              class={`min-h-[64px] rounded-lg border p-1.5 text-left transition-all hover:ring-1 hover:ring-primary ${cellTone(cell.status)} ${
                editingDate === cell.iso ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p class="text-xs font-semibold">{cell.date.getDate()}</p>
              <p class="mt-0.5 text-[10px] leading-3">{cell.status ?? '—'}</p>
            </button>
          {:else}
            <div class="min-h-[64px] rounded-lg"></div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Edit panel -->
    {#if editingDate}
      <div class="rounded-xl border border-border bg-muted/30 p-4">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-semibold text-foreground">Edit: {editingDate}</p>
          <button
            type="button"
            onclick={() => { editingDate = null; message = ''; }}
            class="text-xs text-muted-foreground hover:text-foreground"
          >Cancel</button>
        </div>
        <div class="grid gap-2 md:grid-cols-[160px_1fr_auto]">
          <select
            class="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={editStatus}
            onchange={(e) => (editStatus = (e.currentTarget as HTMLSelectElement).value as AttendanceStatus)}
          >
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Leave">Leave</option>
            <option value="Half Day">Half Day</option>
          </select>
          <input
            type="text"
            class="rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            value={editReason}
            oninput={(e) => (editReason = (e.currentTarget as HTMLInputElement).value)}
            placeholder="Reason (required)"
          />
          <button
            type="button"
            onclick={saveEdit}
            disabled={saving}
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {#if message}
          <p class={`mt-2 text-xs ${message === 'Saved.' ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
        {/if}
      </div>
    {/if}

    <!-- Leave balance -->
    <div>
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leave Balance ({year})</p>
      <div class="flex flex-wrap gap-2">
        {#snippet leaveBalancePill(type: string, taken: number, limit: number)}
          {@const rem = Math.max(limit - taken, 0)}
          <div class={`rounded-lg px-3 py-2 text-xs ${leaveChip(rem)}`}>
            <span class="font-medium">{type}</span>
            <span class="ml-1 opacity-70">{rem}/{limit} left</span>
          </div>
        {/snippet}
        {@render leaveBalancePill('Paid', paidTaken, LEAVE_LIMITS.Paid)}
        {@render leaveBalancePill('Unpaid', unpaidTaken, LEAVE_LIMITS.Unpaid)}
        {@render leaveBalancePill('Emergency', emergencyTaken, LEAVE_LIMITS.Emergency)}
      </div>
    </div>

  </div>
</div>

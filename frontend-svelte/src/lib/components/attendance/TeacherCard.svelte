<script lang="ts">
  import { CalendarDays } from 'lucide-svelte';

  type TeacherAttendance = {
    attendanceId: string | null;
    remarks: string;
    staffId: string;
    name: string;
    position: string;
    status: string | null;
  };

  type TeacherMonthlyStat = {
    staffId: string;
    name: string;
    position: string;
    present: number;
    absent: number;
    leaveDays: number;
    halfDay: number;
    totalMarkedDays: number;
    attendancePercent: number;
    monthLeavesTaken: number;
    yearLeavesTaken: number;
    paidRemaining: number;
    unpaidRemaining: number;
    emergencyRemaining: number;
  };

  let {
    teacher,
    onMark,
    onOpenCalendar,
  }: {
    teacher: TeacherAttendance & { monthly: TeacherMonthlyStat | null };
    onMark: (staffId: string, status: 'Present' | 'Absent') => void;
    onOpenCalendar: (t: { staffId: string; name: string; position: string }) => void;
  } = $props();

  const initials = $derived(
    teacher.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  );

  const statusTone = $derived(() => {
    const s = teacher.status?.toLowerCase();
    if (s === 'present') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'absent') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-500 border-gray-200';
  });

  function leaveChipTone(remaining: number) {
    if (remaining <= 1) return 'bg-red-100 text-red-700';
    if (remaining <= 3) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }
</script>

<div class="rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
  <div class="p-4">
    <!-- Header row -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <!-- Avatar -->
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {initials}
        </div>
        <div>
          <p class="font-semibold text-foreground">{teacher.name}</p>
          <p class="text-xs text-muted-foreground">{teacher.position}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Status badge -->
        <span class={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusTone()}`}>
          {teacher.status ?? 'Not Marked'}
        </span>

        <!-- Mark buttons -->
        <button
          type="button"
          onclick={() => onMark(String(teacher.staffId), 'Present')}
          class={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            teacher.status?.toLowerCase() === 'present'
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          ✓ Present
        </button>
        <button
          type="button"
          onclick={() => onMark(String(teacher.staffId), 'Absent')}
          class={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            teacher.status?.toLowerCase() === 'absent'
              ? 'border-red-500 bg-red-500 text-white'
              : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          ✗ Absent
        </button>

        <!-- Calendar button -->
        <button
          type="button"
          onclick={() => onOpenCalendar({ staffId: String(teacher.staffId), name: teacher.name, position: teacher.position })}
          class="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border"
        >
          <CalendarDays class="h-3.5 w-3.5" />
          Calendar
        </button>
      </div>
    </div>

    <!-- Monthly metrics -->
    {#if teacher.monthly}
      <div class="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 md:grid-cols-5 xl:grid-cols-9">
        {#snippet metric(label: string, value: string | number, cls = '')}
          <div class={`rounded-lg border p-2 text-center ${cls || 'border-border bg-muted/50'}`}>
            <p class="text-[10px] text-muted-foreground">{label}</p>
            <p class="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
          </div>
        {/snippet}

        {@render metric('Present', teacher.monthly.present)}
        {@render metric('Absent', teacher.monthly.absent)}
        {@render metric('Leave', teacher.monthly.leaveDays)}
        {@render metric('Half Day', teacher.monthly.halfDay)}
        {@render metric('Attd. %', `${teacher.monthly.attendancePercent}%`)}
        {@render metric('Mo. Leaves', teacher.monthly.monthLeavesTaken)}
        {@render metric('Yr. Leaves', teacher.monthly.yearLeavesTaken)}
        {@render metric('Paid Rem.', teacher.monthly.paidRemaining, leaveChipTone(teacher.monthly.paidRemaining))}
        {@render metric('Un/Em.', `${teacher.monthly.unpaidRemaining}/${teacher.monthly.emergencyRemaining}`, leaveChipTone(Math.min(teacher.monthly.unpaidRemaining, teacher.monthly.emergencyRemaining)))}
      </div>
    {:else}
      <p class="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Monthly analytics loading…
      </p>
    {/if}
  </div>
</div>

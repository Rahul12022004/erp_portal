<script lang="ts">
  let { total, present, absent, percent }: {
    total: number;
    present: number;
    absent: number;
    percent: number;
  } = $props();
</script>

<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
  {#snippet card(label: string, value: string | number, tone: string)}
    <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p class={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  {/snippet}

  {@render card('Total Teachers', total, 'text-foreground')}
  {@render card('Present', present, 'text-green-600')}
  {@render card('Absent', absent, 'text-red-600')}
  {@render card('Attendance %', `${percent}%`, percent >= 80 ? 'text-green-600' : percent >= 60 ? 'text-yellow-600' : 'text-red-600')}
</div>

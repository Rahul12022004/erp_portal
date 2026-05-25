<script lang="ts">
  import { cn } from '$lib/utils';
  let { class: className = '', orientation = 'horizontal' }: { class?: string; orientation?: 'horizontal' | 'vertical' } = $props();
</script>
<div class={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]', className)}></div>

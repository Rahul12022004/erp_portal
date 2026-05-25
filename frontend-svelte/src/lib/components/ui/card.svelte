<script lang="ts">
  import { cn } from '$lib/utils';
  let { class: className = '', children, ...rest }: { class?: string; children?: import('svelte').Snippet; [key: string]: unknown } = $props();
</script>
<div class={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...rest}>
  {#if children}{@render children()}{/if}
</div>

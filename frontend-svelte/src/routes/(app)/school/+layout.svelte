<script lang="ts">
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: { globalModules: Record<string, boolean> }; children: Snippet } = $props();

  // Maps URL path segment → global module key
  const PATH_MODULE: Record<string, string> = {
    students:       'students',
    staff:          'staff',
    attendance:     'attendance',
    exams:          'exams',
    academics:      'academics',
    classes:        'classes',
    timetable:      'timetable',
    communication:  'communication',
    finance:        'finance',
    payroll:        'payroll',
    admissions:     'admissions',
    visitor:        'visitor',
    hr:             'hr',
    transport:      'transport',
    hostel:         'hostel',
    library:        'library',
    inventory:      'inventory',
    'social-media': 'social-media',
    'data-import':  'data-import',
    sports:         'sports',
    discipline:     'discipline',
    house:          'discipline',
    notifications:  'notifications',
    reports:        'reports',
    approvals:      'approvals',
    maintenance:    'maintenance',
    survey:         'survey',
    downloads:      'downloads',
    support:        'support',
  };

  // Extract segment after /school/
  const moduleKey = $derived.by(() => {
    const parts = $page.url.pathname.split('/');
    const segment = parts[2]; // /school/[segment]/...
    return segment ? (PATH_MODULE[segment] ?? null) : null;
  });

  // Disabled = key explicitly set to false in global settings
  const isDisabled = $derived(
    moduleKey !== null && data.globalModules[moduleKey] === false
  );
</script>

{#if isDisabled}
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-6">
    <div class="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    </div>
    <h2 class="text-2xl font-bold text-gray-800">Maintenance in Progress</h2>
    <p class="text-gray-500 max-w-sm">This module is currently undergoing maintenance and will be available soon. Please check back later.</p>
  </div>
{:else}
  {@render children()}
{/if}

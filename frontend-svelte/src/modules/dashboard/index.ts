import type { ModuleRegistration } from '$lib/types';

export const dashboardModule = {
  id: 'dashboard',
  navItem: {
    id: 'dashboard',
    label: 'common.nav.dashboard',
    href: '/school/dashboard',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

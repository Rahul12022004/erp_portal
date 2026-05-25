import type { ModuleRegistration } from '$lib/types';

export const hrModule = {
  id: 'hr',
  navItem: {
    id: 'hr',
    label: 'common.nav.hr',
    href: '/school/hr',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

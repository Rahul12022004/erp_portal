import type { ModuleRegistration } from '$lib/types';

export const staffModule = {
  id: 'staff',
  navItem: {
    id: 'staff',
    label: 'common.nav.staff',
    href: '/school/staff',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

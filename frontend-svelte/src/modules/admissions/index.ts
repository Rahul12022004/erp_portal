import type { ModuleRegistration } from '$lib/types';

export const admissionsModule = {
  id: 'admissions',
  navItem: {
    id: 'admissions',
    label: 'common.nav.admissions',
    href: '/school/admissions',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

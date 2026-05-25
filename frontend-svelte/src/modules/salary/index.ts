import type { ModuleRegistration } from '$lib/types';

export const salaryModule = {
  id: 'salary',
  navItem: {
    id: 'salary',
    label: 'common.nav.salary',
    href: '/school/salary',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

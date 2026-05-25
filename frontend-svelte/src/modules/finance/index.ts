import type { ModuleRegistration } from '$lib/types';

export const financeModule = {
  id: 'finance',
  navItem: {
    id: 'finance',
    label: 'common.nav.finance',
    href: '/school/finance',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

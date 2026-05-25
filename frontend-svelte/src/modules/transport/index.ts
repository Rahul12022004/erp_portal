import type { ModuleRegistration } from '$lib/types';

export const transportModule = {
  id: 'transport',
  navItem: {
    id: 'transport',
    label: 'common.nav.transport',
    href: '/school/transport',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

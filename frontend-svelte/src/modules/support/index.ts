import type { ModuleRegistration } from '$lib/types';

export const supportModule = {
  id: 'support',
  navItem: {
    id: 'support',
    label: 'common.nav.support',
    href: '/school/support',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

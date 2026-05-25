import type { ModuleRegistration } from '$lib/types';

export const sportsModule = {
  id: 'sports',
  navItem: {
    id: 'sports',
    label: 'common.nav.sports',
    href: '/school/sports',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

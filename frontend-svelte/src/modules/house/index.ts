import type { ModuleRegistration } from '$lib/types';

export const houseModule = {
  id: 'house',
  navItem: {
    id: 'house',
    label: 'common.nav.house',
    href: '/school/house',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

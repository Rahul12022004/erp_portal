import type { ModuleRegistration } from '$lib/types';

export const inventoryModule = {
  id: 'inventory',
  navItem: {
    id: 'inventory',
    label: 'common.nav.inventory',
    href: '/school/inventory',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

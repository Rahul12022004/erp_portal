import type { ModuleRegistration } from '$lib/types';

export const maintenanceModule = {
  id: 'maintenance',
  navItem: {
    id: 'maintenance',
    label: 'common.nav.maintenance',
    href: '/school/maintenance',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

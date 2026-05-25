import type { ModuleRegistration } from '$lib/types';

export const hostelModule = {
  id: 'hostel',
  navItem: {
    id: 'hostel',
    label: 'common.nav.hostel',
    href: '/school/hostel',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

import type { ModuleRegistration } from '$lib/types';

export const attendanceModule = {
  id: 'attendance',
  navItem: {
    id: 'attendance',
    label: 'common.nav.attendance',
    href: '/school/attendance',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

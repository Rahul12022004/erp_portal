import type { ModuleRegistration } from '$lib/types';

export const timetableModule = {
  id: 'timetable',
  navItem: {
    id: 'timetable',
    label: 'common.nav.timetable',
    href: '/school/timetable',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

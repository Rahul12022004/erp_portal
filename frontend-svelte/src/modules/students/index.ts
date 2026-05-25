import type { ModuleRegistration } from '$lib/types';

export const studentsModule = {
  id: 'students',
  navItem: {
    id: 'students',
    label: 'common.nav.students',
    href: '/school/students',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

import type { ModuleRegistration } from '$lib/types';

export const examsModule = {
  id: 'exams',
  navItem: {
    id: 'exams',
    label: 'common.nav.exams',
    href: '/school/exams',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

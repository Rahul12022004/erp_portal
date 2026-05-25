import type { ModuleRegistration } from '$lib/types';

export const classesModule = {
  id: 'classes',
  navItem: {
    id: 'classes',
    label: 'common.nav.classes',
    href: '/school/classes',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

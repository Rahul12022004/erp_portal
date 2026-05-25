import type { ModuleRegistration } from '$lib/types';

export const libraryModule = {
  id: 'library',
  navItem: {
    id: 'library',
    label: 'common.nav.library',
    href: '/school/library',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

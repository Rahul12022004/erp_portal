import type { ModuleRegistration } from '$lib/types';

export const dataimportModule = {
  id: 'data-import',
  navItem: {
    id: 'data-import',
    label: 'common.nav.data-import',
    href: '/school/data-import',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

import type { ModuleRegistration } from '$lib/types';

export const visitorModule = {
  id: 'visitor',
  navItem: {
    id: 'visitor',
    label: 'common.nav.visitor',
    href: '/school/visitor',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

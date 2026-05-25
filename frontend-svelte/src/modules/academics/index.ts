import type { ModuleRegistration } from '$lib/types';

export const academicsModule = {
  id: 'academics',
  navItem: {
    id: 'academics',
    label: 'common.nav.academics',
    href: '/school/academics',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

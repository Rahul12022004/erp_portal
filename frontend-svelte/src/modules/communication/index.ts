import type { ModuleRegistration } from '$lib/types';

export const communicationModule = {
  id: 'communication',
  navItem: {
    id: 'communication',
    label: 'common.nav.communication',
    href: '/school/communication',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

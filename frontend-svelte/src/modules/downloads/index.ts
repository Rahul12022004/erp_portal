import type { ModuleRegistration } from '$lib/types';

export const downloadsModule = {
  id: 'downloads',
  navItem: {
    id: 'downloads',
    label: 'common.nav.downloads',
    href: '/school/downloads',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

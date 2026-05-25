import type { ModuleRegistration } from '$lib/types';

export const socialmediaModule = {
  id: 'social-media',
  navItem: {
    id: 'social-media',
    label: 'common.nav.social-media',
    href: '/school/social-media',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

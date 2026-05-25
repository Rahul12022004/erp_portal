import type { ModuleRegistration } from '$lib/types';

export const approvalsModule = {
  id: 'approvals',
  navItem: {
    id: 'approvals',
    label: 'common.nav.approvals',
    href: '/school/approvals',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

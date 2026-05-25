import type { ModuleRegistration } from '$lib/types';

export const surveyModule = {
  id: 'survey',
  navItem: {
    id: 'survey',
    label: 'common.nav.survey',
    href: '/school/survey',
    icon: 'Package',
    roles: ['school-admin'] as import('$lib/types').UserRole[],
  },
} satisfies ModuleRegistration;

import type { ModuleRegistration, UserRole } from '$lib/types';

export const MODULE_REGISTRY: Record<string, ModuleRegistration> = {
  finance: {
    id: 'finance',
    navItem: { id: 'finance', label: 'common.nav.finance', href: '/school/finance', icon: 'DollarSign', roles: ['school-admin'] },
  },
  attendance: {
    id: 'attendance',
    navItem: { id: 'attendance', label: 'common.nav.attendance', href: '/school/attendance', icon: 'Calendar', roles: ['school-admin', 'teacher'] },
  },
  hr: {
    id: 'hr',
    navItem: { id: 'hr', label: 'common.nav.hr', href: '/school/hr', icon: 'UserCheck', roles: ['school-admin'] },
  },
  exams: {
    id: 'exams',
    navItem: { id: 'exams', label: 'common.nav.exams', href: '/school/exams', icon: 'BookOpen', roles: ['school-admin', 'teacher'] },
  },
  academics: {
    id: 'academics',
    navItem: { id: 'academics', label: 'common.nav.academics', href: '/school/academics', icon: 'GraduationCap', roles: ['school-admin', 'teacher'] },
  },
  admissions: {
    id: 'admissions',
    navItem: { id: 'admissions', label: 'common.nav.admissions', href: '/school/admissions', icon: 'ClipboardList', roles: ['school-admin'] },
  },
  students: {
    id: 'students',
    navItem: { id: 'students', label: 'common.nav.students', href: '/school/students', icon: 'Users', roles: ['school-admin', 'teacher'] },
  },
  staff: {
    id: 'staff',
    navItem: { id: 'staff', label: 'common.nav.staff', href: '/school/staff', icon: 'Users', roles: ['school-admin'] },
  },
  timetable: {
    id: 'timetable',
    navItem: { id: 'timetable', label: 'common.nav.timetable', href: '/school/timetable', icon: 'Clock', roles: ['school-admin', 'teacher'] },
  },
  transport: {
    id: 'transport',
    navItem: { id: 'transport', label: 'common.nav.transport', href: '/school/transport', icon: 'Bus', roles: ['school-admin'] },
  },
  library: {
    id: 'library',
    navItem: { id: 'library', label: 'common.nav.library', href: '/school/library', icon: 'BookMarked', roles: ['school-admin'] },
  },
  hostel: {
    id: 'hostel',
    navItem: { id: 'hostel', label: 'common.nav.hostel', href: '/school/hostel', icon: 'Home', roles: ['school-admin'] },
  },
  inventory: {
    id: 'inventory',
    navItem: { id: 'inventory', label: 'common.nav.inventory', href: '/school/inventory', icon: 'Package', roles: ['school-admin'] },
  },
  sports: {
    id: 'sports',
    navItem: { id: 'sports', label: 'common.nav.sports', href: '/school/sports', icon: 'Trophy', roles: ['school-admin'] },
  },
  communication: {
    id: 'communication',
    navItem: { id: 'communication', label: 'common.nav.communication', href: '/school/communication', icon: 'MessageSquare', roles: ['school-admin', 'teacher'] },
  },
  salary: {
    id: 'salary',
    navItem: { id: 'salary', label: 'common.nav.salary', href: '/school/salary', icon: 'Wallet', roles: ['school-admin'] },
  },
  maintenance: {
    id: 'maintenance',
    navItem: { id: 'maintenance', label: 'common.nav.maintenance', href: '/school/maintenance', icon: 'Wrench', roles: ['school-admin'] },
  },
  visitor: {
    id: 'visitor',
    navItem: { id: 'visitor', label: 'common.nav.visitor', href: '/school/visitor', icon: 'Building2', roles: ['school-admin'] },
  },
};

export function getModuleById(id: string): ModuleRegistration | undefined {
  return MODULE_REGISTRY[id];
}

export function getModulesForRole(role: UserRole): ModuleRegistration[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.navItem.roles.includes(role));
}

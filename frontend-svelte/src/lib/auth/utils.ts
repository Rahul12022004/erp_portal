import type { UserRole } from '$lib/types';

const ROLE_HOMES: Record<UserRole, string> = {
  'super-admin': '/dashboard',
  'school-admin': '/school',
  teacher: '/teacher',
};

export function getRoleHome(role: UserRole): string {
  return ROLE_HOMES[role];
}

export function isValidRole(value: unknown): value is UserRole {
  return value === 'super-admin' || value === 'school-admin' || value === 'teacher';
}

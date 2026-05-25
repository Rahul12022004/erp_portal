export type UserRole = 'super-admin' | 'school-admin' | 'teacher';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions {
  fetch?: typeof globalThis.fetch;
}

export interface ModuleNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export interface ModuleRegistration {
  id: string;
  navItem: ModuleNavItem;
}

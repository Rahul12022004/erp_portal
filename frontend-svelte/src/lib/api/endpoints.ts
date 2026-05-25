import { PUBLIC_API_URL } from '$env/static/public';

export const API_BASE = PUBLIC_API_URL || 'http://localhost:5000';

export const ENDPOINTS = {
  auth: {
    teacherLogin: '/api/auth/staff/login',
    schoolAdminLogin: '/api/auth/school/login',
    superAdminLogin: '/api/auth/super-admin/login',
    logout: '/api/auth/logout',
  },
  finance: {
    studentSummary: (schoolId: string) => `/api/finance/${schoolId}/students/summary`,
    classFeeStructures: (schoolId: string) => `/api/finance/${schoolId}/class-fee-structures`,
  },
  attendance: {
    summary: (schoolId: string) => `/api/attendance/${schoolId}/summary`,
  },
} as const;

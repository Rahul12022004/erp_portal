import { describe, it, expect } from 'vitest';
import { getRoleHome, isValidRole } from './utils';

describe('getRoleHome', () => {
  it('returns /dashboard for super-admin', () => {
    expect(getRoleHome('super-admin')).toBe('/dashboard');
  });
  it('returns /school for school-admin', () => {
    expect(getRoleHome('school-admin')).toBe('/school');
  });
  it('returns /teacher for teacher', () => {
    expect(getRoleHome('teacher')).toBe('/teacher');
  });
});

describe('isValidRole', () => {
  it('returns true for valid roles', () => {
    expect(isValidRole('super-admin')).toBe(true);
    expect(isValidRole('school-admin')).toBe(true);
    expect(isValidRole('teacher')).toBe(true);
  });
  it('returns false for invalid values', () => {
    expect(isValidRole('admin')).toBe(false);
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
    expect(isValidRole(42)).toBe(false);
    expect(isValidRole('')).toBe(false);
  });
});

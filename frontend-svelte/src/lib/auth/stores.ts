import { writable, derived } from 'svelte/store';
import type { User, UserRole } from '$lib/types';

export const currentUser = writable<User | null>(null);

export const userRole = derived<typeof currentUser, UserRole | null>(
  currentUser,
  ($user) => $user?.role ?? null
);

export const isAuthenticated = derived(currentUser, ($user) => $user !== null);

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getRoleHome } from '$lib/auth/utils';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    redirect(303, '/login');
  }

  const { role } = locals.user;
  const path = url.pathname;

  if (path.startsWith('/dashboard') && role !== 'super-admin') {
    redirect(303, getRoleHome(role));
  }
  if (path.startsWith('/school') && role !== 'school-admin') {
    redirect(303, getRoleHome(role));
  }
  if (path.startsWith('/teacher') && role !== 'teacher') {
    redirect(303, getRoleHome(role));
  }

  return { user: locals.user, token: locals.token ?? null };
};

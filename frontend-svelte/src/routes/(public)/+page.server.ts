import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRoleHome } from '$lib/auth/utils';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    redirect(303, getRoleHome(locals.user.role));
  }
};

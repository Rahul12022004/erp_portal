import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const DELETE_OPTS = { path: '/' };

export const load: PageServerLoad = async ({ cookies }) => {
  cookies.delete('token', DELETE_OPTS);
  cookies.delete('session', DELETE_OPTS);
  redirect(303, '/');
};

export const actions: Actions = {
  default: async ({ cookies }) => {
    cookies.delete('token', DELETE_OPTS);
    cookies.delete('session', DELETE_OPTS);
    redirect(303, '/');
  },
};

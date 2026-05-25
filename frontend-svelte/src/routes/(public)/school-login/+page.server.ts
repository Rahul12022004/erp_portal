import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ENDPOINTS } from '$lib/api/endpoints';
import type { User } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(303, '/school');
  return {};
};

const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7,
};

export const actions: Actions = {
  default: async ({ request, cookies, fetch }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required', email });
    }

    try {
      const apiUrl = `${process.env.PUBLIC_API_URL ?? 'http://localhost:5000'}${ENDPOINTS.auth.schoolAdminLogin}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as {
        _id?: string;
        token?: string;
        adminInfo?: { name?: string; email?: string };
        message?: string;
      };

      if (!response.ok || !result.token) {
        return fail(401, { error: result.message ?? 'Invalid credentials', email });
      }

      const user: User = {
        id: result._id ?? '',
        email: result.adminInfo?.email ?? email,
        name: result.adminInfo?.name ?? email,
        role: 'school-admin',
        schoolId: result._id,
      };

      cookies.set('token', result.token, COOKIE_OPTS);
      cookies.set('session', JSON.stringify(user), COOKIE_OPTS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to server';
      return fail(500, { error: msg, email });
    }

    redirect(303, '/school');
  },
};

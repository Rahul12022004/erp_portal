import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ENDPOINTS } from '$lib/api/endpoints';
import type { User } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(303, '/dashboard');
  return {};
};

const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7,
};

// Non-httpOnly cookie so client-side JS can read the token for API Authorization headers.
const CLIENT_TOKEN_OPTS = {
  path: '/',
  httpOnly: false,
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
      const apiUrl = `${process.env.PUBLIC_API_URL || 'http://localhost:5000'}${ENDPOINTS.auth.superAdminLogin}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Go backend returns: { success, data: { token, user: { email, role } } }
      const json = (await response.json()) as {
        success?: boolean;
        data?: { token?: string; user?: { email?: string; role?: string } };
        error?: string;
        message?: string;
      };

      const token = json.data?.token;

      if (!response.ok || !token) {
        return fail(401, { error: json.error ?? json.message ?? 'Invalid credentials', email });
      }

      const user: User = {
        id: 'super-admin',
        email: json.data?.user?.email ?? email,
        name: 'Super Admin',
        role: 'super-admin',
      };

      cookies.set('token', token, COOKIE_OPTS);
      cookies.set('client_token', token, CLIENT_TOKEN_OPTS);
      cookies.set('session', JSON.stringify(user), COOKIE_OPTS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to server';
      return fail(500, { error: msg, email });
    }

    redirect(303, '/dashboard');
  },
};

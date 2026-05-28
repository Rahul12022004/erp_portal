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
      const apiUrl = `${process.env.PUBLIC_API_URL || 'http://localhost:5000'}${ENDPOINTS.auth.schoolAdminLogin}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Node.js: { _id, token, adminInfo, schoolInfo, modules }
      // Go:      { success, data: { token, school: { ID, AdminInfo } } }
      const json = (await response.json()) as Record<string, unknown>;

      const token =
        (json.data as Record<string, unknown> | undefined)?.token as string | undefined
        ?? json.token as string | undefined;

      const goSchool = (json.data as Record<string, unknown> | undefined)?.school as Record<string, unknown> | undefined;
      const adminInfo = goSchool?.AdminInfo as Record<string, unknown> | undefined
        ?? json.adminInfo as Record<string, unknown> | undefined;

      const schoolId = String(
        (goSchool?.ID ?? json._id ?? '') as string
      );

      if (!response.ok || !token) {
        const msg = (json.error ?? json.message ?? 'Invalid credentials') as string;
        return fail(401, { error: msg, email });
      }

      const user: User = {
        id: schoolId,
        email: String(adminInfo?.email ?? email),
        name: String(adminInfo?.name ?? email),
        role: 'school-admin',
        schoolId,
      };

      cookies.set('token', token, COOKIE_OPTS);
      cookies.set('client_token', token, CLIENT_TOKEN_OPTS);
      cookies.set('session', JSON.stringify(user), { ...COOKIE_OPTS });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to server';
      return fail(500, { error: msg, email });
    }

    redirect(303, '/school');
  },
};

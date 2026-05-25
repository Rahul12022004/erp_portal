import type { Handle } from '@sveltejs/kit';
import { isValidRole } from '$lib/auth/utils';
import type { User } from '$lib/types';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('token');
  const sessionRaw = event.cookies.get('session');

  if (token && sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw) as Partial<User>;
      if (
        parsed &&
        typeof parsed.id === 'string' &&
        typeof parsed.email === 'string' &&
        typeof parsed.name === 'string' &&
        isValidRole(parsed.role)
      ) {
        event.locals.user = {
          id: parsed.id,
          email: parsed.email,
          name: parsed.name,
          role: parsed.role,
          schoolId: parsed.schoolId,
        };
      }
    } catch {
      event.cookies.delete('token', { path: '/' });
      event.cookies.delete('session', { path: '/' });
    }
  } else if (token || sessionRaw) {
    event.cookies.delete('token', { path: '/' });
    event.cookies.delete('session', { path: '/' });
  }

  return resolve(event);
};

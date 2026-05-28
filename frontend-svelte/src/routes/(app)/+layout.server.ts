import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getRoleHome } from '$lib/auth/utils';

export const load: LayoutServerLoad = async ({ locals, url, fetch }) => {
  if (!locals.user) {
    redirect(303, '/login');
  }

  const { role } = locals.user;
  const path = url.pathname;

  // ── super-admin only pages ──────────────────────────────────────────────────
  const superAdminPaths = ['/dashboard', '/schools', '/school-admins', '/subscriptions', '/user-change', '/settings', '/logs', '/security'];
  if (superAdminPaths.some(p => path === p || path.startsWith(p + '/')) && role !== 'super-admin') {
    redirect(303, getRoleHome(role));
  }

  // ── school-admin only pages — /school and /school/* (NOT /schools or /school-admins) ──
  if ((path === '/school' || path.startsWith('/school/')) && role !== 'school-admin') {
    redirect(303, getRoleHome(role));
  }

  // ── teacher only pages ──────────────────────────────────────────────────────
  if (path.startsWith('/teacher') && role !== 'teacher') {
    redirect(303, getRoleHome(role));
  }

  // Load announcement banner (best-effort — never blocks page load)
  let announcement: { enabled: boolean; message: string; type: string; target: string } | null = null;
  try {
    const res = await fetch('/api/admin/config');
    if (res.ok) {
      const json = await res.json();
      const cfg = json?.data ?? json;
      if (cfg?.announcementEnabled && cfg?.announcementMessage) {
        announcement = {
          enabled: cfg.announcementEnabled,
          message: cfg.announcementMessage,
          type: cfg.announcementType ?? 'info',
          target: cfg.announcementTarget ?? 'all',
        };
      }
    }
  } catch { /* silent */ }

  return { user: locals.user, token: locals.token ?? null, announcement };
};

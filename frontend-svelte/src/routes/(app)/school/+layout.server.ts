import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/settings/global-modules');
    if (res.ok) {
      const json = await res.json();
      const modules: Record<string, boolean> = json?.data?.modules ?? json?.modules ?? {};
      return { globalModules: modules };
    }
  } catch { /* silent */ }
  return { globalModules: {} };
};

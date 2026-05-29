// AUTH INTERCEPTOR — safety net only.
//
// The canonical way to call the backend is the `api` client (src/lib/api/client.ts),
// which already injects the Authorization header from the `client_token` cookie.
// This interceptor patches window.fetch so that any *remaining* bare
// `fetch('/api/...')` calls (e.g. in not-yet-migrated pages) still get the token.
//
// Once every page uses the `api` client, this file can be deleted. Before removing,
// confirm no bare fetch('/api/...') calls remain:
//   grep -rn "fetch('/api\|fetch(\`/api" frontend-svelte/src
// TODO(go-migration): remove after full migration to the api client.
let patched = false;

export function installAuthInterceptor() {
  if (typeof window === 'undefined' || patched) return;
  patched = true;

  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    if (url.startsWith('/api/')) {
      const m = document.cookie.match(/(?:^|;\s*)client_token=([^;]*)/);
      const token = m ? decodeURIComponent(m[1]) : null;
      if (token) {
        const existing = (init?.headers ?? {}) as Record<string, string>;
        if (!existing['Authorization']) {
          init = {
            ...init,
            headers: { ...existing, Authorization: `Bearer ${token}` },
          };
        }
      }
    }

    return orig(input, init);
  };
}

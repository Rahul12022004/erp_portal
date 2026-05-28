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

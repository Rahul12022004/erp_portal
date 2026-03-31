const DEFAULT_LOCAL_API_URL = "http://localhost:5000";
const DEFAULT_LEGACY_API_URL = "https://erp-portal-1-ftwe.onrender.com";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

const envApiUrl = trimTrailingSlash(
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL || ""
);

export const API_URL = envApiUrl ||
  ((import.meta.env.MODE === "development") ? DEFAULT_LOCAL_API_URL : DEFAULT_LEGACY_API_URL);

if (!envApiUrl && import.meta.env.MODE !== "development") {
  console.warn(
    "VITE_API_URL is not set. Falling back to legacy API URL. Set VITE_API_URL in Vercel environment variables to your Render backend URL."
  );
}

let fetchRewriterInstalled = false;
let originalFetchRef: typeof window.fetch | null = null;

function rewriteUrl(url: string) {
  if (url.startsWith("/api/")) {
    return `${API_URL}${url}`;
  }

  if (url.startsWith(`${DEFAULT_LEGACY_API_URL}/`)) {
    return `${API_URL}${url.slice(DEFAULT_LEGACY_API_URL.length)}`;
  }

  if (url.startsWith(`${DEFAULT_LOCAL_API_URL}/`)) {
    return `${API_URL}${url.slice(DEFAULT_LOCAL_API_URL.length)}`;
  }

  return url;
}

export function installApiFetchRewriter() {
  if (fetchRewriterInstalled || typeof window === "undefined") {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  originalFetchRef = originalFetch;

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      return originalFetch(rewriteUrl(input), init);
    }

    if (input instanceof URL) {
      return originalFetch(new URL(rewriteUrl(input.toString())), init);
    }

    const rewritten = rewriteUrl(input.url);
    if (rewritten === input.url) {
      return originalFetch(input, init);
    }

    return originalFetch(new Request(rewritten, input), init);
  }) as typeof window.fetch;

  fetchRewriterInstalled = true;
}

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

function readAuthToken() {
  try {
    return localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function withAuthHeaders(init?: RequestInit): RequestInit {
  const token = readAuthToken();
  if (!token) {
    return init || {};
  }

  const headers = new Headers(init?.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...(init || {}),
    headers,
  };
}

function isPublicAuthUrl(url: string) {
  return (
    url.includes("/api/schools/login") ||
    url.includes("/api/staff/login") ||
    url.includes("/api/schools/super-admin-login") ||
    url.includes("/api/schools/register")
  );
}

function handleUnauthorizedIfNeeded(url: string, response: Response) {
  if (response.status !== 401 || isPublicAuthUrl(url)) {
    return response;
  }

  try {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("teacher");
    localStorage.removeItem("school");
    localStorage.removeItem("teacherPermissions");
  } catch {
    // ignore storage errors
  }

  if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
    window.location.assign("/");
  }

  return response;
}

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
      const url = rewriteUrl(input);
      return originalFetch(url, withAuthHeaders(init)).then((response) => handleUnauthorizedIfNeeded(url, response));
    }

    if (input instanceof URL) {
      const url = rewriteUrl(input.toString());
      return originalFetch(new URL(url), withAuthHeaders(init)).then((response) => handleUnauthorizedIfNeeded(url, response));
    }

    const rewritten = rewriteUrl(input.url);
    if (rewritten === input.url) {
      return originalFetch(input, withAuthHeaders(init)).then((response) => handleUnauthorizedIfNeeded(rewritten, response));
    }

    return originalFetch(new Request(rewritten, input), withAuthHeaders(init)).then((response) => handleUnauthorizedIfNeeded(rewritten, response));
  }) as typeof window.fetch;

  fetchRewriterInstalled = true;
}

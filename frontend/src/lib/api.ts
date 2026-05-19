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

const staleSession404Messages = new Set([
  "Admin not found",
  "School not found",
  "School not found for teacher",
  "Teacher session invalid",
  "Student not found",
  "Staff not found",
]);

function clearStoredSessionsLocally() {
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
}

function readAuthToken() {
  try {
    const directToken = localStorage.getItem("authToken") || "";
    if (directToken) {
      return directToken;
    }

    // Fallback for legacy/session shapes where token is nested in stored objects.
    const schoolRaw = localStorage.getItem("school") || "";
    if (schoolRaw) {
      try {
        const schoolParsed = JSON.parse(schoolRaw) as { token?: string };
        if (typeof schoolParsed?.token === "string" && schoolParsed.token.trim()) {
          return schoolParsed.token.trim();
        }
      } catch {
        // Ignore malformed session payload.
      }
    }

    const teacherRaw = localStorage.getItem("teacher") || "";
    if (teacherRaw) {
      try {
        const teacherParsed = JSON.parse(teacherRaw) as { token?: string };
        if (typeof teacherParsed?.token === "string" && teacherParsed.token.trim()) {
          return teacherParsed.token.trim();
        }
      } catch {
        // Ignore malformed session payload.
      }
    }

    return "";
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

  clearStoredSessionsLocally();

  if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
    window.location.assign("/");
  }

  return response;
}

async function handleStaleSession404IfNeeded(url: string, response: Response) {
  if (response.status !== 404 || isPublicAuthUrl(url)) {
    return response;
  }

  const clonedResponse = response.clone();
  const payload = await clonedResponse.json().catch(() => null) as { message?: string; error?: string } | null;
  const message = String(payload?.message || payload?.error || "").trim();

  if (!staleSession404Messages.has(message)) {
    return response;
  }

  clearStoredSessionsLocally();

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

  const handleAuthRelatedResponse = async (url: string, response: Response) => {
    const unauthorizedHandled = handleUnauthorizedIfNeeded(url, response);
    return handleStaleSession404IfNeeded(url, unauthorizedHandled);
  };

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      const url = rewriteUrl(input);
      return originalFetch(url, withAuthHeaders(init)).then((response) => handleAuthRelatedResponse(url, response));
    }

    if (input instanceof URL) {
      const url = rewriteUrl(input.toString());
      return originalFetch(new URL(url), withAuthHeaders(init)).then((response) => handleAuthRelatedResponse(url, response));
    }

    const rewritten = rewriteUrl(input.url);
    if (rewritten === input.url) {
      return originalFetch(input, withAuthHeaders(init)).then((response) => handleAuthRelatedResponse(rewritten, response));
    }

    return originalFetch(new Request(rewritten, input), withAuthHeaders(init)).then((response) => handleAuthRelatedResponse(rewritten, response));
  }) as typeof window.fetch;

  fetchRewriterInstalled = true;
}

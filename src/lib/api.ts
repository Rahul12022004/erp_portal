const DEPLOYED_API_BASE = "https://erp-portal-1-ftwe.onrender.com";
const LOCAL_API_BASE = "http://localhost:5000";
const AUTO_API_MODE = "auto";

type ApiSelection = {
  autoDetect: boolean;
  configuredBase: string | null;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getApiSelection(): ApiSelection {
  const configured = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL;
  if (!configured || configured.trim().length === 0) {
    return { autoDetect: true, configuredBase: null };
  }

  const normalized = configured.trim();
  if (normalized.toLowerCase() === AUTO_API_MODE) {
    return { autoDetect: true, configuredBase: null };
  }

  return { autoDetect: false, configuredBase: trimTrailingSlash(normalized) };
}

const apiSelection = getApiSelection();
const shouldAutoDetectLocal =
  apiSelection.autoDetect &&
  typeof window !== "undefined" &&
  isLocalHost(window.location.hostname);

let activeApiBase = apiSelection.configuredBase || DEPLOYED_API_BASE;

export const API_BASE = apiSelection.configuredBase || DEPLOYED_API_BASE;

let fetchRewriterInstalled = false;
let originalFetchRef: typeof window.fetch | null = null;

function rewriteUrl(url: string) {
  if (url.startsWith(`${DEPLOYED_API_BASE}/`)) {
    return `${activeApiBase}${url.slice(DEPLOYED_API_BASE.length)}`;
  }

  if (url.startsWith("/api/")) {
    return `${activeApiBase}${url}`;
  }

  return url;
}

async function hasHealthyLocalBackend() {
  if (!originalFetchRef) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 1500);

  try {
    const response = await originalFetchRef(`${LOCAL_API_BASE}/api/health`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { dbConnected?: boolean };
    return Boolean(data.dbConnected);
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function autoSelectApiBase() {
  if (!shouldAutoDetectLocal) {
    return;
  }

  activeApiBase = (await hasHealthyLocalBackend()) ? LOCAL_API_BASE : DEPLOYED_API_BASE;
  window.dispatchEvent(new CustomEvent("api-base-updated", { detail: { apiBase: activeApiBase } }));
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

  void autoSelectApiBase();
}

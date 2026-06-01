import { API_BASE } from './endpoints';
import { ApiError, type ApiRequestOptions } from '$lib/types';

// Read the non-httpOnly client_token cookie for Authorization header injection.
function getClientToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)client_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: ApiRequestOptions
): Promise<T> {
  const fetcher = opts?.fetch ?? globalThis.fetch;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const headers: Record<string, string> = {};
  let bodyInit: BodyInit | undefined;

  if (body instanceof FormData) {
    bodyInit = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyInit = JSON.stringify(body);
  }

  const token = getClientToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetcher(url, {
    method,
    headers,
    body: bodyInit,
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: response.statusText })) as { message?: string; error?: string };
    const msg = err.error ?? err.message ?? `HTTP ${response.status}`;

    // Expired/invalid JWT — hard-navigate to /logout so all cookies are cleared
    // before redirecting to login. Using /login directly loops back here because
    // the session cookie stays valid even when the JWT is stale.
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/logout';
    }

    throw new ApiError(response.status, msg);
  }

  // 204/205 carry no body — calling response.json() would throw on the empty body.
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts?: ApiRequestOptions) =>
    request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>('PUT', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>('PATCH', path, body, opts),
  delete: <T>(path: string, opts?: ApiRequestOptions) =>
    request<T>('DELETE', path, undefined, opts),
  postForm: <T>(path: string, form: FormData, opts?: ApiRequestOptions) =>
    request<T>('POST', path, form, opts),
};

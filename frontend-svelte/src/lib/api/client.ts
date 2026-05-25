import { API_BASE } from './endpoints';
import { ApiError, type ApiRequestOptions } from '$lib/types';

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

  const response = await fetcher(url, {
    method,
    headers,
    body: bodyInit,
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: response.statusText })) as { message?: string };
    throw new ApiError(response.status, err.message ?? `HTTP ${response.status}`);
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

import { API_URL } from "@/lib/api";
import { session } from "@/lib/session";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = session.getAuthToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
    throw new Error(err.message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) =>
    request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};

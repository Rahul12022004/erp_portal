import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '$lib/types';

// Mock $env/static/public before importing client
vi.mock('$env/static/public', () => ({ PUBLIC_API_URL: 'http://localhost:5000' }));

const { api } = await import('./client');

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('api.get', () => {
  it('returns parsed JSON on 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'Test' }),
    });

    const result = await api.get<{ id: string; name: string }>('/api/test');

    expect(result).toEqual({ id: '1', name: 'Test' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/test',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it('throws ApiError with status on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ message: 'Token expired' }),
    });

    const err = await api.get('/api/secure').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).message).toBe('Token expired');
  });

  it('uses statusText when response body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });

    const err = await api.get('/api/fail').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Internal Server Error');
  });

  it('uses custom fetch from opts when provided', async () => {
    const customFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    await api.get('/api/test', { fetch: customFetch });
    expect(customFetch).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns undefined on 204 No Content without parsing the body', async () => {
    const jsonSpy = vi.fn();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jsonSpy });

    const result = await api.delete('/api/students/s1');

    expect(result).toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});

describe('api.post', () => {
  it('serializes body as JSON with Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await api.post('/api/data', { key: 'value' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"key":"value"}',
      })
    );
  });

  it('sends FormData without Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const form = new FormData();
    form.append('file', 'data');
    await api.postForm('/api/upload', form);

    const call = mockFetch.mock.calls[0][1];
    expect(call.body).toBeInstanceOf(FormData);
    expect(call.headers['Content-Type']).toBeUndefined();
  });
});

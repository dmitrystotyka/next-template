import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError, isAbortError, request } from '@/services/api/instance';
import { logger } from '@/utils/logger';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

describe('request (client transport)', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    errorLog = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses JSON and sends no Content-Type without a body (no CORS preflight)', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    await expect(request({ url: 'https://api.test/x' })).resolves.toEqual({ ok: true });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).not.toHaveProperty('Content-Type');
  });

  it('serializes `data` as JSON', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 1 }));
    await request({ url: 'https://api.test/x', method: 'POST', data: { a: 1 } });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('resolves 204 to undefined', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(request({ url: 'https://api.test/x', method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('throws ApiRequestError with the parsed envelope; logs 5xx only, without the query', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'NOT_FOUND' } }, { status: 404 }));
    const notFound = await request({ url: 'https://api.test/x?token=secret' }).catch((e) => e);
    expect(notFound).toBeInstanceOf(ApiRequestError);
    expect(notFound).toMatchObject({ status: 404, body: { error: { code: 'NOT_FOUND' } } });
    expect(errorLog).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response('oops', { status: 503 }));
    await request({ url: 'https://api.test/x?token=secret' }).catch(() => {});
    expect(errorLog).toHaveBeenCalledWith('API 503: GET https://api.test/x');
  });

  it('refuses a relative URL when no backend is configured (no silent self-call)', async () => {
    await expect(request({ url: '/todos' })).rejects.toThrow(/NEXT_PUBLIC_SERVER_URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not log caller aborts', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    const err = await request({ url: 'https://api.test/x' }).catch((e: unknown) => e);
    expect(isAbortError(err)).toBe(true);
    expect(errorLog).not.toHaveBeenCalled();
  });
});

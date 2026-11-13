import { stripQuery } from '@/lib/origin';
import { DEFAULT_TIMEOUT_MS, resolveApiUrl } from '@/services/api/http';
import { logger } from '@/utils/logger';

/**
 * Client-side transport on top of `fetch` — what every `queryFn` calls.
 * Relative URLs resolve against the EXTERNAL backend
 * (`NEXT_PUBLIC_SERVER_URL/api`); own routes are passed ABSOLUTE
 * (`resolveAppUrl('/api/…')`). Server-side code uses `serverFetch` instead
 * (ISR options, `server-only`).
 */

type RequestConfig = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON-serialized into the body. */
  data?: unknown;
  headers?: Record<string, string>;
};

/** Non-2xx response. `status` is the HTTP status, `body` the parsed error envelope (if JSON). */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown = undefined,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Typed JSON request. Times out after `DEFAULT_TIMEOUT_MS`; `signal` (e.g.
 * TanStack Query's) cancels it. Logs only incidents — 5xx and network
 * failures, never 4xx (the caller's business) and never response bodies.
 *
 * @example
 * const todos = await request<Todo[]>({ url: API_PATHS.todos }, signal);
 * await request({ url: API_PATHS.todos, method: 'POST', data: { title } });
 */
export async function request<T>(config: RequestConfig, signal?: AbortSignal): Promise<T> {
  const { url, method = 'GET', data, headers } = config;
  // Relative → the backend; no backend configured → a clear error, never a
  // silent fallback onto this app's own origin (resolveApiUrl).
  const target = resolveApiUrl(url);
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(target, {
      method,
      // Content-Type only with a body — on a GET it forces a CORS preflight.
      headers:
        data === undefined ? { ...headers } : { 'Content-Type': 'application/json', ...headers },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (!isAbortError(error)) logger.error(`API network error: ${method} ${stripQuery(target)}`);
    throw error;
  }

  if (!response.ok) {
    if (response.status >= 500)
      logger.error(`API ${response.status}: ${method} ${stripQuery(target)}`);
    const body: unknown = await response.json().catch(() => undefined);
    throw new ApiRequestError(
      `Request failed with status ${response.status}`,
      response.status,
      body,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Check if a caught error is from AbortController cancellation or the timeout. */
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

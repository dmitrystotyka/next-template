import { urls } from '@/configs/urls';
import { isAbsoluteUrl } from '@/lib/origin';

/**
 * Transport policy shared by `request()` (instance.ts), `serverFetch` and the
 * TanStack query definitions: ONE rule for base URLs and ONE timeout.
 */

/** Shared request timeout (`request()` + serverFetch). */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Resolve a path to one of this app's OWN routes (`/api/health`, Route
 * Handlers). Always absolute: `request()` resolves RELATIVE paths against the
 * external backend — an absolute URL is
 * the only way to be sure a self-call never lands on the backend.
 *
 * - Browser: the current origin (correct on preview/LAN hosts where
 *   `NEXT_PUBLIC_CLIENT_URL` differs from the address bar; still
 *   same-origin, so CSP `connect-src 'self'` applies).
 * - Server (SSR prefetch, Route Handlers): the site's public URL.
 */
export function resolveAppUrl(path: string): string {
  if (isAbsoluteUrl(path)) return path;
  const base = typeof window === 'undefined' ? urls.website : window.location.origin;
  return `${base}${path}`;
}

/**
 * Resolve a path against the EXTERNAL backend (`NEXT_PUBLIC_SERVER_URL`).
 * A missing backend URL is a configuration error surfaced at the first
 * call — never a silent fallback onto the own app (that is how
 * `/api/api/health` happens).
 */
export function resolveApiUrl(path: string): string {
  if (isAbsoluteUrl(path)) return path;
  if (!urls.server.api) {
    throw new Error(
      'resolveApiUrl: NEXT_PUBLIC_SERVER_URL is not set — use resolveAppUrl() for own routes',
    );
  }
  return `${urls.server.api}${path}`;
}

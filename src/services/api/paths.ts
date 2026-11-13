/**
 * Centralized API path catalog for the EXTERNAL backend. Keep every
 * endpoint here so call sites stay grep-able and refactors require a single
 * touch point. Paths are relative to `NEXT_PUBLIC_SERVER_URL/api` — resolve
 * them with `resolveApiUrl()` (see `http.ts`) or pass them to `request()`
 * (`instance.ts`), which carries that base URL.
 *
 * Conventions:
 * - Static collections → string literals (`'/users'`).
 * - Dynamic resources → function returning a path (`user: (id) => \`/users/${id}\``).
 * - Group by resource. Sort alphabetically within a group.
 */
export const API_PATHS = {
  // todos: '/todos',
  // todo: (id: string | number) => `/todos/${id}`,
} as const;

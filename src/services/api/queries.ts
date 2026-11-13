/**
 * TanStack Query definitions — one `queryOptions()` per resource, reused by
 * `useQuery`/`useSuspenseQuery` on the client AND `prefetchQuery` on the
 * server (pattern: src/app/CLAUDE.md → Data in pages).
 *
 * New resource: DTO type → `queryOptions({ queryKey, queryFn, staleTime })`
 * with a `STALE_TIMES` entry; backend paths from `API_PATHS`.
 *
 * All client I/O goes through TanStack Query — never fetch in a component
 * (one cache, deduplication, devtools, consistent loading states).
 * Server prefetch of your OWN data: never self-fetch the /api route —
 * prefetch the same `queryKey` with the data function as `queryFn`
 * (`{ ...healthQuery, queryFn: getHealth }`) and read it on the client with
 * `useSuspenseQuery` (a pending-dehydrated query).
 */

import { queryOptions } from '@tanstack/react-query';

import type { HealthResponse } from '@/app/api/health/getHealth';
import { STALE_TIMES } from '@/lib/queryClient';
import { resolveAppUrl } from '@/services/api/http';
import { request } from '@/services/api/instance';

/** Reference query for an OWN route — copy its shape for new resources. */
export const healthQuery = queryOptions({
  queryKey: ['health'] as const,
  // Own route → absolute app URL (relative paths would go to the backend).
  // TanStack's `signal` is forwarded so unmount/refetch cancels the request.
  queryFn: ({ signal }) =>
    request<HealthResponse>({ url: resolveAppUrl('/api/health'), method: 'GET' }, signal),
  staleTime: STALE_TIMES.dynamic,
});

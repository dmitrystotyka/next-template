import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

/**
 * Query stale times by data category.
 * Override per-query with `staleTime` option.
 */
export const STALE_TIMES = {
  /** Rarely changing data (config, settings) */
  static: 10 * 60 * 1000,
  /** Standard API data (lists, details) */
  standard: 60 * 1000,
  /** Frequently changing data (notifications, counters) */
  dynamic: 10 * 1000,
  /** Real-time data — always refetch */
  realtime: 0,
} as const;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.standard,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        // No retries on the server: a failing un-awaited prefetch would hold
        // the stream for the retry delay. The browser retries once.
        retry: typeof window === 'undefined' ? 0 : 1,
        // TanStack's default networkMode 'online' PAUSES requests while the
        // browser thinks it's offline — the promise neither resolves nor
        // rejects, so screens hold skeletons forever and submits spin
        // silently. 'always' lets the request fail fast (every error path
        // already handles it) and `refetchOnReconnect` recovers when the
        // network returns.
        networkMode: 'always',
      },
      mutations: {
        networkMode: 'always',
      },
      dehydrate: {
        // The default ships only `success` queries. A server prefetch that is
        // fired without `await` (src/app/CLAUDE.md → Data in pages) is still `pending`
        // when `dehydrate()` runs and would be silently dropped — the client
        // would refetch after mount and the "SSR prefetch" would be a no-op.
        // Including pending queries streams the promise in the RSC payload
        // and HydrationBoundary resolves it on the client. Rejections stay
        // redacted (default `shouldRedactErrors`).
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Returns a QueryClient instance.
 * - Server Components: one per request (`React.cache()`).
 * - SSR of client components: React's client build has no request cache,
 *   so each render gets a fresh client — correct, the data arrives through
 *   HydrationBoundary anyway.
 * - Browser: one singleton.
 * Route Handlers / Server Actions (outside the render path) get a fresh
 * client per call — fine for one-off prefetching, no cross-call sharing.
 */
const getServerQueryClient = cache(() => makeQueryClient());

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return getServerQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

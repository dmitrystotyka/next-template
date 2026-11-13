# src/services/

```
api/http/          resolveAppUrl() (OWN routes, always absolute) · resolveApiUrl() (backend, throws when unset) · DEFAULT_TIMEOUT_MS
api/instance.ts    client transport: request<T>({ url, method, data }, signal) on fetch · ApiRequestError · isAbortError
api/serverFetch/   server transport ('server-only'), ISR options; ServerFetchError (non-JSON 200 → 502, upstream 401/403 → 502)
api/queries.ts     queryOptions() — one per resource, used by the hook AND the server prefetch (healthQuery = reference)
api/paths.ts       API_PATHS — backend endpoints catalogue (empty; commented example)
api/cache.ts       REVALIDATE windows + CACHE_TAGS (constants + builders) — never inline numbers/tag strings
i18n/              routing (as-needed prefix, NEXT_LOCALE cookie) · request (loads namespaces) · navigation (Link, …) · constants
```

## API

- **All client I/O through TanStack Query.** New resource:

  ```ts
  // queries.ts
  export const todosQuery = queryOptions({
    queryKey: ['todos'] as const,
    queryFn: ({ signal }) => request<Todo[]>({ url: API_PATHS.todos }, signal),
    staleTime: STALE_TIMES.standard,
  });
  // mutation: useMutation({ mutationFn: (title: string) => request({ url: API_PATHS.todos, method: 'POST', data: { title } }) })
  ```

- Backend = `NEXT_PUBLIC_SERVER_URL` (requests go to `<url>/api`). Own routes are passed absolute
  (`resolveAppUrl('/api/x')`); relative paths go to the backend.
- `request()` sends `Content-Type` only with a body (no CORS preflight on GETs) and logs only 5xx/network
  failures, without query strings. `ApiRequestError.body` carries the parsed error envelope.
- Client code reading `NEXT_PUBLIC_SERVER_URL` (any `request()` to the backend) → add it to the
  `check-public-env.mjs` list in the `build` script.
- Keys/contract modules are PLAIN modules — never `'use client'` (a Server Component would get a client-reference
  proxy and the prefetch silently does nothing).
- Growing API → `api/<domain>/{keys,queries,mutations}.ts`.
- Server prefetch pattern: `src/app/CLAUDE.md` → Data in pages.

## i18n wiring

- `clientNamespaces` (`i18n/constants.ts`) decides what reaches the client; `metadata` is server-only (SPEC I3).
- New namespace: `src/messages/CLAUDE.md`.
- A namespace file that fails to load throws in dev and degrades to `{}` in production (`request.ts`).
- `timeZone` is pinned (`projectConfig.i18n.timeZone`) — no hydration mismatches on dates.
- One locale left → `localePrefix: 'never'` and no switcher, automatically.

## Gotchas

- **The server prefetch works, the client still fetches after mount.** TanStack dehydrates only `success` queries;
  an un-awaited prefetch is `pending` → `shouldDehydrateQuery` includes pending (`lib/queryClient`).
- **React #418 on a prefetched widget.** A pending-dehydrated query read with `useQuery` → `useSuspenseQuery` inside
  `<Suspense>` (both sides wait for the same promise), `ErrorBoundary` for the inline error.
- **"dehydrated as pending ended up rejecting" / `Error: redacted`.** The prefetch self-fetched
  `NEXT_PUBLIC_CLIENT_URL/api/…` and another server answered → call the data function (`queryFn: getHealth`).
- **Own routes hit `https://backend/api/api/health`.** A relative own path went to the backend →
  `resolveAppUrl()` for own routes, `resolveApiUrl()`/relative for the backend.
- **The prefetch silently does nothing.** Query options imported from a `'use client'` module are a client
  reference on the server → plain modules only.
- **Skeletons forever / submits spin offline.** TanStack's default `networkMode: 'online'` pauses requests →
  `'always'` (`lib/queryClient`).
- **Hydration mismatch on dates/numbers.** Server and client formatted in different time zones → pinned `timeZone`.

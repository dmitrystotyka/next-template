# src/lib/ (+ src/utils/)

```
withApiHandler/     Route Handler wrapper: rate limit · AppError → JSON · reporting · opt-in CORS · re-throws Next control flow
withServerAction/   Server Action wrapper → ServerActionResult<T>; unstable_rethrow for redirect/notFound
assertSameOrigin/   CSRF check for every mutation (ForbiddenError, constant message)
botGuard/           isLikelyBot(signals, scope) — honeypot + min fill time (client half: useBotSignals + <Honeypot>)
rateLimit/          checkIdentity (ONE identity rule) · createApiRateLimit · rateLimitAction (NOT in the barrel)
errors/             AppError taxonomy (… NotImplementedError=501) · toErrorPayload · isIncident · publicMessage
errorReporting.ts   the ONE reporter seam — wire Sentry/Datadog here and nowhere else
cors/ origin/       CORS headers · origin normalization
queryClient/        getQueryClient · STALE_TIMES · pending dehydration · networkMode 'always'
withMinDelay/       floor perceived submit duration (a 40 ms answer would flash "Sending…" for one frame)
jsonLd/ cn/ lazyLoad.tsx
../utils/           logger (logger.child('scope')) · debounce (.cancel/.flush) · throttle — framework-free
```

## Rules

- **Never revert** `networkMode: 'always'` (offline requests would pause forever) or pending-query dehydration
  (un-awaited prefetches would be dropped) — `queryClient.test.ts` guards both.
- Error envelope is `toErrorPayload()` everywhere (handlers, actions, middleware 429); `details` nested, never spread.
- Any catch-all wrapper must `unstable_rethrow(err)` first — Next's `notFound`/`redirect` are throws.
- **Report incidents only**: `isIncident(err)` — unknown errors and 5xx AppErrors (a failing upstream) yes; expected
  4xx and 501 no. A message meant for logs (upstream URL/status) goes in `message`; clients get `publicMessage`.
- Rate limiting: identity unknown in production → SKIP (one warning per scope), never a shared bucket. `x-real-ip`
  counts only with `TRUSTED_PROXY_HOPS` > 0 (a declared proxy overwrites it; otherwise the client forges it). The
  in-memory store fails OPEN past 50k keys per window (logged) and is per process — Redis for several instances.
  `X-RateLimit-*` on every checked response, `Retry-After` only on 429.
- `logger.warn` and `logger.error` survive production (operational signals); others are dev-only. Never log raw
  response bodies or query strings.
- Mutation `onSuccess` cache writes: wrap in try/catch — TanStack runs `onSuccess` inside the mutation's try block,
  so a buggy updater reports a mutation the server APPLIED as failed.
- Intentional public API that nothing imports yet → `/** @public */` on the export, or a knip `entry` for a module.

## Tests

Node environment by default; co-locate `*.test.ts`. `src/lib/**` coverage ≥ 70% (ratchet — raise, never lower).
References: `rateLimit/`, `withApiHandler/`, `withServerAction/`, `assertSameOrigin/` (mocks `next/headers`),
`queryClient/` (+ `queryClient.browser.test.ts` under jsdom — a `typeof window` branch needs its own jsdom file).

## Gotchas

- **Rate limiting does nothing in prod (or one user's 429 hits everyone).** No trustworthy client IP: a constant
  fallback would make ONE bucket for the whole site → limiting is skipped with a warning; set `TRUSTED_PROXY_HOPS`
  (Vercel: 1).
- **A Server Action navigates nowhere / toasts an error after `redirect()`.** A catch-all swallowed Next's
  control-flow throw (`digest` `NEXT_…`) → `unstable_rethrow` first (`withServerAction`, `withApiHandler`).
- **Server Actions are limited twice.** An action is a POST to the page URL: page budget (`proxy.ts`) + action budget
  (`withActionRateLimit`) — by design. Never skip on the `next-action` header: it is client-controlled.
- **A placeholder gated on `isPending` never disappears.** A `skipToken`/disabled query stays pending forever —
  gate on `fetchStatus === 'fetching'` (or `isLoading`) instead.

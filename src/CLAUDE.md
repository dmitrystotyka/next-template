# src/ — top-level files

```
proxy.ts           Next 16 middleware: rate limit (pages) → CSP nonce on the REQUEST → next-intl → CSP on the response
instrumentation.ts register() validates env at boot · onRequestError → errorReporting (path without query)
types/             env.d.ts (ProcessEnv) · next-intl.ts (message types from the default locale) · index.ts (Locale, ProjectConfig)
utils/             logger · debounce · throttle — framework-free; rules in src/lib/CLAUDE.md
```

## proxy.ts

- Named `proxy` export (or default). Nonce + CSP go on the **request** (`new NextRequest(request, { headers })` into
  the intl middleware) so RSC `headers()` sees the nonce and Next signs its own scripts; then mirrored on the
  response. Every matched route renders per request by design.
- Dev adds `'unsafe-eval'` (React debugging, Next CSP guide) — never production.
- Third-party origins: `ALLOWED_CONNECT` / `ALLOWED_IMG` / `ALLOWED_FONT` (+ `images.remotePatterns` for images).
- Rate limit: per-path `RATE_LIMIT_RULES` (one limiter per rule), default budget, a larger separate budget for
  `<Link>` prefetches. Server Action POSTs count here too (by design).
- `config.matcher` skips `/api`, `/_next`, `/assets`, metadata routes and static extensions — a page under a
  skipped path gets no nonce or locale routing (`pnpm page` refuses those names). Details: `SPEC.md` S1–S6.
- Env read at module scope (before `instrumentation` validates it) is sanitized here: TT mode whitelist,
  `CSP_REPORT_URI` parsed with `new URL()` — a raw value with `;` would inject CSP directives.

## types/

`env.d.ts` mirrors `src/configs/env/env.ts` (the Zod schema is the runtime truth). `next-intl.ts` augments
`AppConfig.Messages` — its `@/messages/<locale>/` imports must be the default locale (`check:i18n`).

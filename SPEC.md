# next-template — spec

What the template must do and how each promise is enforced. `CLAUDE.md` files say _how to write code_;
this file says _what must stay true_. A change that breaks a requirement below is a bug, even if every gate is green.

## Purpose

Next.js 16 starter: App Router, strict TypeScript, Tailwind v4, next-intl, per-request CSP — clean from the first
commit: no demo to delete, every shipped module either used by the app or a tested library piece.

| Who                 | Gets                                                          | Command                              |
| ------------------- | ------------------------------------------------------------- | ------------------------------------ |
| Developer           | dev server, generators, the same gates as CI on pre-push      | `pnpm dev` · `pnpm page/component/…` |
| Public (deploy)     | production build that passes the runtime smoke test           | `pnpm build && pnpm check:runtime`   |
| New project (owner) | renamed copy on install, a clean home page, nothing to remove | `pnpm install` → `pnpm dev`          |

## Requirements

Each has an ID; the right column is what fails when it breaks. `check-runtime` = `pnpm check:runtime`
(`.template/checks/check-runtime.mjs`, runs in CI and on Vercel), which prints the ID of every failed check.

### Output — what the production server answers

| ID  | Requirement                                                                                                                                                                                                                                                       | Enforced by                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| O1  | Every registry page (`src/configs/routes.ts`) answers 200 in every locale; on an indexable deploy `sitemap.xml` lists every page that opts in (absolute URLs); a non-indexable one (Vercel preview, `INDEXING=off`) has an empty sitemap and robots `Disallow: /` | `check-runtime`                         |
| O2  | Every `NEXT_PUBLIC_*` listed in the `build` script (the vars CLIENT code reads) is present in the client bundle when set (literal `process.env.NEXT_PUBLIC_X` only)                                                                                               | `check-public-env` (in `pnpm build`)    |
| O3  | Every page: `<title>`, absolute canonical, hreflang for every locale + `x-default`, absolute `og:url` + `og:image` (with `alt`). A 404 has NO canonical/hreflang (root metadata carries no page URLs)                                                             | `check-runtime`, `createMetadata` tests |
| O4  | Rendered HTML is valid (`.htmlvalidate.json`: recommended + prettier; React-serializer style rules and `valid-id` relaxed). Exceptions are exact and listed in `check-runtime` (`ALLOWED_HTML_ISSUES`), never a whole rule                                        | `check-runtime`                         |
| O5  | No source maps in `.next/static`                                                                                                                                                                                                                                  | `check-runtime`                         |

### Routing

| ID  | Requirement                                                                                                                                                                                                                                                                     | Enforced by         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| R1  | Missing URL → real HTTP 404 (flat and nested, every locale, and a missing static asset) + `noindex`. So: `loading.tsx` only at route level, never at locale level; `cacheComponents` stays off (streamed shell commits 200 — measured on 16.3.8, `src/app/CLAUDE.md` → Gotchas) | `check-runtime`     |
| R2  | Default locale is unprefixed: `/<default>` redirects to `/`; other locales live under `/<locale>`                                                                                                                                                                               | `check-runtime`     |
| R3  | Metadata routes (`robots.txt`, `manifest.webmanifest`, `opengraph-image`, `apple-icon`, `sitemap.xml`) answer directly — never bounced through the locale redirect                                                                                                              | `check-runtime`     |
| R4  | Every layout, page and `generateMetadata` under `[locale]` calls `setRequestLocale(locale)`                                                                                                                                                                                     | review, `pnpm page` |

### i18n

| ID  | Requirement                                                                                                                           | Enforced by                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| I1  | Every locale has exactly the keys of the default locale; message folders = `i18n.locales`; message types come from the default locale | `pnpm check:i18n` (pre-commit, `check`) |
| I2  | `<html lang>` equals the URL's locale                                                                                                 | `check-runtime`                         |
| I3  | The server-only `metadata` namespace never reaches the client payload                                                                 | `check-runtime`                         |
| I4  | No hardcoded UI strings — incl. `aria-label`, `sr-only`, Zod messages (only `global-error.tsx` is exempt)                             | review                                  |

### Security

| ID  | Requirement                                                                                                                                                                                                            | Enforced by                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| S1  | Per-request CSP nonce with `'strict-dynamic'`: set on the REQUEST and mirrored on the response; every `<script>` carries it; a new nonce per request                                                                   | `check-runtime`                                               |
| S2  | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, COOP `same-origin-allow-popups`, CORP, a deny-by-default `Permissions-Policy` on every page; no `X-Powered-By`; HSTS production-only                   | `check-runtime`, review (dev)                                 |
| S3  | One rate-limit identity rule (`checkIdentity`) for pages, API and actions; `x-real-ip` only behind a declared proxy (`TRUSTED_PROXY_HOPS`); unknown identity in production → limiting SKIPPED, never one shared bucket | `rateLimit` tests                                             |
| S4  | Every mutation: `withServerAction` → `assertSameOrigin` → rate limit → honeypot + min fill time (`isLikelyBot`) → Zod re-validation; bots get a success-shaped answer                                                  | tests, review                                                 |
| S5  | `/api/revalidate`: secret only via `x-revalidate-secret`, constant-time compare, rate-limited, 501 when unset                                                                                                          | `route.test.ts`, `check-runtime` (A2), review (constant-time) |
| S6  | Env values that go into headers are parsed, not pasted (`CSP_REPORT_URI` → `new URL().href`); all runtime env validated with Zod at boot                                                                               | `env` tests (schema), review (header parsing)                 |

### API & data

| ID  | Requirement                                                                                                                                                                                        | Enforced by                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| A1  | `GET /api/health` → 200 `{status:"ok"}`, never rate-limited                                                                                                                                        | `check-runtime`                         |
| A2  | A rate-limited API answers 429 + `Retry-After` + `X-RateLimit-*` + the shared error envelope (`toErrorPayload`)                                                                                    | `check-runtime`, `withApiHandler` tests |
| A3  | Wrappers (`withApiHandler`, `withServerAction`) re-throw Next control flow (`notFound`/`redirect`) — never a 500, never reported; they report unknown errors and 5xx (`isIncident`), never 4xx/501 | tests                                   |
| A4  | All client I/O goes through TanStack Query; server prefetch uses the same key with the data function (never a self-fetch); pending queries dehydrate; `networkMode: 'always'`                      | `queryClient` tests, review             |
| A5  | Unknown `/api/*` → 404 with the JSON error envelope (`api/[...slug]/route.ts`), never the HTML page                                                                                                | `check-runtime`                         |

### Source code

| ID  | Requirement                                                                                                                                                                                                      | Enforced by              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| C1  | Only the `@/` alias; named exports (Next file conventions excepted); no barrel files outside a module folder (imports by path)                                                                                   | ESLint, review           |
| C2  | Folder convention: a module with a test/siblings lives in `Name/{Name.tsx, Name.test.tsx, index.ts}`, `index.ts` only re-exports                                                                                 | review, `pnpm component` |
| C3  | `logger` instead of `console.*`                                                                                                                                                                                  | ESLint `no-console`      |
| C4  | No unused files, dependencies or exports; the starter library (hooks, UI kit, lazyLoad, API catalogues) is declared as knip `entry` — no `ignore` at all; intentional single exports are tagged `/** @public */` | `knip` (blocking)        |
| C5  | Coverage thresholds are a ratchet — raise, never lower; `src/lib/**` ≥ 70%                                                                                                                                       | `vitest.config.ts`       |

### Repo & supply chain

| ID  | Requirement                                                                                                                                                                | Enforced by                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| G1  | `pnpm check` 0 warnings on pre-push, CI and Vercel — one definition in `package.json`                                                                                      | husky, CI, `vercel.json`           |
| G2  | `pnpm check:runtime` passes after every production build                                                                                                                   | CI, `vercel.json`                  |
| G3  | Conventional commits; every commit bumps `package.json` semver                                                                                                             | commitlint (format), review (bump) |
| G4  | npm scripts run in cmd, PowerShell and POSIX shells: no `rm -rf`, `\|\| true`, `VAR=x cmd` — Node scripts in `.template/`                                                  | review                             |
| G5  | `minimumReleaseAge` 3 days, audited `onlyBuiltDependencies`, SHA-pinned CI actions                                                                                         | `pnpm-workspace.yaml`, CI          |
| G6  | A new project works on day one: `prepare` renames, every generator (`page`, `component`, `api`, `locale`) passes all gates                                                 | CI `lifecycle` job                 |
| G7  | The template stays vanilla: no demo; every module is used by the app or a declared starter-library entry (`knip.json`); state managers, HTTP clients are added by projects | `knip` (blocking), review          |

## Non-goals

Dark mode (single light theme by design), a CMS, auth, a database layer, static export, Cache Components (see R1),
a global client-state library, demo content.

## Done = all green

```bash
pnpm check && pnpm build && pnpm check:runtime
```

New requirement → add a row here and, where possible, a check in `.template/checks/check-runtime.mjs` tagged with its ID.

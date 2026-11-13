<div align="center">
  <h1>Next Template</h1>
  <p>Production-ready Next.js 16 starter: strict TypeScript, Tailwind CSS v4, i18n, per-request CSP and strict gates — clean from the first commit, nothing to delete</p>

  <p>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D24-brightgreen?style=flat-square" alt="Node.js"></a>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/next.js-16-black?style=flat-square" alt="Next.js"></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/typescript-strict-3178C6?style=flat-square" alt="TypeScript"></a>
    <a href="https://github.com/dmitrystotyka/next-template/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  </p>

  <p><a href="https://next-template-demo.vercel.app/">Live Demo</a></p>
</div>

<br />

## Features

- **Next.js 16** — App Router, Turbopack, React 19 + React Compiler, streaming SSR
- **TypeScript** — strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Tailwind CSS v4** — CSS-first config, oklch tokens, shadcn/ui components
- **i18n** — next-intl, `[locale]` routing (default locale unprefixed), typed messages, key parity, hreflang
- **One page registry** — `src/configs/routes.ts` feeds `routes.*()`, `sitemap.xml`, the Header nav and the smoke test
- **Clean start** — a plain home page in the site chrome; no demo to remove, no library you didn't ask for
- **Generators** — `pnpm page [--nav] [--loading]`, `component`, `api`, `locale add|remove`
- **Data & forms** — TanStack Query (server prefetch + `useSuspenseQuery`) over a `fetch` transport; `useZodForm` + one Zod schema on client and server → Server Action with CSRF, rate limit and a bot guard
- **Security** — per-request CSP nonce (`strict-dynamic`), hardened headers, one rate-limit identity rule for pages/API/actions, CSRF check for actions, header-only ISR webhook secret
- **Quality gates** — ESLint + Stylelint (0 warnings), Prettier, typecheck (app + tests), Vitest 5 + coverage ratchet, i18n parity, knip — `pnpm check` = pre-push = CI = Vercel
- **Runtime smoke test** — `pnpm check:runtime` starts the production server and checks status codes (real 404s), the CSP nonce on every script, SEO tags, valid HTML and the API — in CI and on Vercel
- **Works everywhere** — every script is plain Node: cmd, PowerShell, Git Bash, macOS, Linux
- **Supply chain** — pnpm `minimumReleaseAge` + install-script allow-list, SHA-pinned Actions

## Quick Start

```bash
npx degit dmitrystotyka/next-template my-app
cd my-app
git init
pnpm install   # names the project after its folder (v1.0.0) + enables git hooks
pnpm dev
```

> Node.js 24+, pnpm 10.16+. Any order works — `pnpm install` first, `git init` later? Run `pnpm prepare` once after `git init`.
> The rename runs only on a copy **without commits** (degit, zip). A `git clone` keeps the template's history and name —
> rename `package.json` / `projectConfig.name` by hand there.

Then make it yours: set your domain in `.env.production` (`NEXT_PUBLIC_CLIENT_URL` — `prepare` reset it to
`https://example.com`), replace the home page content in `src/app/[locale]/(routes)/page.tsx`, add pages:

```bash
pnpm page about "About us" --nav      # route + metadata + messages in every locale + Header nav + sitemap
```

## Commands

```bash
pnpm dev                 # dev server
pnpm build               # production build (+ public-env bundle guard)
pnpm check:runtime       # smoke test of the production build
pnpm preview             # build + start
pnpm check               # all gates, 0 warnings (pre-push, CI, Vercel)
pnpm fix                 # autofix ESLint · Stylelint · Prettier
pnpm test                # Vitest (test:watch, test:coverage)
pnpm check:i18n          # key parity of every locale against the default one

pnpm page about "About us" --nav     # route + metadata + messages in every locale + registry
pnpm page blog --loading             # + route-level loading.tsx skeleton
pnpm component Badge --test          # folder convention, UI barrel export, jsdom test
pnpm api contact --post              # Route Handler: Zod body + rate limit
pnpm locale add de                   # messages, config, flag (locale remove de — the reverse)

pnpm clean [--cache] · pnpm analyze
```

Git hooks: pre-commit (lint-staged + i18n parity) · commit-msg (commitlint) · pre-push (`pnpm check`).

## What's in the box

| Ready to use                                                                                    | Where                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Page chrome: skip link, Header (nav from the registry, language switch), `<main>`, Footer       | `components/layouts/SiteShell`              |
| Styled 404 (real status, every locale), error boundaries with retry, `global-error`             | `app/[locale]/not-found.tsx`, `ErrorState`  |
| SEO: canonical, hreflang, OG/Twitter with a generated image, JSON-LD, sitemap, robots, manifest | `configs/metadata`, `app/*` metadata routes |
| UI kit: Button, Input, FormField, Dialog, Skeleton, Toaster, Honeypot                           | `components/UI` (shadcn/ui)                 |
| Hooks: `useZodForm`, `useBotSignals`, `useLocalStorage`, `useMediaQuery`, debounce/throttle, …  | `hooks/`                                    |
| Server: `withApiHandler`, `withServerAction`, rate limit, CSRF, bot guard, typed errors         | `lib/` (tested)                             |
| API: `/api/health`, `/api/revalidate` (ISR webhook), JSON 404 for unknown `/api/*`              | `app/api/`                                  |

Global client state, an HTTP client library, analytics — add them when a feature needs them.

## Project Structure

```
src/
├── app/          layout (html, JSON-LD, font) · [locale]/ (pages, (routes) group, 404) · api/ · metadata routes
├── components/   UI/ (shadcn) · layouts/ (SiteShell, Header, Footer, ErrorState, NotFoundContent, …) · icons/
├── configs/      project · routes (page registry) · metadata · env (Zod) · featureFlags
├── hooks/        useZodForm · useBotSignals · useLocalStorage · useMediaQuery · debounce/throttle · …
├── lib/          withApiHandler · withServerAction · rateLimit · botGuard · errors · errorReporting · queryClient · …
├── messages/     {en,ru}/{translations,metadata}.json
├── services/     api (fetch transport · queries · serverFetch · ISR cache) · i18n (next-intl)
├── styles/       tailwind.css · vars.css (oklch) · normalize.css (@layer base) · fonts.ts
└── proxy.ts      rate limit → CSP nonce → next-intl
.template/        checks/ (public env — in build; runtime, i18n — in check/CI) · setup/ (generators, install hook) · lib/
CLAUDE.md         in the root and in every folder above: conventions, examples, debugged gotchas
SPEC.md           requirements with the check that enforces each
```

## Configuration

**Differs per environment → env files** (every variable documented in [`.env.example`](.env.example), validated at boot):

| File               | Used by                     | Holds                                                    |
| ------------------ | --------------------------- | -------------------------------------------------------- |
| `.env.development` | `pnpm dev`                  | local URLs — committed, no secrets                       |
| `.env.production`  | `pnpm build` / `pnpm start` | public origin, backend URL — committed, no secrets       |
| `.env.local`       | both (wins)                 | secrets and personal overrides — gitignored              |
| host env settings  | Vercel / server             | secrets (`REVALIDATE_SECRET`), `TRUSTED_PROXY_HOPS`, CSP |

Required: `NEXT_PUBLIC_CLIENT_URL`. Port: `pnpm dev -p 3100` (Next reads `PORT` from the shell, never from env files).

**Same everywhere → `src/configs/`:**

| File                              | Setting                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `project.ts`                      | `name` · `i18n` (`defaultLocale`, `locales`, `timeZone`) · `theme` (colors outside CSS: `themeColor`, manifest, OG image) · `sitemap` / `robots` |
| `routes.ts`                       | `staticPages` — the page registry → `routes.*()`, sitemap, Header nav (`pnpm page` writes it)                                                    |
| `featureFlags.ts`                 | build-time switches: `featureFlags.isEnabled('experimental')`                                                                                    |
| `next.config.ts` · `src/proxy.ts` | security headers · CSP (allowed origins: `ALLOWED_CONNECT`, `ALLOWED_IMG`) · rate-limit rules                                                    |

## Deploy

**Vercel** — import the repo; `vercel.json` runs `pnpm check && pnpm build && pnpm check:runtime`. Set
`TRUSTED_PROXY_HOPS=1` (rate limiting needs a trusted client IP).
**Self-hosted** — `pnpm build && pnpm start` behind a reverse proxy; `TRUSTED_PROXY_HOPS` = number of proxies.
The in-memory rate limiter is per process — use Redis (swap the backend in `src/lib/rateLimit`) for several instances.

**GitHub Actions** (`.github/workflows/ci.yml`): `quality` = `pnpm check` → build → `check:runtime`;
`lifecycle` = a new project's first day: `prepare` (rename) → every generator → the same gates → `locale remove`.

## Docs

[`CLAUDE.md`](CLAUDE.md) — how to work here: commands, rules, settings, verification; one per folder
(`src/*/CLAUDE.md`, `.template/CLAUDE.md`) with that folder's conventions and debugged gotchas. Claude Code loads
the nested ones automatically; humans read the same files.
[`SPEC.md`](SPEC.md) — what must stay true, each requirement with the check that enforces it.

## License

MIT © [Dmitry Stotyka](https://dmitrystotyka.com)

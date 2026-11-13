# next-template

Next.js 16 (App Router, Turbopack, React 19 + Compiler) · strict TypeScript · Tailwind CSS v4 + shadcn/ui ·
next-intl · TanStack Query · RHF + Zod 4 · Vitest 5. Node 24 · pnpm 10.16+.

Clean from the first commit: no demo to remove. `pnpm install` → `pnpm dev` → build your pages (`pnpm page …`).
Everything shipped is either used by the app or a ready library module with tests.

## Commands

```bash
pnpm dev                        # dev server (Turbopack); another port: pnpm dev -p 3100
pnpm build                      # production build + public-env bundle guard
pnpm check:runtime              # after build: next start + smoke test (status, CSP nonce, SEO, HTML, API)
pnpm preview                    # build + start
pnpm check                      # ALL gates, 0 warnings: lint · prettier · types (app+tests) · tests+coverage · i18n · knip
pnpm lint / pnpm typecheck      # the fast inner loop while coding
pnpm fix                        # autofix: ESLint · Stylelint · Prettier
pnpm test / test:watch / test:coverage
pnpm check:i18n                 # key parity of every locale against the default one

pnpm page about ["About us"] [--nav] [--loading]   # page: route + metadata + messages + registry
pnpm component Name [--test] [--layout] [--client] # component in the folder convention
pnpm api name [--post]          # Route Handler via withApiHandler (Zod body, rate limit)
pnpm locale add|remove <code>   # locale everywhere it is declared
pnpm clean [--cache] · pnpm analyze
```

Fresh copy: `pnpm install` names the project after its folder (v1.0.0) and enables git hooks — any order with `git init`.
Hooks: pre-commit = lint-staged (+ i18n parity) · commit-msg = commitlint · pre-push = `pnpm check`.

## How to work here

1. **`SPEC.md`** — what must stay true (IDs O/R/I/S/A/C/G + what enforces each). Never break one.
2. **Read the folder's `CLAUDE.md`** (map below) and write code the way it says. Its "Gotchas" section lists
   incidents already debugged there — check it before debugging a strange symptom.
3. **Library code → Context7 first** (table below), plus `node_modules/next/dist/docs/` for Next — never memory alone.
4. **Change behaviour → update the doc in the same change** (and `SPEC.md` if a requirement changes). Keep docs
   short: tree, rules, copy-paste examples. Debugged a confusing symptom → one line in that folder's Gotchas.
5. **Verify** (next section) before reporting done.

## Verify — every change

```bash
pnpm check && pnpm build && pnpm check:runtime
```

`check:runtime` is mandatory after any change to routing, metadata, layouts, `proxy.ts`, headers or markup:
fix the source, never loosen `.htmlvalidate.json` or a check to pass. Changed a generator or `prepare`? The CI
`lifecycle` job runs them; locally — `.template/CLAUDE.md` → "Verify on a copy".

Browser-only (production server: `pnpm build && pnpm start`, DevTools open) — when you touch the area:

| Area                     | Check                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| CSP, `proxy.ts`, scripts | zero CSP violations on `/`, a page, a 404; the page hydrates (interactive)                        |
| Suspense / `loading.tsx` | temporary 3 s delay in the page: the skeleton is REPLACED, no CSP violation                       |
| TanStack prefetch        | no request for the prefetched query after hydration; no React #418/#423                           |
| Forms / Server Actions   | success toast; a submit within 3 s of load → UI success, server log `[scope] bot rejected`        |
| CSS layers, fonts        | `getComputedStyle(document.body).fontFamily` starts with the app font; `text-*`/`rounded-*` apply |
| Keyboard / a11y          | Tab from the top: skip link first, visible focus, Dialog traps and returns focus                  |

## Library docs — Context7 (MCP)

`query-docs` with these IDs (skip `resolve-library-id`); one topic per query, pick the installed version.

| Library          | Context7 ID                                                                 | Used in                                     |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| Next.js 16       | `/vercel/next.js`                                                           | `src/app/`, `proxy.ts`, `next.config.ts`    |
| next-intl 4      | `/amannn/next-intl`                                                         | `src/services/i18n/`, every page/layout     |
| TanStack Query 5 | `/tanstack/query`                                                           | `src/services/api/`, `src/lib/queryClient/` |
| React Hook Form  | `/react-hook-form/react-hook-form` · resolvers `/react-hook-form/resolvers` | `useZodForm`, `FormField`                   |
| Zod 4            | `/colinhacks/zod`                                                           | schemas, `src/configs/env/`                 |
| Tailwind CSS v4  | `/tailwindlabs/tailwindcss.com`                                             | `src/styles/`                               |
| shadcn/ui        | `/shadcn-ui/ui`                                                             | `src/components/UI/`                        |
| Vitest 5         | `/vitest-dev/vitest`                                                        | `*.test.ts(x)`, `vitest.config.ts`          |

Anything else (Radix, sonner, knip, html-validate) — resolve the ID first, then add it here.

## Docs map

| Folder                    | Doc                                                    |
| ------------------------- | ------------------------------------------------------ |
| `src/` top level          | `src/CLAUDE.md` (proxy.ts, instrumentation, types)     |
| `src/app/`                | `src/app/CLAUDE.md`                                    |
| `src/components/`         | `src/components/CLAUDE.md`                             |
| `src/configs/`            | `src/configs/CLAUDE.md`                                |
| `src/lib/` · `src/utils/` | `src/lib/CLAUDE.md`                                    |
| `src/hooks/`              | `src/hooks/CLAUDE.md`                                  |
| `src/services/`           | `src/services/CLAUDE.md`                               |
| `src/messages/`           | `src/messages/CLAUDE.md`                               |
| `src/styles/`             | `src/styles/CLAUDE.md`                                 |
| `.template/`              | `.template/CLAUDE.md`                                  |
| `public/`                 | section below (a doc inside `public/` would be served) |

Also: `SPEC.md` (requirements + what enforces each) · `.env.example` (every env var) · `README.md` (for humans).

## Settings — where each lives

| Kind                                                                | Place                                                                                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Differs per environment (URLs, CSP/TT toggles, proxy hops, secrets) | `.env.development` / `.env.production` (committed, no secrets) · `.env.local` (gitignored, wins) · full list `.env.example` |
| Validated at boot                                                   | `src/configs/env/` (Zod) — add every new var there                                                                          |
| Same everywhere (name, locales, brand colors, sitemap/robots)       | `src/configs/project.ts`                                                                                                    |
| Pages (sitemap, nav, `routes.*()`)                                  | `src/configs/routes.ts` → `staticPages`                                                                                     |
| Feature toggles                                                     | `src/configs/featureFlags.ts`                                                                                               |
| Security headers · CSP                                              | `next.config.ts` `headers()` · `src/proxy.ts`                                                                               |

`PORT` can't live in `.env` files (Next reads it from the shell first) — `pnpm dev -p 3100`.

**New env var** — all of: `.env.example` (documented) → Zod schema `src/configs/env/env.ts` → `src/types/env.d.ts` →
read by CLIENT code (`NEXT_PUBLIC_*`, literal access only) ? add it to the `check-public-env.mjs` list in the `build`
script → read in `src/proxy.ts` at module scope ? sanitize it there (it runs before validation).

## public/ — static files, served as-is

```
assets/img/          content images → next/image · img/previews/ → createMetadata({ preview }) (1200×630 webp)
assets/icons/        manifest PNGs (192, 512, maskable) → uncomment in src/app/manifest.ts, then display: 'standalone'
assets/fonts/        woff2 → next/font/local in src/styles/fonts.ts (never a CSS @font-face)
assets/video/        self-hosted video (poster + width/height)
```

`/assets/*` skips the proxy (no CSP nonce, no locale redirect, no rate limit); a missing file is a plain 404.
Third-party image hosts: `images.remotePatterns` (next.config.ts) AND `ALLOWED_IMG` (proxy.ts) — both.
Favicon and generated icons live in `src/app/` by file convention.

## Rules (everywhere)

- **Only `@/`** (= `src/`) inside `src/`; `@public/` for files from `public/`. Imports: external → `@/` → relative (ESLint sorts).
- **Named exports** (default only for Next file conventions). `import { type Foo }` for types. `type` over `interface`.
- **No hardcoded strings** — `useTranslations()` / `getTranslations()`, incl. `aria-label`, `sr-only`, Zod messages.
- **`logger`** from `@/utils/logger`, never `console.*`. Comments and commits in English.
- **npm scripts run in cmd, PowerShell and POSIX**: no `rm -rf`, `|| true`, `VAR=x cmd` — write a Node script in `.template/`.
- **React Compiler is on** — no `useMemo`/`useCallback` unless profiling demands it.
- **Add libraries when a feature needs them, not up front** — global client state (Zustand / Redux Toolkit), an HTTP
  client, analytics. The template stays vanilla (SPEC G7). knip fails on a dependency nothing imports — add it with
  its first consumer. `next`, `eslint-config-next`, `@next/env` are pinned EXACT and move together; vitest ↔ vite
  ↔ @vitejs/plugin-react too.
- **Supply chain**: `minimumReleaseAge` 3 days (lower the range floor, never exclude a package), audited
  `onlyBuiltDependencies`, SHA-pinned CI actions (`# vX` comment). No Dependabot — update by hand (`pnpm outdated`).

## Git

- **Never commit or push on your own.** Ask first, or do it when the user says so.
- **Version**: every commit bumps `package.json` semver (fix → patch, feat → minor, breaking → major) and ends
  the subject with it: `feat: short summary (v3.1.0)`. Conventional commits, lowercase subject (commitlint).
- **One branch: `main`** — locally and on GitHub. No backup/feature branches; every version is a commit.
  Push: `git fetch origin` → check it's a fast-forward → `git push origin main`. Never force-push `main`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

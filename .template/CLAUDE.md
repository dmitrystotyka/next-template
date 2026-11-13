# .template/ — template tooling (pure Node, runs in cmd, PowerShell, POSIX)

```
lib/project.mjs               shared helpers: ROOT, read/write, readI18n (from project.ts), formatFiles
checks/check-runtime.mjs      pnpm check:runtime — next start on a free port + smoke test, prints SPEC IDs
checks/check-public-env.mjs   end of pnpm build — set NEXT_PUBLIC_* values must be in the client bundle
checks/check-translations.mjs pnpm check:i18n — key parity, folders = i18n.locales, types from the default locale
setup/prepare.mjs             pnpm install hook — fresh copy → own project (name, title, v1.0.0, LICENSE) + husky
setup/page.mjs                pnpm page <name> ["Title"] [--nav] [--loading]
setup/component.mjs           pnpm component <Name> [--test] [--layout] [--client]
setup/api.mjs                 pnpm api <name> [--post]
setup/locale.mjs              pnpm locale add|remove <code>
setup/clean.mjs               pnpm clean [--cache]
```

## Rules

- Generators write code that passes `pnpm check` as-is (they run Prettier on what they touch). One exception: a
  `--layout` component is an unused file for knip until something imports it.
- Generators refuse instead of overwriting (existing route, message key, barrel export) and `fail()` when a marker
  or an expected snippet is missing — never a silent partial edit. They edit by markers/regex — keep the markers
  (`// @pages-end` in `src/configs/routes.ts`; `locales: [...]` in `project.ts`; the closing `};` of `localeFlags`).
  `locale` computes every edit in memory and writes only when all apply. Paths resolve from `ROOT`, not the cwd.
- Starter library code nothing imports yet → a knip `entry` (`knip.json`), never a folder-wide `ignore`.
- A new check belongs to `check-runtime.mjs` with its SPEC ID in brackets: `assert(cond, '[R1] …')`.
  Deliberate exceptions go into `ALLOWED_HTML_ISSUES` — exact (rule + value), never a whole rule.
- `check-runtime` uses `http://localhost:<port>` — not `127.0.0.1` (Next rewrites to localhost → 307 loops) and
  starts the server with `TRUSTED_PROXY_HOPS=1` (its rate-limit probe identifies itself via `x-forwarded-for`).

## Verify on a copy (SPEC G6 — the CI `lifecycle` job runs exactly this)

Changed a generator or `prepare`? Run the new-project day on a copy with its OWN `node_modules` (Turbopack rejects
a junction/symlinked `node_modules`), copied without `node_modules/`, `.next/`, `.git/`:

```bash
pnpm install --frozen-lockfile             # no .git, no CI → prepare renames the project
pnpm page pricing --nav && pnpm page blog "Blog" --loading
pnpm component Badge --test && pnpm api contact --post && pnpm locale add de
pnpm check && pnpm build && pnpm check:runtime
pnpm locale remove de && pnpm check
```

## Gotchas (tooling and config)

- **`check:runtime` passes/fails randomly; a fixed bug is still there.** A zombie `next-server` owns the port →
  the check uses its own free port; for manual runs find the owner (`lsof -nP -iTCP:3100 -sTCP:LISTEN` /
  `Get-NetTCPConnection -LocalPort 3100 -State Listen`).
- **307 to the same URL on every unprefixed page.** Started with `-H 127.0.0.1`; next-intl rewrites to localhost.
- **html-validate passes in a script, fails in the CLI.** `new HtmlValidate()` ignores `.htmlvalidate.json` →
  `new HtmlValidate(new FileSystemConfigLoader())` + filenames under the project root.
- **`next build`: "Symlink node_modules … out of the filesystem root".** A copy shares `node_modules` via a
  junction → its own `pnpm install`.
- **The test half of `pnpm typecheck` is instant and catches nothing.** `tsconfig.test.json` inherited the base
  `exclude` (`**/*.test.ts`) → it sets `"exclude": ["node_modules"]` itself.
- **Aliases don't resolve in `*.test.tsx`.** The app tsconfig excludes tests → explicit `resolve.alias` in
  `vitest.config.ts`. **A `server-only` module throws in a test** → mocked in `vitest.setup.ts`, keep such tests in Node.
- **Tests are slow, "jsdom was created 25 times".** jsdom only per file (`// @vitest-environment jsdom`).
- **vitest crashes after an upgrade.** vitest 5 ↔ vite 8 ↔ @vitejs/plugin-react 6 move together (explicit devDeps).
- **ESLint 10 fails on peers.** `eslint-config-next` plugins top out at ESLint 9 — stay on 9. Never re-register
  `eslint-plugin-import` ("Cannot redefine plugin import") — the Next config provides it.
- **`pnpm install` refuses a fresh release.** `minimumReleaseAge` (3 days) → lower the range floor, never exclude.
- **commitlint rejects the commit.** The subject starts lowercase.

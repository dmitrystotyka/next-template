# src/messages/

```
<locale>/translations.json   UI copy: shared.* (nav_*, skip_to_content, loading, notifications, …) · errors.*
<locale>/metadata.json       SEO, server-only: global {title, title_template, description} · one key per page
```

- The default locale (`projectConfig.i18n.defaultLocale`) is the source of truth; every other locale mirrors its
  keys exactly — `pnpm check:i18n` (pre-commit when these files change, and in `pnpm check`).
- Types derive from the default locale (`src/types/next-intl.ts`) — a missing key is a type error.
- `pnpm page` / `pnpm locale add` write here for you; non-default locales get the default text — translate it.
- Keys: `snake_case`; per page in `metadata.json`: `{ "title": "…", "description": "…" }` — `home` has no `title` on
  purpose (the home page shows the bare site title from `global`).
- Message folders = `i18n.locales` exactly, and `src/types/next-intl.ts` imports the default locale — `check:i18n`
  fails otherwise. A namespace file that fails to load throws in dev (raw keys would hide it).
- New namespace: `<locale>/<ns>.json` → `namespaces` in `src/services/i18n/constants.ts` → type in
  `src/types/next-intl.ts`. Server-only namespaces (like `metadata`) stay out of `clientNamespaces`.
- Not in `public/` — messages are not a public asset. Metadata routes without a locale segment
  (`manifest.ts`, `opengraph-image.tsx`) read the default locale explicitly.
- Zod messages, `aria-label`, `sr-only` text are messages too (SPEC I4) — schemas are factories taking them.

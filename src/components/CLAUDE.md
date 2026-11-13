# src/components/

```
UI/        shadcn/ui (new-york): Button · Input · FormField · Honeypot · Dialog · Skeleton · Sonner (Toaster) ·
           VisuallyHidden — by path: import { Button } from '@/components/UI/Button'
layouts/   SiteShell (skip link · Header · <main> · Footer) · Header · Footer · Container · LanguageSwitch · localeFlags
           ClientProviders · WebVitals · ErrorBoundary · ErrorState (every error.tsx) · NotFoundContent (both 404s)
           imported by full path: '@/components/layouts/Header'
icons/     LoadingIcon (required translated `label`) — by full path: '@/components/icons/LoadingIcon'
```

## New component — `pnpm component Name [--test] [--layout] [--client]`

- **Folder convention**: a module WITH a test (or siblings: schema, actions, data) is a folder named after it —
  `Button/{Button.tsx, Button.test.tsx, index.ts}`. `index.ts` ONLY re-exports (named, no `export *`, types via
  `export type`). Single-file modules stay flat (`layouts/Header.tsx`). Consumer imports don't change.
- Page-specific components live next to the route (`app/[locale]/(routes)/about/components/`). Promote to
  `src/components/` only when a **second** route needs it — never preemptively.
- shadcn: `pnpm dlx shadcn@latest add <name>` (config in `components.json`), then move it into the folder
  convention. If it writes CSS variables into `tailwind.css`, move the VALUES to `src/styles/vars.css` (tokens
  live there; `tailwind.css` only maps them).
- **No barrel files** (`UI/index.ts`, `hooks/index.ts`): a client component importing one name from a barrel ships
  every module behind it (Gotchas). Import each component by its path.

## Rules

- `cn()` from `@/lib/cn` to merge classes; semantic tokens only (`bg-primary`, `text-muted-foreground`) — no raw colors.
- **`'use client'` on every UI component that touches a client-only API** (hooks, `react-hook-form` `Controller`,
  Radix) — a Server Component importing it would otherwise pull the client-only API into the RSC build. Server Components by default everywhere else; `'use client'` only on the interactive leaf.
- `Button` defaults to `type="button"`, `Input` to `type="text"`; all sr-only text via `VisuallyHidden`.
- Forms: `useZodForm` (`@/hooks`) + `FormField` (label, error, aria wiring) + `Honeypot` with `useBotSignals` —
  the full pattern: `src/app/CLAUDE.md` → Forms.
- Toasts: `toast()` from `sonner` (Toaster is mounted in `ClientProviders`, labels translated).
- `ErrorBoundary` renders a translated `DefaultFallback`; pass `fallback` for an inline error state.
- `LanguageSwitch` (in the Header) uses `Link` from `@/services/i18n/navigation` with `locale`; screen readers get
  the native language name (`Intl.DisplayNames`). New locale → `pnpm locale add <code>` adds a placeholder flag in
  `localeFlags.tsx` — swap in the real 20×15 SVG.
- Header nav = registry entries with `nav` (`src/configs/routes.ts`) — don't hand-write links there.
- Page chrome is `SiteShell` — never a second `<main>` or skip link in a page.

## Tests

`// @vitest-environment jsdom` on the first line (tests default to Node) + React Testing Library.
Reference: `UI/Button/Button.test.tsx`, `UI/Input/Input.test.tsx`.

## Gotchas

- **Build fails: "Export Controller doesn't exist in target module … react-server".** A component using a
  client-only API had no `'use client'` and a Server Component imported it.
- **A text-only page ships react-hook-form, Radix Dialog and lucide** (241 KB gzip JS on the home page). `ErrorState`
  imported `Button` from the `@/components/UI` barrel; a client boundary bundles the whole barrel → barrels removed,
  imports by path.
- **Chrome autofills a field with `autocomplete="off"`** (real users trip the honeypot). Chrome treats `off` as
  "no type" and guesses → an unrecognized token (`"nope"`) suppresses it — what `<Honeypot>` renders.
- **Scroll jumps / body styles fight with a Radix Dialog open.** A hand-rolled scroll lock and Radix both own
  `document.body` → let Radix do it.

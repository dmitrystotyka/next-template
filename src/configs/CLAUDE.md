# src/configs/

```
project.ts       name · i18n (defaultLocale, locales, timeZone) · theme (brand colors outside CSS) · sitemap/robots
routes.ts        staticPages — THE page registry → routes.*(), sitemap.xml, Header nav, check:runtime
urls.ts          website + backend API URLs from env (trailing slashes trimmed)
metadata/        getRootMetadata() (root layout) · createMetadata({ path, title, description, preview, indexable }) ·
                 buildLocaleAlternates (the ONE hreflang rule)
env/             Zod validation of ALL runtime env vars (run from instrumentation.ts)
featureFlags.ts  featureFlags.isEnabled('experimental') — build-time flags, dead code dropped
```

## project.ts

`as const satisfies ProjectConfig` — `Locale` is derived from `i18n.locales` and must stay a literal union; don't
widen it. Locales change via `pnpm locale add|remove <code>`. `theme` colors are for surfaces CSS can't reach
(viewport `themeColor`, manifest, generated OG/icon images); in-app colors live in `src/styles/vars.css`.

## routes.ts — page registry

```ts
export const staticPages = [
  { key: 'home', path: '/', sitemap: { priority: 1, changeFrequency: 'weekly' }, nav: 'nav_home' },
  { key: 'about', path: '/about', sitemap: { priority: 0.6 } }, // no `nav` → not in the Header
  // @pages-end — `pnpm page` inserts above this line
] as const satisfies readonly StaticPage[];

routes.about(); // '/about' — typed, generated from the registry
```

Dynamic routes are added to `routes` by hand with typed params (`item: ({ id }) => \`/items/${id}\``).

## Metadata

- Always pass `path` — canonical + hreflang come from `buildLocaleAlternates` (the sitemap uses it too): default
  locale unprefixed, others `/<locale>`, `x-default` unprefixed.
- `title` base is `{ default, template: '%s | Site' }` from `metadata.global`; pages pass a plain string.
- Page `title`/`description` flow into `openGraph`/`twitter`; explicit overrides win.
- Root layout metadata has NO canonical/hreflang/`og:url` — a 404 renders only layout metadata (a page's
  `generateMetadata` is dropped when it throws `notFound()`), so those would point the 404 at `/`.
- `indexable: false` (previews, drafts) → noindex and NO canonical/hreflang/`og:url` (`alternates: null` — an
  omitted key would inherit the parent's).
- `og:locale` is `language_TERRITORY` (`toOgLocale`: `en` → `en_US`); share images carry an `alt` (the title).
- Share image: the generated `app/opengraph-image.tsx`, referenced explicitly in the base. Per page:
  `createMetadata({ preview: '/assets/img/previews/x.webp' })` (1200×630).

## env

New env var → `.env.example` (documented) + the Zod schema in `env/env.ts` + `src/types/env.d.ts`. Public vars are
read ONLY as literal `process.env.NEXT_PUBLIC_X`. `proxy.ts` sanitizes the values it reads at module scope itself.

## Gotchas

- **Share cards have no picture although `/opengraph-image` → 200.** A file-convention image is attached to its own
  segment only; a page returning its own `openGraph` object drops it → the base references `/opengraph-image`
  explicitly, `check:runtime` asserts `og:image` on every page (SPEC O3).
- **A 404 has the home page as canonical.** Root metadata carried URLs and the 404 inherited them → `getRootMetadata`.
- **A value set in env is `undefined` in the browser, every gate green.** Only literal `process.env.NEXT_PUBLIC_X` is
  inlined → `check-public-env` (end of `pnpm build`) fails when a listed set variable is absent from client chunks.

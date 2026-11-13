# src/app/ — routing, pages, API

```
layout.tsx                 <html lang>/<body>, global styles, font variable on <html>, JSON-LD (nonce), root metadata
global-error.tsx           root-layout failures — inline-styled English (no i18n/CSS there)
not-found.tsx              404 outside the locale tree (e.g. a missing /assets/x.png)
[locale]/layout.tsx        setRequestLocale + NextIntlClientProvider (client namespaces only) + ClientProviders
[locale]/error.tsx         errors in (routes) layout/pages no closer boundary caught → ErrorState with <main>
[locale]/not-found.tsx     styled 404 — renders OUTSIDE (routes), so it wraps itself in SiteShell
[locale]/(routes)/         layout = SiteShell (skip link · Header · <main> · Footer)
  page.tsx                 home — replace its content with yours
  error.tsx                page errors INSIDE the chrome (Header/Footer stay)
  [...rest]/page.tsx       any unmatched URL → notFound() → real 404
  <name>/                  your pages (`pnpm page <name>`)
api/health/                liveness probe (never rate-limited) + getHealth() for Server Components
api/revalidate/            on-demand ISR webhook (secret header, rate-limited)
api/[...slug]/             unknown /api/* → JSON 404 envelope
sitemap.ts robots.ts manifest.ts opengraph-image.tsx apple-icon.tsx favicon.ico   metadata routes
../proxy.ts                rate limit → CSP nonce → next-intl (documented in src/CLAUDE.md)
```

## New page — `pnpm page about "About us" [--nav] [--loading]`

Creates `(routes)/about/{page.tsx,metadata.ts}` (+ `loading.tsx`), adds `metadata.about` to every locale (+ the
`nav_about` label with `--nav`), registers it in `src/configs/routes.ts` (→ `routes.about()`, sitemap, Header nav,
`check:runtime`). By hand: those files + three edits — `metadata.json` (every locale), `translations.json`
(nav label), the registry.

```tsx
// metadata.ts — ALWAYS pass `path` (canonical + hreflang); plain string title → '%s | Site' applies
export async function generateAboutMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('metadata.about');
  return createMetadata({ title: t('title'), description: t('description'), path: '/about' });
}

// page.tsx — every layout/page/generateMetadata takes { params } and calls setRequestLocale (SPEC R4)
export { generateAboutMetadata as generateMetadata } from '@/app/[locale]/(routes)/about/metadata';

async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('metadata.about');
  return (
    <Container className="py-8">
      <h1>{t('title')}</h1>
    </Container>
  );
}
export default AboutPage;
```

- Every page lives in `(routes)` (one `<main>`, Header/Footer). A page without chrome (landing, print view) →
  its own route group with its own layout — still inside `[locale]`.
- `loading.tsx` **only at route level** (`--loading`), never at locale level — a locale-level Suspense streams a
  200 shell before `[...rest]` can `notFound()` (SPEC R1).
- **Cache Components stays off** (SPEC R1, `next.config.ts`). The code is ready for it — keep it that way:
  no route segment configs (`dynamic`, `revalidate`), request-time data (`new Date()`, `headers()`) behind
  `<Suspense>` + `await connection()`.
- Parallel routes: every `@slot` gets a `default.tsx` at every level that can match independently.
- New extensionless metadata route or file type (e.g. `app/feed.xml/route.ts` is fine — `.xml` is excluded; a
  `/feed` route is not) → add it to the `config.matcher` exclusions in `proxy.ts`, or the locale redirect turns it
  into a 404. `check:runtime` R3 lists the probed ones.
- A 404 renders only the LAYOUTS' metadata (a page's `generateMetadata` is dropped when it throws `notFound()`):
  that is why the root metadata carries no canonical/hreflang (`getRootMetadata`).

## Data in pages

Server data source = a plain `'server-only'` function (like `api/health/getHealth.ts`, or a `serverFetch` call with
`REVALIDATE`/`CACHE_TAGS` from `src/services/api/cache.ts`). Data that never changes on the client → just
`await getThings()` in the Server Component. Client cache + refetching → TanStack Query, prefetched on the server:

```tsx
// ThingsSection.tsx (Server Component) — render inside <Suspense fallback={<Skeleton …/>}>
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { connection } from 'next/server';

import { getQueryClient } from '@/lib/queryClient';
import { thingsQuery } from '@/services/api/queries';

export async function ThingsSection() {
  await connection(); // request-time data
  const qc = getQueryClient();
  void qc.prefetchQuery({ ...thingsQuery, queryFn: getThings }); // same key + the DATA fn — never a self-fetch
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ThingsList />
    </HydrationBoundary>
  );
}
// ThingsList.tsx ('use client'): const { data } = useSuspenseQuery(thingsQuery);
// never useQuery for a pending-dehydrated query (hydration error #418)
```

Reference: `healthQuery` (`src/services/api/queries.ts`) + `getHealth` — `{ ...healthQuery, queryFn: getHealth }`.

## Route Handlers — `pnpm api name [--post]`

Always `withApiHandler` (`@/lib/withApiHandler`): rate limit (`createApiRateLimit`) + `AppError` → JSON + incident
reporting; CORS only when you pass `cors` (same-origin by default) — then export `OPTIONS = withApiHandler.preflight(…)`.
`NextResponse` from `next/server`. Body → Zod `safeParse` → `ValidationError`. Data used by Server Components
lives in a plain function next to the route (`api/health/getHealth.ts`) — Server Components call it directly.
`/api/revalidate`: secret only in `x-revalidate-secret`; `paths` are app URLs without a locale, revalidated as literal
`/<locale><path>` for every locale (destination paths — next-intl rewrites the default locale). Unknown `/api/*` →
JSON 404 from `api/[...slug]/route.ts`.

## Forms → Server Actions

Co-locate with the feature: `(routes)/contact/components/ContactForm/{ContactForm.tsx, schema.ts, actions.ts}`.
Messages first: `translations.contact.{email, error_email, submit, sent}` in EVERY locale's `translations.json`.

```ts
// schema.ts — a FACTORY taking translated messages; the same schema runs on client and server
export const contactSchema = (m: { email: string }) => z.object({ email: z.email(m.email) });
export type ContactInput = z.infer<ReturnType<typeof contactSchema>>;

// actions.ts — starts with the 'use server' directive
export const submitContact = withServerAction(async (input: ContactInput & BotSignals) => {
  await assertSameOrigin(); // CSRF — BEFORE the limiter, so cross-site garbage can't burn a user's budget
  return limited(input);
});
const limited = withActionRateLimit(
  { limit: 5, windowSeconds: 60 },
  async ({ honeypot, elapsedMs, ...values }: ContactInput & BotSignals) => {
    if (isLikelyBot({ honeypot, elapsedMs }, 'contact')) return { ok: true }; // success-shaped: teach bots nothing
    const t = await getTranslations('translations.contact');
    const parsed = contactSchema({ email: t('error_email') }).safeParse(values);
    if (!parsed.success)
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input');
    // … real work; revalidatePath()/revalidateTag() after mutations
    return { ok: true };
  },
);

// ContactForm.tsx ('use client') — <Honeypot ref={bot.honeypotRef} /> inside the <form>
const t = useTranslations('translations.contact');
const bot = useBotSignals();
const form = useZodForm(contactSchema({ email: t('error_email') }), {
  defaultValues: { email: '' },
});
const onSubmit = form.handleSubmit((values) =>
  startTransition(async () => {
    const result = await withMinDelay(submitContact({ ...values, ...bot.collect() }));
    if (result.success) toast.success(t('sent'));
    else toast.error(result.error.message);
  }),
);
```

- Pipeline: `withServerAction` → `assertSameOrigin()` → `withActionRateLimit` → `isLikelyBot` → Zod → work.
- `withActionRateLimit` from `@/lib/rateLimit/rateLimitAction` (not the barrel — `proxy.ts` imports the barrel).
- Return `ServerActionResult<T>`; never throw to the client. A page with `<Honeypot>` needs its exact
  `autocomplete="nope"` allowance in `check-runtime` (`ALLOWED_HTML_ISSUES`, commented example there).

## PageSpeed (Core Web Vitals)

- **LCP**: the hero image is `next/image` with `priority` (+ `sizes`); never lazy-load it. Text LCP — keep it in the server-rendered HTML, not behind a client fetch.
- **CLS**: every image has `width`/`height` (or `fill` + a sized parent); skeletons reserve the final size; fonts via `next/font` (no layout shift, self-hosted — no Google `<link>`).
- **INP / JS**: Server Components by default, `'use client'` at the leaves; heavy client widgets via `lazyLoad` (`@/lib/lazyLoad`) or `next/dynamic`; third-party scripts only through `next/script` with `strategy="lazyOnload"`/`afterInteractive` — never in `<head>`.
- **Streaming**: slow data behind `<Suspense>` inside the page (route-level `loading.tsx` — `pnpm page x --loading`), never at locale level (SPEC R1).
- **Measure** on the deployed production build (PageSpeed Insights, mobile) and `pnpm analyze` for bundle size — never on `pnpm dev`. Field data: `WebVitals` → `NEXT_PUBLIC_VITALS_ENDPOINT`.

## Errors

`error.tsx` boundaries are one line: `<ErrorState error retry scope [landmark] />` (reports via `errorReporting`,
translated retry screen). Props are `{ error, retry }` — Next 16.3 `retry` re-fetches, `reset` only re-renders.
`global-error.tsx` stays inline-styled English (i18n and CSS are unavailable there). The catch-all
`[...rest]/page.tsx` only calls `notFound()`.

## Gotchas

- **404 pages answer HTTP 200.** A `loading.tsx` at LOCALE level streams a 200 shell before `[...rest]` can
  `notFound()` → route-level only. Same symptom with `cacheComponents` on (every route a partial prerender;
  measured on 16.3.8, no workaround) → it stays off.
- **`/manifest.webmanifest` (or an OG image) → 307 → 404 for non-default locales.** The proxy matcher caught an
  extensionless metadata route → exclude it in `config.matcher`. Prefixes need a boundary: `(?:api|_next)(?:/|$)`,
  or `/apiary` leaks out of the exclusion.
- **Production hydration breaks with the nonce CSP, dev works.** Nonce set only on the RESPONSE — Next reads it from
  the REQUEST to sign its own scripts → `new NextRequest(request, { headers })` into the intl middleware.
- **Dropdowns render at the top-left with `CSP_STRICT_STYLES=true`.** Radix/floating-ui position via inline
  `style` ATTRIBUTES → strict mode keeps `style-src-attr 'unsafe-inline'`, the nonce guards `style-src-elem`.
- **Trusted Types "report" turned the whole CSP off.** It flipped the MAIN header to Report-Only → TT report
  directives go in a SEPARATE Report-Only header; only `CSP_REPORT_ONLY=true` changes the main one.
- **`ERR_SSL_PROTOCOL_ERROR` on a local `pnpm start`.** `upgrade-insecure-requests` on an http page upgrades
  every same-origin fetch → sent only when the request is HTTPS (`x-forwarded-proto` included).
- **TLS errors in dev for one person (Safari).** HSTS on http://localhost pins the origin in Safari → production-only.
- **`/api/revalidate` → 403 with the right secret.** It was sent as `?secret=` — header only (query strings land
  in access logs). **…→ 200 but the page doesn't change:** a bare `revalidatePath('/blog')` matches nothing under
  `[locale]` → the route revalidates literal `/<locale>/blog` for every locale.
- **Suspense fallback never swaps under a strict CSP** (seen in a descendant project with `cacheComponents` on).
  React's swap script is inline; with the nonce on the request Next signs it — re-verify when enabling Cache
  Components.

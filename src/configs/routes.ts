import type { MetadataRoute } from 'next';

type StaticPage = {
  /** Key of the generated `routes.<key>()` helper. */
  key: string;
  /** Route-relative path without locale prefix (`/`, `/about`). */
  path: `/${string}`;
  /** Listed in sitemap.xml (and therefore covered by `pnpm check:runtime`). */
  sitemap?: {
    priority?: number;
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
  };
  /** Shown in the Header nav — key in `translations.shared`. */
  nav?: string;
};

/**
 * THE page registry — one entry per static page. The sitemap
 * (`app/sitemap.ts`), the Header nav and `routes.*()` all derive from it, and
 * `pnpm check:runtime` probes every sitemap page in every locale. `pnpm page`
 * appends entries here — keep the marker comment at the end of the list.
 */
export const staticPages = [
  {
    key: 'home',
    path: '/',
    sitemap: { priority: 1, changeFrequency: 'weekly' },
    nav: 'nav_home',
  },
  // @pages-end — `pnpm page` inserts above this line
] as const satisfies readonly StaticPage[];

type StaticRoutes = {
  [P in (typeof staticPages)[number] as P['key']]: () => P['path'];
};

const staticRoutes = Object.fromEntries(
  staticPages.map((page) => [page.key, () => page.path]),
) as StaticRoutes;

/**
 * Type-safe application routes.
 *
 * Static pages come from `staticPages`; dynamic routes are added by hand and
 * accept their params, so the compiler catches typos and missing params —
 * `routes.item({})` won't compile if `id` is required.
 *
 * @example
 * routes.home();               // '/'
 * routes.about();              // '/about' (after `pnpm page about`)
 * routes.item({ id: '42' });   // '/items/42'
 */
export const routes = {
  ...staticRoutes,
  // Dynamic route example (uncomment and adapt):
  // item: ({ id }: { id: string | number }) => `/items/${id}` as const,
} as const;

import { buildLocaleAlternates } from '@/configs/metadata/alternates';
import { projectConfig } from '@/configs/project';
import { staticPages } from '@/configs/routes';
import { urls } from '@/configs/urls';

import type { MetadataRoute } from 'next';

// Stamped once per server process (≈ per deploy), not per request — a
// `lastModified` that changes on every crawl carries no information.
const lastModified = new Date();

/**
 * Generates `sitemap.xml` from the page registry (`staticPages` in
 * src/configs/routes.ts) — register pages there (or via `pnpm page`), not here.
 *
 * hreflang alternates come from `buildLocaleAlternates` — the same rule the
 * page metadata uses, so the two can't drift.
 *
 * When `projectConfig.sitemap` is `false` (e.g. non-production),
 * an empty sitemap is returned to prevent indexing.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!projectConfig.sitemap) return [];

  return staticPages
    .filter((page) => 'sitemap' in page)
    .map((page) => ({
      url: page.path === '/' ? urls.website : `${urls.website}${page.path}`,
      lastModified,
      ...page.sitemap,
      alternates: { languages: buildLocaleAlternates(page.path) },
    }));
}

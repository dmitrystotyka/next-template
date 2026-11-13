import { getLocale, getTranslations } from 'next-intl/server';

import { buildLocaleAlternates } from '@/configs/metadata/alternates';
import { projectConfig } from '@/configs/project';
import { urls } from '@/configs/urls';

import type { Metadata } from 'next';

// urls.website already falls back to localhost — no extra guard needed here.
const METADATA_BASE = new URL(urls.website);

/** The generated share image (src/app/opengraph-image.tsx), absolute. */
const DEFAULT_PREVIEW = {
  url: `${urls.website}/opengraph-image`,
  width: 1200,
  height: 630,
} as const;

/** Open Graph wants `language_TERRITORY` (`en_US`, `ru_RU`), not a bare locale. */
export function toOgLocale(locale: string): string {
  const { language, region } = new Intl.Locale(locale).maximize();
  return region ? `${language}_${region}` : language;
}

/**
 * Build a full preview image URL from a path in `public/`.
 *
 * @example
 * previewImage('/assets/img/previews/about.webp')
 */
export function previewImage(path: string): string {
  return `${urls.website}${path}`;
}

/**
 * Base metadata for all pages.
 * All texts (title, the `%s | Site` title template, description) come from
 * the `metadata.global` namespace.
 *
 * `title` is a `{ default, template }` object: a page that passes a plain
 * string `title` to `createMetadata` gets the template applied by Next
 * ("Template Page | Next Template"); a page without one shows `default`.
 *
 * @param path Route-relative path (e.g. `/about`) used to build canonical
 *             + hreflang URLs. Defaults to `/` — override per page.
 */
/**
 * Root-layout metadata: the base WITHOUT page URLs (canonical, hreflang,
 * `og:url`). Pages add theirs through `createMetadata({ path })`; a 404
 * renders only the layouts' metadata, so anything URL-specific here would
 * point the noindex 404 at the home page.
 */
export async function getRootMetadata(): Promise<Metadata> {
  const { alternates: _alternates, ...base } = await getBaseMetadata();
  const openGraph = { ...base.openGraph } as NonNullable<Metadata['openGraph']> & {
    url?: unknown;
  };
  delete openGraph.url;
  return { ...base, openGraph };
}

export async function getBaseMetadata(path = '/'): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations('metadata.global'), getLocale()]);

  const title = t('title');
  const description = t('description');
  // The ONE hreflang rule also yields the canonical — no second copy of the
  // "default locale is unprefixed" logic to drift.
  const languages = buildLocaleAlternates(path);
  const canonical = languages[locale] ?? languages['x-default'];

  return {
    title: { default: title, template: t('title_template') },
    description,
    metadataBase: METADATA_BASE,

    alternates: {
      ...(canonical ? { canonical } : {}),
      languages,
    },

    // The generated `app/opengraph-image.tsx` is referenced EXPLICITLY: Next
    // attaches a file-convention image only to its own segment, and any page
    // that returns its own `openGraph`/`twitter` object (every page does, via
    // createMetadata) would silently drop it — share cards without a picture.
    // Per-page overrides go through the `preview` option of `createMetadata`.
    openGraph: {
      images: [{ ...DEFAULT_PREVIEW, alt: title }],
      type: 'website',
      ...(canonical ? { url: canonical } : {}),
      title,
      description,
      locale: toOgLocale(locale),
      siteName: projectConfig.name,
    },

    twitter: {
      card: 'summary_large_image',
      images: [{ url: DEFAULT_PREVIEW.url, alt: title }],
      title,
      description,
    },
  };
}

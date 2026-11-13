import { describe, expect, it, vi } from 'vitest';

import { createMetadata } from '@/configs/metadata/createMetadata';

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve((key: string) => {
      const messages: Record<string, string> = {
        title: 'Global Title',
        title_template: '%s | Global Title',
        description: 'Global Description',
      };
      return messages[key] ?? key;
    }),
  getLocale: () => Promise.resolve('en'),
}));

describe('createMetadata', () => {
  it('falls back to the global title/description everywhere', async () => {
    const meta = await createMetadata();
    // The template lives on the ROOT layout (getBaseMetadata); a page without
    // its own title opts out of it so the home page is not "Site | Site".
    expect(meta.title).toEqual({ absolute: 'Global Title' });
    expect(meta.openGraph?.title).toBe('Global Title');
    expect(meta.twitter?.title).toBe('Global Title');
  });

  it('carries the generated share image on every page (SPEC O3)', async () => {
    // A page-level openGraph object replaces the parent's — without an
    // explicit reference the app/opengraph-image.tsx picture is dropped.
    const meta = await createMetadata({ title: 'Page Title', path: '/page' });
    expect(JSON.stringify(meta.openGraph)).toContain('/opengraph-image');
    expect(JSON.stringify(meta.twitter)).toContain('/opengraph-image');
  });

  it('lets a per-page preview replace the default share image', async () => {
    const meta = await createMetadata({ preview: '/assets/img/previews/about.webp' });
    expect(JSON.stringify(meta.openGraph)).toContain('about.webp');
    expect(JSON.stringify(meta.openGraph)).not.toContain('/opengraph-image');
  });

  it('keeps a page title as a plain string so the parent template applies', async () => {
    const meta = await createMetadata({ title: 'Page Title', path: '/page' });
    expect(meta.title).toBe('Page Title');
  });

  it('builds the canonical from the shared hreflang rule', async () => {
    const meta = await createMetadata({ path: '/about' });
    expect(meta.alternates?.canonical).toBe(meta.alternates?.languages?.en);
    expect(meta.alternates?.languages?.['x-default']).toMatch(/\/about$/);
  });

  it('propagates a page title/description into og AND twitter', async () => {
    const meta = await createMetadata({ title: 'Page Title', description: 'Page Description' });
    expect(meta.openGraph?.title).toBe('Page Title');
    expect(meta.openGraph?.description).toBe('Page Description');
    expect(meta.twitter?.title).toBe('Page Title');
    expect(meta.twitter?.description).toBe('Page Description');
  });

  it('lets explicit openGraph overrides win over the propagated title', async () => {
    const meta = await createMetadata({
      title: 'Page Title',
      openGraph: { title: 'OG Special' },
    });
    expect(meta.openGraph?.title).toBe('OG Special');
    expect(meta.twitter?.title).toBe('Page Title');
  });

  it('merges alternates instead of replacing them', async () => {
    const meta = await createMetadata({
      path: '/about',
      alternates: { canonical: 'https://example.com/custom' },
    });
    expect(meta.alternates?.canonical).toBe('https://example.com/custom');
    // hreflang map from the base must survive a partial override
    expect(meta.alternates?.languages).toBeDefined();
  });

  it('resolves preview paths against the site URL and keeps absolute URLs', async () => {
    type Image = { url: string; alt?: string };
    const fromPath = await createMetadata({ preview: '/assets/img/p.webp' });
    expect((fromPath.openGraph?.images as Image[])[0]?.url).toMatch(
      /^http.*\/assets\/img\/p\.webp$/,
    );

    const absolute = await createMetadata({
      title: 'Page',
      preview: 'https://cdn.example.com/p.webp',
    });
    expect((absolute.openGraph?.images as Image[])[0]).toEqual({
      url: 'https://cdn.example.com/p.webp',
      alt: 'Page',
    });
    expect((absolute.twitter?.images as Image[])[0]?.url).toBe('https://cdn.example.com/p.webp');
  });

  it('gives the default share image an alt and an Open Graph locale (en_US)', async () => {
    const meta = await createMetadata();
    expect(JSON.stringify(meta.openGraph)).toContain('"alt":"Global Title"');
    expect(meta.openGraph).toMatchObject({ locale: 'en_US' });
  });

  it('drops canonical, hreflang and og:url for non-indexable pages (404)', async () => {
    const meta = await createMetadata({ title: 'Not found', indexable: false });
    expect(meta.alternates).toBeNull();
    expect(meta.openGraph).not.toHaveProperty('url');
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

type CatchAllPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Any unmatched URL inside a locale → `[locale]/not-found.tsx` with a real
 * 404. No `generateMetadata` here: a not-found response renders the
 * LAYOUTS' metadata (root: site title, no canonical) plus Next's automatic
 * `noindex` — page metadata of a route that throws `notFound()` is dropped.
 */
async function CatchAllPage({ params }: CatchAllPageProps): Promise<never> {
  const { locale } = await params;
  setRequestLocale(locale); // SPEC R4 — every page, even one that only 404s
  notFound();
}

export default CatchAllPage;

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Container } from '@/components/layouts/Container';
import { createMetadata } from '@/configs/metadata';

import type { Metadata } from 'next';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('metadata.home');

  // No `title`: the home page shows the bare site title (metadata.global).
  return createMetadata({ description: t('description'), path: '/' });
}

async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [tGlobal, tHome] = await Promise.all([
    getTranslations('metadata.global'),
    getTranslations('metadata.home'),
  ]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{tGlobal('title')}</h1>
      <p className="max-w-xl text-muted-foreground">{tHome('description')}</p>
    </Container>
  );
}

export default HomePage;

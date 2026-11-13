import { setRequestLocale } from 'next-intl/server';

import { SiteShell } from '@/components/layouts/SiteShell';

type RoutesLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

async function RoutesLayout({ children, params }: RoutesLayoutProps) {
  // Every layout/page in the tree must call this (next-intl requirement) —
  // see [locale]/layout.tsx.
  const { locale } = await params;
  setRequestLocale(locale);

  return <SiteShell>{children}</SiteShell>;
}

export default RoutesLayout;

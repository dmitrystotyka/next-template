import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider, type Messages } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

import { ClientProviders } from '@/components/layouts/ClientProviders';
import { clientNamespaces } from '@/services/i18n/constants';
import { routing } from '@/services/i18n/routing';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Required by next-intl for every layout/page/generateMetadata in the
  // tree (it makes the locale available without reading request state).
  // Note: pages are rendered per request anyway — the per-request CSP
  // nonce (proxy.ts) makes every matched route dynamic by design.
  setRequestLocale(locale);

  // Ship only client-side namespaces — server-only ones (metadata) would
  // otherwise be serialized into every page's RSC payload. (A namespace
  // that fails to load throws in dev — src/services/i18n/request.ts.)
  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    clientNamespaces.map((ns) => [ns, messages[ns]]),
  ) as Pick<Messages, (typeof clientNamespaces)[number]>;

  return (
    // `lang`/`dir` live on <html> in the root layout. When adding an RTL
    // locale (ar, he, fa), derive `dir` from the locale there.
    <NextIntlClientProvider locale={locale} messages={clientMessages}>
      <ClientProviders>{children}</ClientProviders>
    </NextIntlClientProvider>
  );
}

// A no-op while the nonce CSP makes every page dynamic; keeps static
// rendering possible for a project that drops per-request CSP.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default LocaleLayout;

import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/UI/Button';
import { routes } from '@/configs/routes';
import { Link } from '@/services/i18n/navigation';

type NotFoundContentProps = {
  /**
   * `false` outside the `[locale]` tree (root `app/not-found.tsx`): there is no
   * NextIntlClientProvider there, and next-intl's client `Link` would throw
   * "No intl context found" on hydration — a plain `next/link` to `/` instead.
   */
  localized?: boolean;
};

/** The 404 message + "Go home" — shared by both `not-found.tsx` files. */
export async function NotFoundContent({ localized = true }: NotFoundContentProps) {
  const t = await getTranslations('translations.errors');
  const HomeLink = localized ? Link : NextLink;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-5xl font-bold tracking-tight">404</h1>
      <p className="max-w-md text-muted-foreground">{t('page_not_found')}</p>
      <Button asChild>
        <HomeLink href={routes.home()}>{t('go_home')}</HomeLink>
      </Button>
    </div>
  );
}

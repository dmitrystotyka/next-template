'use client';

import { useLocale, useTranslations } from 'next-intl';

import { localeFlags } from '@/components/layouts/localeFlags';
import { VisuallyHidden } from '@/components/UI/VisuallyHidden';
import { cn } from '@/lib/cn';
import { locales } from '@/services/i18n/constants';
import { Link, usePathname } from '@/services/i18n/navigation';

// Module-level: the locale list is static config, no need to re-check per render.
const hasMultipleLocales = locales.length > 1;

/** "English", "Русский" — each language in its own words (no message keys to keep in sync). */
const nativeName = (locale: string): string =>
  new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;

type LanguageSwitchProps = {
  className?: string;
};

/**
 * Locale switcher — links to the SAME pathname in every other locale.
 * Mounted in the Header. Renders nothing for single-locale projects.
 * Screen readers hear the language name, not spelled-out letters ("E N").
 */
export function LanguageSwitch({ className }: LanguageSwitchProps) {
  const currentLocale = useLocale();
  const t = useTranslations('translations.shared');
  const pathname = usePathname();

  if (!hasMultipleLocales) return null;

  return (
    <nav aria-label={t('language')} className={cn('flex gap-2', className)}>
      {locales.map((locale) => {
        const active = locale === currentLocale;
        return (
          <Link
            href={pathname}
            locale={locale}
            hrefLang={locale}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-accent text-foreground ring-1 ring-border'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            key={locale}
            // 'true', not 'page': the link points at the SAME page in another
            // locale, so "current page" would be misleading — this marks the
            // currently selected option within the switcher.
            aria-current={active ? 'true' : undefined}
          >
            {localeFlags[locale]}
            <span aria-hidden="true">{locale.toUpperCase()}</span>
            <VisuallyHidden lang={locale}>{nativeName(locale)}</VisuallyHidden>
          </Link>
        );
      })}
    </nav>
  );
}

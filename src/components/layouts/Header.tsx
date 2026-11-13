import { getTranslations } from 'next-intl/server';

import { Container } from '@/components/layouts/Container';
import { LanguageSwitch } from '@/components/layouts/LanguageSwitch';
import { NavLink } from '@/components/layouts/NavLink';
import { projectConfig } from '@/configs/project';
import { routes, staticPages } from '@/configs/routes';
import { cn } from '@/lib/cn';
import { Link } from '@/services/i18n/navigation';

type HeaderProps = {
  className?: string;
};

/** Nav items = registry entries with a `nav` label (src/configs/routes.ts). */
const navPages = staticPages.filter((page) => 'nav' in page);

export async function Header({ className }: HeaderProps) {
  const t = await getTranslations('translations.shared');

  return (
    <header className={cn('border-b border-border', className)}>
      <Container>
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href={routes.home()} className="font-semibold tracking-tight">
            {projectConfig.name}
          </Link>

          <div className="flex items-center gap-6">
            <nav aria-label={t('nav_main')}>
              <ul className="flex items-center gap-6 text-sm text-muted-foreground">
                {navPages.map((page) => (
                  <li key={page.key}>
                    <NavLink href={page.path}>{t(page.nav)}</NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <LanguageSwitch />
          </div>
        </div>
      </Container>
    </header>
  );
}

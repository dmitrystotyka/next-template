import { describe, expect, it } from 'vitest';

import { buildLocaleAlternates } from '@/configs/metadata/alternates';
import { projectConfig } from '@/configs/project';

// urls.website falls back to http://localhost:3000 in tests (no env set).
const SITE = 'http://localhost:3000';

// Derived from projectConfig, so `pnpm locale add|remove` keeps this green.
const { locales, defaultLocale } = projectConfig.i18n;
const expected = (path: string) => ({
  ...Object.fromEntries(
    locales.map((l) => [l, `${SITE}${l === defaultLocale ? '' : `/${l}`}${path}`]),
  ),
  'x-default': `${SITE}${path}`,
});

describe('buildLocaleAlternates', () => {
  it('keeps the default locale unprefixed and prefixes the others', () => {
    expect(buildLocaleAlternates('/')).toEqual(expected(''));
    expect(buildLocaleAlternates('/')[defaultLocale]).toBe(SITE);
  });

  it('appends the route path after the locale prefix', () => {
    expect(buildLocaleAlternates('/about')).toEqual(expected('/about'));
  });
});

#!/usr/bin/env node
/**
 * New page in one command — every place a page touches:
 *
 *   pnpm page about                 → /about, title "About"
 *   pnpm page contact-us "Contact"  → custom title
 *   pnpm page pricing --nav         → also a Header nav link
 *   pnpm page blog --loading        → also loading.tsx (route-level skeleton, SPEC R1)
 *
 * Creates  src/app/[locale]/(routes)/<name>/{page.tsx,metadata.ts[,loading.tsx]}
 * Adds     metadata.<key> {title, description} to every locale's metadata.json
 *          (+ translations.shared.nav_<key> with --nav)
 * Registers the page in src/configs/routes.ts → routes.<camel>(), sitemap,
 *          Header nav, `pnpm check:runtime`.
 */

import { mkdirSync } from 'node:fs';

import {
  abs,
  exists,
  fail,
  formatFiles,
  read,
  readI18n,
  readJson,
  say,
  write,
  writeJson,
} from '../lib/project.mjs';

const args = process.argv.slice(2);
const nav = args.includes('--nav');
const loading = args.includes('--loading');
const [name, ...titleWords] = args.filter((a) => !a.startsWith('--'));

// Starts with a letter: the name becomes `<Pascal>Page` — `404Page` is not valid TS.
if (!name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
  fail(
    'Usage: pnpm page <name> ["Title"] [--nav] [--loading] — kebab-case, starts with a letter: about, contact-us',
  );
}

const { locales, defaultLocale } = readI18n();
// Reserved: route folders, locales, and every path the proxy matcher SKIPS
// (src/proxy.ts) — a page there would get no CSP nonce, no locale routing.
const RESERVED = [
  'api',
  'components',
  'assets',
  'icon',
  'sitemap',
  'robots',
  'manifest',
  ...locales,
];
const SKIPPED_PREFIXES = ['opengraph-image', 'twitter-image', 'apple-icon'];
if (
  RESERVED.includes(name) ||
  /^icon\d$/.test(name) ||
  SKIPPED_PREFIXES.some((p) => name.startsWith(p))
) {
  fail(`"${name}" is reserved (a route folder, a locale, or a path the proxy matcher skips)`);
}

const dir = `src/app/[locale]/(routes)/${name}`;
if (exists(dir)) fail(`${dir} already exists`);

const words = name.split('-');
const camel = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('');
const pascal = camel[0].toUpperCase() + camel.slice(1);
const key = words.join('_'); // message key
const title = titleWords.join(' ') || words.join(' ').replace(/^./, (c) => c.toUpperCase());

const routesFile = 'src/configs/routes.ts';
const routesSource = read(routesFile);
const MARKER = /^([ \t]*)\/\/ @pages-end/m;
if (new RegExp(`key: '${camel}'`).test(routesSource)) fail(`routes.${camel} already registered`);
if (!MARKER.test(routesSource)) fail(`${routesFile}: marker "// @pages-end" not found`);

// Never overwrite existing messages (`pnpm page global` would wipe the site title).
for (const locale of locales) {
  if (key in readJson(`src/messages/${locale}/metadata.json`)) {
    fail(
      `metadata.${key} already exists in src/messages/${locale}/metadata.json — pick another name`,
    );
  }
  const shared = readJson(`src/messages/${locale}/translations.json`).shared ?? {};
  if (nav && `nav_${key}` in shared)
    fail(`translations.shared.nav_${key} already exists (${locale})`);
}

// ---------- files -------------------------------------------------------------

mkdirSync(abs(dir), { recursive: true });

write(
  `${dir}/metadata.ts`,
  `import { getTranslations, setRequestLocale } from 'next-intl/server';

import { createMetadata } from '@/configs/metadata';

import type { Metadata } from 'next';

type MetadataProps = {
  params: Promise<{ locale: string }>;
};

export async function generate${pascal}Metadata({ params }: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('metadata.${key}');

  return createMetadata({
    title: t('title'),
    description: t('description'),
    path: '/${name}',
    // preview: '/assets/img/previews/${name}.webp',
  });
}
`,
);

write(
  `${dir}/page.tsx`,
  `import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Container } from '@/components/layouts/Container';

export { generate${pascal}Metadata as generateMetadata } from '@/app/[locale]/(routes)/${name}/metadata';

type ${pascal}PageProps = {
  params: Promise<{ locale: string }>;
};

async function ${pascal}Page({ params }: ${pascal}PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('metadata.${key}');

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
    </Container>
  );
}

export default ${pascal}Page;
`,
);

// ---------- messages (every locale; non-default copies await translation) ----

const touched = [`${dir}/page.tsx`, `${dir}/metadata.ts`, routesFile];

if (loading) {
  // Route level ONLY — a locale-level loading.tsx streams a 200 shell before
  // the [...rest] catch-all can 404 (SPEC R1). The skeleton reserves the
  // final layout (CLS): same Container, same heading size.
  write(
    `${dir}/loading.tsx`,
    `import { Container } from '@/components/layouts/Container';
import { Skeleton } from '@/components/UI/Skeleton';

function Loading() {
  return (
    <Container className="flex flex-col gap-4 py-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-full max-w-lg" />
    </Container>
  );
}

export default Loading;
`,
  );
  touched.push(`${dir}/loading.tsx`);
}

for (const locale of locales) {
  const metaFile = `src/messages/${locale}/metadata.json`;
  const meta = readJson(metaFile);
  meta[key] = { title, description: '' };
  writeJson(metaFile, meta);
  touched.push(metaFile);

  if (nav) {
    const trFile = `src/messages/${locale}/translations.json`;
    const tr = readJson(trFile);
    tr.shared = { ...tr.shared, [`nav_${key}`]: title };
    writeJson(trFile, tr);
    touched.push(trFile);
  }
}

// ---------- registry ------------------------------------------------------------

// Same regex for the check and the insert, whatever the marker's indentation.
const entry = (pad) => `${pad}{
${pad}  key: '${camel}',
${pad}  path: '/${name}',
${pad}  sitemap: { priority: 0.6, changeFrequency: 'monthly' },${nav ? `\n${pad}  nav: 'nav_${key}',` : ''}
${pad}},
${pad}// @pages-end`;
write(
  routesFile,
  routesSource.replace(MARKER, (_, pad) => entry(pad)),
);

await formatFiles(touched);

const others = locales.filter((l) => l !== defaultLocale);
console.log('');
say('✓', `${dir}/ — page.tsx + metadata.ts${loading ? ' + loading.tsx' : ''}`);
say('✓', `routes.${camel}() → /${name} (sitemap${nav ? ', Header nav' : ''})`);
say(
  '✓',
  `metadata.${key} in ${locales.join(', ')}${nav ? ` + translations.shared.nav_${key}` : ''}`,
);
console.log(`
    Fill:    "description" in src/messages/*/metadata.json${others.length ? `, translate ${others.join(', ')}` : ''}
    Link:    <Link href={routes.${camel}()}>…</Link>  (Link from @/services/i18n/navigation)
    Open:    pnpm dev → http://localhost:3000/${name}
`);

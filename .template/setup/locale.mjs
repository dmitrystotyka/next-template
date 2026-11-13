#!/usr/bin/env node
/**
 * Add or remove a locale everywhere it is declared:
 *
 *   pnpm locale add de       → src/messages/de/ (copied from the default locale),
 *                              projectConfig.i18n.locales, placeholder flag
 *   pnpm locale remove ru    → the reverse (the default locale can't be removed)
 *
 * Copied messages are the default locale's text — translate them. The
 * placeholder flag (localeFlags.tsx) shows the locale code; swap in a real SVG.
 * One locale left → routing switches to `localePrefix: 'never'` by itself.
 *
 * All-or-nothing: every edit is computed and checked in memory first; files
 * are touched only when all of them can be applied. Markers it relies on:
 * `locales: [...]` in src/configs/project.ts, the closing `};` of
 * `localeFlags` in src/components/layouts/localeFlags.tsx.
 */

import { cpSync, rmSync } from 'node:fs';

import { abs, exists, fail, formatFiles, read, readI18n, say, write } from '../lib/project.mjs';

const [action, code] = process.argv.slice(2);

if (!['add', 'remove'].includes(action) || !code || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(code)) {
  fail('Usage: pnpm locale add|remove <code> — e.g. de, pt-BR');
}

const { locales, defaultLocale } = readI18n();
const projectFile = 'src/configs/project.ts';
const flagsFile = 'src/components/layouts/localeFlags.tsx';
const LOCALES_RE = /locales:\s*\[[^\]]*\]/;
const FLAGS_END_RE = /\r?\n};\s*$/;

const projectSource = read(projectFile);
const flagsSource = read(flagsFile);
if (!LOCALES_RE.test(projectSource)) fail(`${projectFile}: "locales: [...]" not found`);

const withLocales = (list) =>
  projectSource.replace(LOCALES_RE, `locales: [${list.map((l) => `'${l}'`).join(', ')}]`);

// Object keys like pt-BR need quotes.
const flagKey = code.includes('-') ? `'${code}'` : code;

if (action === 'add') {
  if (locales.includes(code)) fail(`"${code}" is already a locale`);
  if (exists(`src/messages/${code}`))
    fail(`src/messages/${code}/ already exists — remove it first`);
  if (!FLAGS_END_RE.test(flagsSource)) fail(`${flagsFile}: closing "};" of localeFlags not found`);

  const nextFlags = flagsSource.replace(
    FLAGS_END_RE,
    `

  // Placeholder — replace with the real 20×15 flag SVG.
  ${flagKey}: (
    <svg
      width="20"
      height="15"
      viewBox="0 0 60 30"
      className="shrink-0 overflow-hidden rounded-sm"
      aria-hidden="true"
    >
      <rect width="60" height="30" fill="#e5e7eb" />
      <text x="30" y="21" fontSize="16" textAnchor="middle" fill="#374151">
        ${code.toUpperCase()}
      </text>
    </svg>
  ),
};
`,
  );

  // Everything checked — apply.
  cpSync(abs(`src/messages/${defaultLocale}`), abs(`src/messages/${code}`), { recursive: true });
  write(projectFile, withLocales([...locales, code]));
  write(flagsFile, nextFlags);

  await formatFiles([projectFile, flagsFile]);
  console.log('');
  say('✓', `src/messages/${code}/ — copied from ${defaultLocale}, translate it`);
  say('✓', `${projectFile} → locales: ${[...locales, code].join(', ')}`);
  say('✓', `${flagsFile} — placeholder flag for ${code}`);
  console.log('\n    Verify:  pnpm check:i18n && pnpm typecheck\n');
} else {
  if (!locales.includes(code)) fail(`"${code}" is not a locale (${locales.join(', ')})`);
  if (code === defaultLocale) fail(`"${code}" is the default locale — change defaultLocale first`);

  // Flag entry: optional comment lines + `  code: (` … its closing `  ),`.
  const start = flagsSource.search(
    new RegExp(`\\r?\\n(?:[ \\t]*//[^\\n]*\\n)*[ \\t]*${flagKey.replace(/[-']/g, '\\$&')}: \\(`),
  );
  const close = start === -1 ? -1 : flagsSource.indexOf('\n  ),', start);
  if (close === -1) {
    // A leftover key breaks `Record<Locale, ReactNode>` with an obscure type error.
    fail(`${flagsFile}: flag entry "${code}" not found — remove it by hand, then rerun`);
  }
  const nextFlags = flagsSource.slice(0, start) + flagsSource.slice(close + '\n  ),'.length);

  // Everything checked — apply.
  if (exists(`src/messages/${code}`)) rmSync(abs(`src/messages/${code}`), { recursive: true });
  write(projectFile, withLocales(locales.filter((l) => l !== code)));
  write(flagsFile, nextFlags);

  await formatFiles([projectFile, flagsFile]);
  console.log('');
  say('✓', `removed src/messages/${code}/, its flag, and it from ${projectFile}`);
  console.log('\n    Verify:  pnpm check:i18n && pnpm typecheck\n');
}

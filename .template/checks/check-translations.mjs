#!/usr/bin/env node
/**
 * Verify that all locales expose the same translation keys.
 *
 * - Reads every namespace from `src/messages/{locale}/*.json`.
 * - Compares key paths against the default locale (`i18n.defaultLocale` in
 *   `src/configs/project.ts`). Override with `--reference=<locale>`.
 * - Message folders must match `i18n.locales` exactly (no missing, no stale).
 * - `src/types/next-intl.ts` must type messages from the default locale.
 * - Also reports namespace files that exist only outside the reference.
 * - Exits with code 1 on any missing / extra keys or files.
 *
 * Usage: `pnpm check:i18n [--reference=en]`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readI18n } from '../lib/project.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const localesDir = path.join(root, 'src', 'messages');

/** Flatten nested object keys into dot-paths. */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const locales = fs
  .readdirSync(localesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

if (locales.length === 0) {
  console.error(`No locales found in ${localesDir}`);
  process.exit(1);
}

let hasErrors = false;
const config = readI18n(root);

for (const loc of config.locales.filter((l) => !locales.includes(l))) {
  console.error(`✖ ${loc} is in i18n.locales but src/messages/${loc}/ does not exist`);
  hasErrors = true;
}
for (const loc of locales.filter((l) => !config.locales.includes(l))) {
  console.error(
    `✖ src/messages/${loc}/ is not in i18n.locales — remove it (pnpm locale remove ${loc})`,
  );
  hasErrors = true;
}

const typesFile = path.join(root, 'src', 'types', 'next-intl.ts');
if (fs.existsSync(typesFile)) {
  const wrong = [...fs.readFileSync(typesFile, 'utf8').matchAll(/@\/messages\/([^/]+)\//g)]
    .map(([, l]) => l)
    .filter((l) => l !== config.defaultLocale);
  if (wrong.length) {
    console.error(
      `✖ src/types/next-intl.ts imports messages from "${wrong[0]}" — types must come from the default locale "${config.defaultLocale}"`,
    );
    hasErrors = true;
  }
}

const referenceArg = process.argv.find((a) => a.startsWith('--reference='))?.slice(12);
const reference = referenceArg ?? config.defaultLocale;
if (!locales.includes(reference)) {
  console.error(`Reference locale "${reference}" not found in ${localesDir}`);
  process.exit(1);
}
const others = locales.filter((l) => l !== reference);
const referenceDir = path.join(localesDir, reference);
const namespaces = fs
  .readdirSync(referenceDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => path.basename(f, '.json'));

for (const ns of namespaces) {
  const refPath = path.join(referenceDir, `${ns}.json`);
  const refKeys = new Set(flattenKeys(readJson(refPath)));

  for (const loc of others) {
    const locPath = path.join(localesDir, loc, `${ns}.json`);
    if (!fs.existsSync(locPath)) {
      console.error(`✖ ${loc}/${ns}.json — missing file (present in ${reference})`);
      hasErrors = true;
      continue;
    }

    const locKeys = new Set(flattenKeys(readJson(locPath)));
    const missing = [...refKeys].filter((k) => !locKeys.has(k));
    const extra = [...locKeys].filter((k) => !refKeys.has(k));

    if (missing.length) {
      console.error(`✖ ${loc}/${ns}.json — missing keys:\n    ${missing.join('\n    ')}`);
      hasErrors = true;
    }
    if (extra.length) {
      console.error(
        `✖ ${loc}/${ns}.json — extra keys not in ${reference}:\n    ${extra.join('\n    ')}`,
      );
      hasErrors = true;
    }
  }
}

// Files present in a non-reference locale only — a namespace nobody registered.
for (const loc of others) {
  const extraFiles = fs
    .readdirSync(path.join(localesDir, loc))
    .filter((f) => f.endsWith('.json') && !namespaces.includes(path.basename(f, '.json')));
  if (extraFiles.length) {
    console.error(
      `✖ ${loc}/ — namespace files missing from ${reference}: ${extraFiles.join(', ')}`,
    );
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\ni18n check failed.');
  process.exit(1);
}

console.log(`✓ i18n ok (${locales.length} locales, ${namespaces.length} namespaces)`);

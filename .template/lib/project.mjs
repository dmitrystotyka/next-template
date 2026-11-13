/**
 * Shared helpers for .template/ scripts (checks, setup, generators).
 * Pure Node — runs the same in cmd, PowerShell, Git Bash, macOS, Linux.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Project root, resolved from this file — works from any cwd (`node .template/…` in a subfolder). */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const abs = (rel) => join(ROOT, rel);
export const read = (rel) => readFileSync(abs(rel), 'utf8');
export const write = (rel, text) => writeFileSync(abs(rel), text);
export const exists = (rel) => existsSync(abs(rel));
export const readJson = (rel) => JSON.parse(read(rel));
export const writeJson = (rel, value) => write(rel, `${JSON.stringify(value, null, 2)}\n`);

export const say = (icon, text) => console.log(`  ${icon} ${text}`);
export const fail = (message) => {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
};

/** Locales from src/configs/project.ts — the one place they are declared. */
export function readI18n(root = ROOT) {
  const source = readFileSync(join(root, 'src/configs/project.ts'), 'utf8');
  const defaultLocale = /defaultLocale:\s*'([^']+)'/.exec(source)?.[1];
  const list = /locales:\s*\[([^\]]*)\]/.exec(source)?.[1] ?? '';
  const locales = [...list.matchAll(/'([^']+)'/g)].map(([, l]) => l);
  if (!defaultLocale || locales.length === 0) {
    throw new Error('src/configs/project.ts: could not read i18n.defaultLocale / i18n.locales');
  }
  return { defaultLocale, locales };
}

/** Run Prettier on the files a generator touched (output must pass `prettier --check`). */
export async function formatFiles(files) {
  const { execFileSync } = await import('node:child_process');
  const bin = join(ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  if (!existsSync(bin) || files.length === 0) return;
  execFileSync(process.execPath, [bin, '--write', '--log-level', 'warn', ...files], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

/**
 * `pnpm clean` — build output · `pnpm clean --cache` — also tool caches.
 * Node instead of `rm -rf`: npm scripts must run in cmd and PowerShell too.
 */

import { rmSync } from 'node:fs';

import { abs } from '../lib/project.mjs';

const BUILD = ['.next', 'coverage', '.vitest'];
// eslint, stylelint and tsc all cache under node_modules/.cache (package.json, tsconfig.json).
const CACHE = ['node_modules/.cache'];

const targets = process.argv.includes('--cache') ? [...BUILD, ...CACHE] : BUILD;
for (const target of targets) rmSync(abs(target), { recursive: true, force: true });
console.log(`  ✓ removed ${targets.join(', ')}`);

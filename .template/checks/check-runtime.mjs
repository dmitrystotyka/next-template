#!/usr/bin/env node
/**
 * Post-build runtime smoke test — the production checks that used to be done
 * by hand, as one cross-platform command (browser-only checks: CLAUDE.md → Verify).
 * Starts `next start` on a free port, probes it, stops it. Exit 1 on any
 * broken expectation. SPEC.md IDs in brackets.
 *
 * Usage (after `pnpm build`):  pnpm check:runtime
 *
 * Pages come from the server's own /sitemap.xml (src/configs/routes.ts →
 * `staticPages`), mapped onto the local origin — a new page is covered
 * without touching this file.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import process from 'node:process';

import nextEnv from '@next/env';
import { FileSystemConfigLoader, HtmlValidate } from 'html-validate';

import { readI18n, ROOT } from '../lib/project.mjs';

const failures = [];
let passed = 0;
const assert = (condition, message) => {
  if (condition) passed += 1;
  else failures.push(message);
};

if (!existsSync(join(ROOT, '.next', 'BUILD_ID'))) {
  console.error('✗ .next/BUILD_ID not found — run `pnpm build` first');
  process.exit(1);
}

// The same env `next build` saw — NEXT_PUBLIC_* values are inlined at build.
nextEnv.loadEnvConfig(ROOT, false, { info: () => {}, error: console.error });
const SITE_URL = (process.env.NEXT_PUBLIC_CLIENT_URL ?? '').replace(/\/$/, '');
assert(
  /^https?:\/\//.test(SITE_URL),
  `[O3] NEXT_PUBLIC_CLIENT_URL is absolute (got "${SITE_URL}")`,
);

// ---------- server ------------------------------------------------------------

const port = await new Promise((resolve, reject) => {
  const srv = createServer();
  srv.unref();
  srv.on('error', reject);
  srv.listen(0, '127.0.0.1', () => {
    const { port: p } = srv.address();
    srv.close(() => resolve(p));
  });
});
// `localhost`, not 127.0.0.1: Next resolves middleware rewrites against
// localhost, and a host mismatch turns every rewrite into a 307 to itself.
const ORIGIN = `http://localhost:${port}`;

const server = spawn(
  process.execPath,
  [join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port)],
  {
    cwd: ROOT,
    // One declared proxy hop: the A2 probe identifies itself via x-forwarded-for
    // (without a declared proxy the identity is unknown and limiting is skipped).
    env: { ...process.env, NODE_ENV: 'production', TRUSTED_PROXY_HOPS: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

const stop = () => {
  if (server.exitCode === null) server.kill();
};
process.on('exit', stop);

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) break;
    try {
      const res = await fetch(`${ORIGIN}/api/health`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.error(`✗ next start did not come up on ${ORIGIN}\n${serverLog}`);
  process.exit(1);
}

const get = (path, init = {}) => fetch(`${ORIGIN}${path}`, { redirect: 'manual', ...init });

// ---------- checks ------------------------------------------------------------

// Reads .htmlvalidate.json like the CLI (the bare constructor ignores it).
const htmlValidate = new HtmlValidate(new FileSystemConfigLoader());
const HTML_SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  // next.config.ts headers() — this server runs as production, so HSTS is on.
  'strict-transport-security': 'max-age=63072000',
  'cross-origin-opener-policy': 'same-origin-allow-popups',
  'cross-origin-resource-policy': 'same-origin',
};

/**
 * Deliberate, documented deviations — each one exact (rule + value), never a
 * whole rule. Example: a form honeypot's `autocomplete="nope"` (Chrome
 * autofills `off` by heuristics — src/components/CLAUDE.md → Gotchas):
 *   (m) => m.ruleId === 'valid-autocomplete' && m.message.startsWith('"nope"'),
 */
const ALLOWED_HTML_ISSUES = [];

// [I3] probe: the default locale's raw title template — a server-only message.
const { defaultLocale: probeLocale } = readI18n(ROOT);
const METADATA_PROBE = JSON.parse(
  readFileSync(join(ROOT, 'src', 'messages', probeLocale, 'metadata.json'), 'utf8'),
).global?.title_template;
if (typeof METADATA_PROBE !== 'string' || !METADATA_PROBE.includes('%s')) {
  console.error('✗ src/messages/<default>/metadata.json: global.title_template ("%s | …") missing');
  process.exit(1);
}

/** Every check that applies to a rendered HTML document. */
async function checkDocument(path, res, { expectLocale, status }) {
  const html = await res.text();
  assert(res.status === status, `[R1] ${path} → ${status} (got ${res.status})`);

  // [S1] CSP nonce contract: one nonce per response, on every <script>.
  const csp = res.headers.get('content-security-policy') ?? '';
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  assert(Boolean(nonce), `[S1] ${path}: CSP header carries a nonce`);
  assert(/'strict-dynamic'/.test(csp), `[S1] ${path}: CSP uses 'strict-dynamic'`);
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  const unsigned = scripts.filter((tag) => !tag.includes(`nonce="${nonce}"`));
  assert(
    scripts.length > 0 && unsigned.length === 0,
    `[S1] ${path}: all ${scripts.length} <script> tags carry the request nonce (${unsigned.length} without: ${unsigned[0] ?? ''})`,
  );

  for (const [name, value] of Object.entries(HTML_SECURITY_HEADERS)) {
    assert(res.headers.get(name) === value, `[S2] ${path}: ${name}: ${value}`);
  }
  assert(!res.headers.has('x-powered-by'), `[S2] ${path}: no X-Powered-By`);
  assert(
    /camera=\(\)/.test(res.headers.get('permissions-policy') ?? ''),
    `[S2] ${path}: Permissions-Policy denies powerful APIs`,
  );

  // A notFound() response is Next's own error shell (the styled 404 UI is
  // rendered from the RSC payload on the client) — no <html lang>, framework
  // ids. Only status, CSP, headers and noindex apply to it.
  if (status === 404) {
    assert(
      /<meta name="robots" content="noindex/.test(html),
      `[R1] ${path}: 404 carries robots noindex`,
    );
    assert(
      !/<link rel="canonical"/.test(html) && !/hrefLang=/.test(html),
      `[O3] ${path}: 404 has no canonical/hreflang (would contradict noindex)`,
    );
    return;
  }

  // [I2] <html lang> matches the URL's locale.
  const lang = /<html[^>]*\blang="([^"]+)"/.exec(html)?.[1];
  assert(lang === expectLocale, `[I2] ${path}: <html lang="${expectLocale}"> (got "${lang}")`);

  // [I3] Server-only `metadata` namespace never reaches the client payload:
  // its raw title template ("%s | Site") never appears rendered, so finding
  // it means the namespace was serialized.
  assert(
    !html.includes(METADATA_PROBE),
    `[I3] ${path}: metadata namespace not serialized to the client`,
  );

  {
    // [O3] Absolute SEO URLs from NEXT_PUBLIC_CLIENT_URL.
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? '';
    assert(
      canonical.startsWith(SITE_URL),
      `[O3] ${path}: canonical is absolute on ${SITE_URL} (got "${canonical}")`,
    );
    const hreflangs = [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)"/g)].map(
      ([, lang]) => lang,
    );
    for (const lang of [...locales, 'x-default']) {
      assert(hreflangs.includes(lang), `[O3] ${path}: hreflang "${lang}"`);
    }
    for (const prop of ['og:url', 'og:image']) {
      const value = new RegExp(`<meta property="${prop}" content="([^"]+)"`).exec(html)?.[1] ?? '';
      assert(/^https?:\/\//.test(value), `[O3] ${path}: ${prop} is absolute (got "${value}")`);
    }
    assert(/<title>[^<]+<\/title>/.test(html), `[O3] ${path}: has a <title>`);
  }

  // [O4] Valid HTML / basic a11y (html-validate, .htmlvalidate.json).
  const report = await htmlValidate.validateString(
    html,
    join(ROOT, `${path === '/' ? 'index' : path}.html`),
  );
  const messages = report.results
    .flatMap((r) => r.messages)
    .filter((m) => !ALLOWED_HTML_ISSUES.some((allowed) => allowed(m)));
  assert(
    messages.length === 0,
    `[O4] ${path}: valid HTML — ${messages
      .slice(0, 10)
      .map((m) => `${m.ruleId}: ${m.message}`)
      .join(' | ')}`,
  );
}

await waitForServer();

const { locales, defaultLocale } = readI18n(ROOT);
const localeOf = (path) => {
  const first = path.split('/')[1];
  return locales.includes(first) ? first : defaultLocale;
};

// The page list = the registry (src/configs/routes.ts → staticPages).
const registry = readFileSync(join(ROOT, 'src/configs/routes.ts'), 'utf8');
const pagesBlock = /export const staticPages = \[([\s\S]*?)\] as const/.exec(registry)?.[1] ?? '';
assert(pagesBlock !== '', '[O1] staticPages found in src/configs/routes.ts');
const entries = pagesBlock.split(/\n\s*\{/).filter((entry) => /path: '/.test(entry));
const registryPaths = entries.map((entry) => /path: '([^']+)'/.exec(entry)?.[1]).filter(Boolean);
const sitemapRegistryPaths = entries
  .filter((entry) => /sitemap:/.test(entry))
  .map((entry) => /path: '([^']+)'/.exec(entry)?.[1])
  .filter(Boolean);

// Same rule as src/configs/project.ts (`indexable`): this server runs as production.
const indexable =
  process.env.INDEXING !== 'off' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production');

// [O1] sitemap.xml lists every opted-in registry page — when this deploy is indexable.
const sitemapRes = await get('/sitemap.xml');
const sitemap = await sitemapRes.text();
assert(sitemapRes.status === 200, `[O1] /sitemap.xml → 200 (got ${sitemapRes.status})`);
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => {
  assert(loc.startsWith(SITE_URL), `[O3] sitemap <loc> on ${SITE_URL}: ${loc}`);
  return new URL(loc).pathname;
});
if (indexable) {
  const defaultPaths = new Set(sitemapPaths.filter((p) => !locales.includes(p.split('/')[1])));
  for (const path of sitemapRegistryPaths) {
    assert(defaultPaths.has(path), `[O1] registry page ${path} is in sitemap.xml`);
  }
} else {
  assert(
    sitemapPaths.length === 0,
    '[O1] non-indexable deploy (preview/INDEXING=off) → empty sitemap',
  );
  const robotsTxt = await (await get('/robots.txt')).text();
  assert(/Disallow: \/\s*$/m.test(robotsTxt), '[O1] non-indexable deploy → robots Disallow: /');
}

// Every registry page in every locale.
const pagePaths = new Set();
for (const path of registryPaths) {
  for (const locale of locales) {
    const prefix = locale === defaultLocale ? '' : `/${locale}`;
    pagePaths.add(`${prefix}${path === '/' ? '' : path}` || '/');
  }
}
for (const path of pagePaths) {
  await checkDocument(path, await get(path), { expectLocale: localeOf(path), status: 200 });
}

// [S1] A fresh nonce per request.
const nonceOf = async () =>
  /'nonce-([^']+)'/.exec((await get('/')).headers.get('content-security-policy') ?? '')?.[1];
const [n1, n2] = [await nonceOf(), await nonceOf()];
assert(n1 && n2 && n1 !== n2, '[S1] nonce differs between two requests');

// [R1] Real 404 status — flat and nested, every locale.
for (const locale of locales) {
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  for (const missing of ['/__missing__', '/__missing__/nested/deep']) {
    const path = `${prefix}${missing}`;
    await checkDocument(path, await get(path), { expectLocale: locale, status: 404 });
  }
}

// [R2] Default locale stays unprefixed: /<default> redirects to /.
const prefixed = await get(`/${defaultLocale}`);
assert(
  prefixed.status >= 300 && prefixed.status < 400,
  `[R2] /${defaultLocale} redirects to the unprefixed URL (got ${prefixed.status})`,
);

// [R3] Metadata routes answer directly — never bounced through the locale redirect.
const metadataRoutes = {
  '/robots.txt': 'text/plain',
  '/manifest.webmanifest': 'application/manifest+json',
  '/opengraph-image': 'image/png',
  '/apple-icon': 'image/png',
};
for (const [path, type] of Object.entries(metadataRoutes)) {
  const res = await get(path);
  assert(
    res.status === 200 && (res.headers.get('content-type') ?? '').startsWith(type),
    `[R3] ${path} → 200 ${type} (got ${res.status} ${res.headers.get('content-type')})`,
  );
}

// [A1] Health probe.
const health = await get('/api/health');
const healthBody = await health.json().catch(() => ({}));
assert(health.status === 200 && healthBody.status === 'ok', '[A1] /api/health → 200 {status:"ok"}');

// [A2] Rate limit on a real endpoint: /api/revalidate (30/min) limits BEFORE
// its secret check, so it works on a fresh clone without REVALIDATE_SECRET.
{
  let last;
  for (let i = 0; i < 40; i += 1) {
    last = await get('/api/revalidate?tag=__runtime_check__', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.7' },
    });
    if (last.status === 429) break;
  }
  assert(last.status === 429, `[A2] /api/revalidate reaches 429 under load (got ${last.status})`);
  assert(last.headers.has('retry-after'), '[A2] 429 carries Retry-After');
  assert(last.headers.has('x-ratelimit-limit'), '[A2] 429 carries X-RateLimit-*');
  const body = await last.json().catch(() => ({}));
  assert(body?.error?.code === 'RATE_LIMITED', '[A2] 429 body is the shared error envelope');
}

// [A5] Unknown API URL → the JSON error envelope with 404, not the HTML page.
const unknownApi = await get('/api/__missing__');
const unknownBody = await unknownApi.json().catch(() => ({}));
assert(
  unknownApi.status === 404 && unknownBody?.error?.code === 'NOT_FOUND',
  `[A5] /api/__missing__ → 404 JSON envelope (got ${unknownApi.status})`,
);

// [R1] A missing static asset (outside the proxy matcher) is a 404 too.
const missingAsset = await get('/assets/__missing__.png');
assert(
  missingAsset.status === 404,
  `[R1] /assets/__missing__.png → 404 (got ${missingAsset.status})`,
);

// [O5] No source maps shipped.
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [e.name],
  );
const maps = walk(join(ROOT, '.next', 'static')).filter((f) => f.endsWith('.map'));
assert(maps.length === 0, `[O5] no source maps in .next/static (found ${maps.length})`);

// ---------- report ------------------------------------------------------------

stop();

if (failures.length) {
  console.error(`\n✗ check-runtime: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(
  `✓ check-runtime: ${passed} checks passed (${pagePaths.size} pages × CSP/SEO/HTML, 404s, metadata routes, API)`,
);

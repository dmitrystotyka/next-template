import os from 'node:os';

import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Dev-only: allow opening the dev server from other devices on the LAN
 * (phone, another laptop) without `/_next/*` requests being blocked.
 * Computed from the machine's non-internal IPv4 addresses.
 */
function lanDevOrigins(): string[] {
  if (!isDev) return [];
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => (iface as os.NetworkInterfaceInfo).address);
}

/**
 * Powerful browser APIs, denied by default. Allow per feature with `self` or
 * an origin, e.g. `camera=(self)` for a video-call page. Only features
 * Chromium recognizes — an unknown one (`interest-cohort`, `battery`,
 * `document-domain`) logs "Unrecognized feature" on every page.
 * `publickey-credentials-get=()` blocks passkeys/WebAuthn — switch it to
 * `(self)` when you add passkey sign-in.
 */
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=(self)',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'idle-detection=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=(self)',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'serial=()',
  'sync-xhr=()',
  'usb=()',
  'web-share=(self)',
  'xr-spatial-tracking=()',
].join(', ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  ...(isDev ? { allowedDevOrigins: lanDevOrigins() } : {}),

  images: {
    // AVIF → WebP → original, by what the browser advertises. Size buckets
    // and `minimumCacheTTL` keep Next 16's defaults (4 h TTL, no 16px bucket).
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Add allowed image domains here:
      // { protocol: 'https', hostname: 'example.com', pathname: '/images/**' },
    ],
  },

  // React Compiler auto-memoizes components — no useMemo/useCallback by hand.
  // Requires `babel-plugin-react-compiler`. @see https://react.dev/learn/react-compiler
  reactCompiler: true,

  // Cache Components — OFF on purpose (verified on Next 16.3.8, SPEC.md R1,
  // src/app/CLAUDE.md → Gotchas). The code is ready for it (no segment configs, request-
  // time data behind <Suspense> + connection()), and the build passes with it
  // on, but every route then ships as a partial prerender: the streamed shell
  // commits HTTP 200 before the [...rest] catch-all can call notFound(), so
  // missing URLs answer 200 + noindex instead of a real 404. The per-request
  // CSP nonce also means documents can never be served from a static shell
  // anyway. Turn it on only if you accept soft 404s, or once Next can keep
  // the status of a blocking catch-all.
  // cacheComponents: true,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS in production ONLY: Safari honours it on http://localhost
          // and pins the origin — dev then collapses into TLS errors that
          // look like a CSS bug (Chromium exempts localhost, so it "only
          // breaks for one person on the team").
          // `includeSubDomains; preload` are opt-in: once the domain is on the
          // preload list EVERY subdomain is HTTPS-only for years.
          ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }]),
          // Own browsing context group; `allow-popups` keeps OAuth / payment
          // popups that report back via `window.opener` working. (Cross-origin
          // isolation for SharedArrayBuffer would need COOP `same-origin` +
          // COEP — audit every third-party resource first.)
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
          // CSP is set per request in src/proxy.ts (nonce).
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/services/i18n/request.ts');

// Bundle analysis: `pnpm analyze` → `next experimental-analyze` (Turbopack
// output, i.e. what actually ships). `@next/bundle-analyzer` is webpack-only
// and would measure a bundle this project never builds.
export default withNextIntl(nextConfig);

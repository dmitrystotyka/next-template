import { projectConfig } from '@/configs/project';
import { urls } from '@/configs/urls';

import type { MetadataRoute } from 'next';

/**
 * Generates `robots.txt` based on project configuration.
 *
 * When `projectConfig.robots` is `false` (e.g. non-production),
 * all crawlers are blocked to prevent indexing of staging/dev.
 *
 * To disable robots.txt generation, remove this file (`/robots.txt` is
 * already excluded from the proxy matcher).
 */
export default function robots(): MetadataRoute.Robots {
  if (!projectConfig.robots) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    // One rule group per user agent. `/_next/` must stay crawlable —
    // Googlebot needs the JS/CSS under it to render pages. `host` is a
    // Yandex-only directive that has been deprecated; omitted on purpose.
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    ...(projectConfig.sitemap && { sitemap: `${urls.website}/sitemap.xml` }),
  };
}

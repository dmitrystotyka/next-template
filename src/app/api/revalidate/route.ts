import { timingSafeEqual } from 'node:crypto';

import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { projectConfig } from '@/configs/project';
import { ForbiddenError, NotImplementedError, ValidationError } from '@/lib/errors';
import { createApiRateLimit } from '@/lib/rateLimit';
import { withApiHandler } from '@/lib/withApiHandler';

/**
 * On-demand ISR webhook — point your CMS/backend at it after a publish:
 *
 *   POST /api/revalidate?tag=posts            -H "x-revalidate-secret: …"
 *   POST /api/revalidate  body: { "tags": ["post:hello"], "paths": ["/blog/hello"] }
 *
 * Security model: the shared secret IS the authentication.
 * - Sent ONLY via the `x-revalidate-secret` header — never in the query
 *   string (query strings land in access logs, proxies and browser history).
 * - `REVALIDATE_SECRET` unset → 501, so a fresh clone can't be abused.
 * - Wrong secret → 403 with a constant message; constant-time comparison.
 * - Rate-limited like any other endpoint; the target list is capped.
 * Tags come from `CACHE_TAGS` (src/services/api/cache.ts) — keep the two
 * in sync when adding resources.
 *
 * Paths are app URLs without a locale (`/blog/hello`) and are revalidated
 * for EVERY locale as literal DESTINATION paths (`/en/blog/hello`,
 * `/ru/blog/hello`): next-intl rewrites the unprefixed default locale onto
 * `/<default>/…`, and Next matches literal paths against the destination.
 * Literal paths also sidestep route groups (`(routes)`), which a route
 * PATTERN (`/[locale]/…`, 'page') would have to spell out.
 */

const MAX_TARGETS = 50;

const pathSchema = z
  .string()
  .max(1000)
  .regex(/^\/(?!\/)/, 'Paths must be app-relative and start with "/"');

const bodySchema = z.object({
  tags: z.array(z.string().min(1).max(256)).max(MAX_TARGETS).default([]),
  paths: z.array(pathSchema).max(MAX_TARGETS).default([]),
});

async function readTargets(request: Request): Promise<z.infer<typeof bodySchema>> {
  const url = new URL(request.url);
  const query = { tags: url.searchParams.getAll('tag'), paths: url.searchParams.getAll('path') };

  // Query params win when present; otherwise a JSON body.
  const input: unknown =
    query.tags.length || query.paths.length ? query : await request.json().catch(() => ({}));

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ValidationError(issue?.message ?? 'Invalid body', issue?.path[0]?.toString());
  }
  return parsed.data;
}

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length leaks nothing useful here (the secret is ≥16 random chars), but
  // `timingSafeEqual` requires equal lengths, so guard it.
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `/blog` → `['/en/blog', '/ru/blog']`; `/` → `['/en', '/ru']`. */
function localizedPaths(path: string): string[] {
  const suffix = path === '/' ? '' : path.replace(/\/$/, '');
  return projectConfig.i18n.locales.map((locale) => `/${locale}${suffix}`);
}

export const POST = withApiHandler({
  rateLimit: createApiRateLimit({ limit: 30, windowSeconds: 60 }),
  handler: async (request) => {
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret) {
      throw new NotImplementedError('Revalidation is not configured');
    }

    if (!secretMatches(request.headers.get('x-revalidate-secret'), secret)) {
      // Same 403 body for missing and wrong — don't leak which it was.
      throw new ForbiddenError('Invalid revalidation secret');
    }

    const { tags, paths } = await readTargets(request);
    if (!tags.length && !paths.length) {
      throw new ValidationError('Provide at least one tag or path');
    }

    // 'max' (recommended): mark stale — the next visit gets the cached page
    // while it regenerates. Need it gone NOW? `{ expire: 0 }` (blocking miss).
    for (const tag of tags) revalidateTag(tag, 'max');
    for (const path of paths) localizedPaths(path).forEach((p) => revalidatePath(p));

    return NextResponse.json({
      revalidated: { tags, paths, locales: projectConfig.i18n.locales },
      at: new Date().toISOString(),
    });
  },
});

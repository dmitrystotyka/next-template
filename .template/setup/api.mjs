#!/usr/bin/env node
/**
 * New Route Handler wired through `withApiHandler` (CORS-ready, typed errors):
 *
 *   pnpm api status          → GET  /api/status  (no rate limit — like /api/health)
 *   pnpm api contact --post  → POST /api/contact (Zod body + per-IP rate limit)
 *
 * Creates src/app/api/<name>/route.ts. Server Components never fetch their
 * own /api routes — extract the data function and call it directly (see
 * src/app/api/health/getHealth.ts).
 */

import { mkdirSync } from 'node:fs';

import { abs, exists, fail, formatFiles, say, write } from '../lib/project.mjs';

const args = process.argv.slice(2);
const post = args.includes('--post');
const [name] = args.filter((a) => !a.startsWith('--'));

if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
  fail('Usage: pnpm api <name> [--post] — name in kebab-case: status, contact-us');
}

const dir = `src/app/api/${name}`;
if (exists(dir)) fail(`${dir} already exists`);
mkdirSync(abs(dir), { recursive: true });

const get = `import { NextResponse } from 'next/server';

import { withApiHandler } from '@/lib/withApiHandler';

/** GET /api/${name} */
export const GET = withApiHandler({
  handler: async () => {
    return NextResponse.json({ ok: true });
  },
});
`;

const postHandler = `import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ValidationError } from '@/lib/errors';
import { createApiRateLimit } from '@/lib/rateLimit';
import { withApiHandler } from '@/lib/withApiHandler';

const bodySchema = z.object({
  // Describe the request body here.
  message: z.string().min(1).max(500),
});

/** POST /api/${name} — Zod-validated body, per-IP rate limit (429 + X-RateLimit-*). */
export const POST = withApiHandler({
  rateLimit: createApiRateLimit({ limit: 20, windowSeconds: 60 }),
  handler: async (request) => {
    const body: unknown = await request.json().catch(() => {
      throw new ValidationError('Body must be valid JSON');
    });

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ValidationError(issue?.message ?? 'Invalid body', issue?.path.join('.'));
    }

    return NextResponse.json({ ok: true, data: parsed.data });
  },
});
`;

const file = `${dir}/route.ts`;
write(file, post ? postHandler : get);
await formatFiles([file]);

console.log('');
say('✓', `${file} — ${post ? 'POST' : 'GET'} /api/${name}`);
console.log(`
    Try:     curl ${post ? `-X POST -H "content-type: application/json" -d "{\\"message\\":\\"hi\\"}" ` : ''}localhost:3000/api/${name}
    Test:    co-locate route.test.ts (see src/app/api/revalidate/route.test.ts)
`);

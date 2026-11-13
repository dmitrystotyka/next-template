import 'server-only';

import { connection } from 'next/server';

const startedAt = Date.now();

export type HealthResponse = {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
};

/**
 * The health payload as a plain function — the single data source for
 * `GET /api/health` AND for any server-side prefetch of it (`{ ...healthQuery, queryFn: getHealth }`).
 * Server Components call it directly (no HTTP round-trip into the same
 * server, no dependency on `NEXT_PUBLIC_CLIENT_URL` matching the port);
 * the browser reaches it through the Route Handler.
 *
 * `await connection()` first: the payload is request-time data (clock,
 * uptime). Under Cache Components a bare `new Date()` during prerender is a
 * build error — `connection()` defers it to the request.
 */
export async function getHealth(): Promise<HealthResponse> {
  await connection();
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  };
}

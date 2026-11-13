export {
  checkIdentity,
  createApiRateLimit,
  createRateLimiter,
  rateLimitHeaders,
  rateLimitResponse,
  resolveClientIp,
} from '@/lib/rateLimit/rateLimit';
// `@public`: part of the module's API for app code, even while unused here
// (knip.json → "tags": ["-public"]).
export type {
  /** @public */
  IdentityCheck,
  RateLimitConfig,
  RateLimitResult,
  /** @public */
  RateLimitScope,
} from '@/lib/rateLimit/rateLimit';

// `withActionRateLimit` is deliberately NOT re-exported here: it imports
// `next/headers`, and this barrel is consumed by `proxy.ts`. Import it by
// its full path: `@/lib/rateLimit/rateLimitAction`.

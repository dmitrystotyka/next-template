/**
 * Feature flags configuration.
 *
 * Use feature flags to safely roll out new functionality,
 * run A/B tests, or toggle experimental features.
 *
 * Flags resolved from build-time constants (like `NODE_ENV`) are inlined by
 * the bundler, so code behind a `false` flag is dead-code-eliminated from
 * the production bundle.
 *
 * For production, consider integrating with a service like LaunchDarkly,
 * Statsig, Unleash, or PostHog for dynamic feature flags.
 *
 * @example
 * import { featureFlags } from '@/configs/featureFlags';
 *
 * if (featureFlags.isEnabled('newCheckout')) {
 *   return <NewCheckout />;
 * }
 */

type FeatureFlagKey = keyof typeof flags;

/** Add flags here — build-time constants are inlined and dead code is dropped. */
const flags = {
  /** Example: on in development only. Rename/replace it with your own flags. */
  experimental: process.env.NODE_ENV === 'development',
} as const satisfies Record<string, boolean>;

export const featureFlags = {
  /** Check if a feature flag is enabled. */
  isEnabled(flag: FeatureFlagKey): boolean {
    return flags[flag];
  },
};

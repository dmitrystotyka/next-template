'use client';

import { ErrorState } from '@/components/layouts/ErrorState';

/**
 * Page-level boundary for the `(routes)` group: a page that throws is
 * replaced INSIDE the group layout, so Header/Footer stay and the user can
 * navigate away. (An `error.tsx` never wraps its own segment's layout —
 * Header/Footer errors go to `[locale]/error.tsx`.)
 */
type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

function RouteError({ error, retry }: RouteErrorProps) {
  return <ErrorState error={error} retry={retry} scope="routes-segment" />;
}

export default RouteError;

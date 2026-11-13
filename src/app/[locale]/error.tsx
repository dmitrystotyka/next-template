'use client';

import { ErrorState } from '@/components/layouts/ErrorState';

/**
 * Locale-level boundary — errors thrown by the `(routes)` layout
 * (Header/Footer) and anything below it that no closer boundary caught. Renders without the site chrome, so it brings its own
 * `<main>`. Errors in `[locale]/layout.tsx` itself → `app/global-error.tsx`.
 */
type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

function ErrorPage({ error, retry }: ErrorPageProps) {
  return <ErrorState error={error} retry={retry} scope="locale-segment" landmark />;
}

export default ErrorPage;

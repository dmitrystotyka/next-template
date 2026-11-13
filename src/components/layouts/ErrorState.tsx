'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/components/UI/Button';
import { errorReporting } from '@/lib/errorReporting';

type ErrorStateProps = {
  error: Error & { digest?: string };
  /** Next 16.3+ `retry`: re-fetches and re-renders the segment (`reset` only re-renders). */
  retry: () => void;
  /** Reporting scope — which boundary caught it. */
  scope: string;
  /**
   * Render the `<main>` landmark too — for boundaries that replace the whole
   * page (the `[locale]` one renders without the `(routes)` layout).
   */
  landmark?: boolean;
};

/**
 * The ONE body of every `error.tsx` boundary: reports the error and shows a
 * translated retry screen. Requires `NextIntlClientProvider` above it —
 * `app/global-error.tsx` renders when the root layout itself failed, so it
 * keeps its own hardcoded, inline-styled markup instead.
 */
export function ErrorState({ error, retry, scope, landmark = false }: ErrorStateProps) {
  const t = useTranslations('translations.errors');

  useEffect(() => {
    errorReporting.captureException(error, { scope, digest: error.digest });
  }, [error, scope]);

  const content = (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{t('something_went_wrong')}</h1>

      {process.env.NODE_ENV === 'development' && error.message ? (
        <pre className="max-w-[600px] overflow-auto rounded-lg bg-destructive/10 px-4 py-3 text-sm break-words whitespace-pre-wrap text-destructive">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>
      ) : null}

      <Button onClick={() => retry()}>{t('try_again')}</Button>
    </div>
  );

  return landmark ? <main id="main-content">{content}</main> : content;
}

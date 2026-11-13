import { NotFoundContent } from '@/components/layouts/NotFoundContent';

/**
 * Root-level 404 — outside the `[locale]` layout (no NextIntlClientProvider,
 * so server translations only). Reached by URLs the proxy matcher skips that
 * no route serves, e.g. a missing `/assets/x.png`. Unknown `/api/*` URLs get
 * a JSON 404 from `app/api/[...slug]/route.ts` instead.
 */
function RootNotFoundPage() {
  return (
    <main id="main-content">
      <NotFoundContent localized={false} />
    </main>
  );
}

export default RootNotFoundPage;

import { NotFoundContent } from '@/components/layouts/NotFoundContent';
import { SiteShell } from '@/components/layouts/SiteShell';

/**
 * Styled 404 for the locale tree. It renders OUTSIDE the `(routes)` group
 * layout (the catch-all page throws before that layout applies), so it
 * wraps itself in the same `SiteShell`.
 */
function NotFoundPage() {
  return (
    <SiteShell>
      <NotFoundContent />
    </SiteShell>
  );
}

export default NotFoundPage;

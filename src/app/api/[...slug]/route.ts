import { NotFoundError } from '@/lib/errors';
import { withApiHandler } from '@/lib/withApiHandler';

/**
 * Unknown `/api/*` URL → the JSON error envelope with 404, not the HTML
 * not-found page (API clients parse `{ error: { code, message } }`).
 * Real routes always win over this catch-all.
 */
const notFound = withApiHandler({
  handler: () => {
    throw new NotFoundError('Not found');
  },
});

export {
  notFound as DELETE,
  notFound as GET,
  notFound as HEAD,
  notFound as OPTIONS,
  notFound as PATCH,
  notFound as POST,
  notFound as PUT,
};

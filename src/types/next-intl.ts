/**
 * Dynamic message types for next-intl.
 *
 * The message shape is derived from the default locale's JSON files in
 * `src/messages/en` (type-only imports — nothing lands in a bundle).
 *
 * Adding a namespace:
 * 1. Create `src/messages/{locale}/{namespace}.json`.
 * 2. Register it in `src/services/i18n/constants.ts` (`namespaces`).
 * 3. Import and spread it here so next-intl picks up autocomplete.
 *
 * The default locale (`en`) is the source of truth — every other locale
 * must mirror its keys. Changed `defaultLocale`? Point these imports at it;
 * `pnpm check:i18n` enforces both (key parity and the import locale).
 */
import type metadata from '@/messages/en/metadata.json';
import type translations from '@/messages/en/translations.json';

// Pulls next-intl into every TS program that includes this file (the test
// program may import nothing from it) — augmenting an unresolved module fails.
import type {} from 'next-intl';

type Messages = {
  translations: typeof translations;
  metadata: typeof metadata;
};

declare module 'next-intl' {
  interface AppConfig {
    Messages: Messages;
  }
}

import tanstackQuery from '@tanstack/eslint-plugin-query';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';

// Note: jsx-a11y is already registered by `eslint-config-next/core-web-vitals` —
// adding `jsxA11y.flatConfigs.recommended` causes a "Cannot redefine plugin" error.

const eslintConfig = [
  // core-web-vitals already includes the base `eslint-config-next` preset.
  ...nextCoreWebVitals,
  ...nextTypescript,
  ...tanstackQuery.configs['flat/recommended'],
  {
    // `import` plugin is registered by eslint-config-next — configuring
    // `import/*` rules below reuses that instance (re-registering our own
    // copy triggers "Cannot redefine plugin").
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      'react/display-name': 'off',

      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'warn',

      // Disallow bare `console.*` — force all logging through @/utils/logger
      // so we get prefixes, child scopes, and production silencing for free.
      'no-console': 'error',

      // Enforce stable import ordering: builtins → external → internal (@/) → relative.
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          pathGroups: [
            { pattern: '@/**', group: 'internal', position: 'before' },
            { pattern: '@public/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Barrel-file hygiene — importing a barrel from *inside* the same
      // feature folder creates circular dependencies and defeats tree-shaking
      // that only works across module boundaries. Prefer deep imports within
      // the feature, barrels only for external consumers.
      'import/no-self-import': 'error',
      'import/no-cycle': ['warn', { maxDepth: 3 }],
      // Namespace re-exports (`export *`) are the most common barrel footgun
      // — they drag every sibling module into the same chunk.
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'ExportAllDeclaration',
          message:
            'Prefer explicit named re-exports (`export { foo } from ...`) over `export * from ...`.',
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
    },
  },
  {
    // App code (SPEC C1): only the @/ alias, named exports. Next file
    // conventions are the exception below.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['./*', '../*'], message: 'Import via the @/ alias (src/…).' }] },
      ],
      'import/no-default-export': 'error',
    },
  },
  {
    files: [
      'src/app/**/{page,layout,loading,error,not-found,global-error,template,default,route,sitemap,robots,manifest,opengraph-image,twitter-image,icon,apple-icon}.{ts,tsx}',
      'src/services/i18n/request.ts',
    ],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    // Type-aware rules where a forgotten `await` silently loses an error:
    // Server Actions, route handlers, event handlers (`onSubmit={handleSubmit(…)}`).
    // Tests are outside tsconfig.json — they are type-checked by tsconfig.test.json.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    // Allow `console.*` in Node-only infra files where logger isn't available yet,
    // and in the logger implementation itself.
    files: [
      'next.config.ts',
      '.template/**/*.{js,mjs}',
      'lint-staged.config.js',
      'vitest.config.ts',
      'vitest.setup.ts',
      'src/utils/logger.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Test files legitimately use `<a href="...">` for asChild/slot tests and
    // sometimes trigger type-aware rules that don't apply to jsdom runs.
    files: ['**/*.{test,spec}.{ts,tsx}'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/refs': 'off',
    },
  },
  {
    // Config files conventionally `export default { ... }` or arrow functions —
    // forcing a named variable adds noise without catching anything useful.
    files: [
      '*.config.{js,cjs,mjs,ts}',
      'postcss.config.{js,cjs,mjs}',
      'stylelint.config.{js,cjs,mjs}',
      'next.config.{js,ts}',
      'tailwind.config.{js,ts}',
      'vitest.config.{js,ts}',
    ],
    rules: {
      'import/no-anonymous-default-export': 'off',
    },
  },
  eslintConfigPrettier,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'coverage/**',
      '.vercel/**',
      '.vitest/**',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;

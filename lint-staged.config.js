/**
 * Pre-commit: fix + check only the staged files (fast). The full gate set
 * runs on pre-push (`pnpm check`), in CI and on Vercel.
 * Function entries ignore the file list — they run once per commit.
 */
export default {
  '*.{ts,tsx,js,jsx,mjs,cjs}': [
    'eslint --fix --max-warnings 0 --no-warn-ignored',
    'prettier --write',
  ],
  '*.css': ['stylelint --fix --max-warnings 0', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  // Locale key parity — only when translation files change.
  'src/messages/**/*.json': () => 'node .template/checks/check-translations.mjs',
};

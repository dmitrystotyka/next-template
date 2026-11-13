/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // Allow Tailwind v4 directives
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'layer',
          'config',
          'screen',
          'utility',
          'theme',
          'source',
          'variant',
          'custom-variant',
          'plugin',
          'reference',
        ],
      },
    ],
    // Tailwind directives have their own preludes (`@apply bg-background`).
    'at-rule-prelude-no-invalid': [
      true,
      {
        ignoreAtRules: [
          'apply',
          'utility',
          'variant',
          'custom-variant',
          'source',
          'theme',
          'plugin',
          'reference',
        ],
      },
    ],
    // Tailwind v4 uses string @import ("tailwindcss", "tw-animate-css")
    'import-notation': null,

    // Allow global selectors and :global() in CSS Modules
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],

    // Relax for utility-first approach
    'no-descending-specificity': null,
    'declaration-empty-line-before': null,

    // Colors are tokens: the raw values live in src/styles/vars.css only.
    'color-no-hex': [
      true,
      { message: 'Use a token: var(--primary) / bg-primary (values in vars.css)' },
    ],
    'color-named': [
      'never',
      {
        ignore: ['inside-function'],
        message: 'Use a token: var(--foreground) (values in vars.css)',
      },
    ],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla'],
      { message: 'Colors are oklch tokens in vars.css — reference them with var(--…)' },
    ],
  },
  overrides: [
    {
      files: ['src/styles/vars.css'],
      rules: { 'color-no-hex': null, 'color-named': null, 'function-disallowed-list': null },
    },
  ],
  ignoreFiles: ['node_modules/**', '.next/**'],
};

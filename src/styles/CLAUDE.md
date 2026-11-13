# src/styles/ — Tailwind CSS v4

```
tailwind.css    @import 'tailwindcss' + 'tw-animate-css' · @theme inline (tokens → utilities) · @utility container · keyframes
vars.css        design tokens — COMPLETE oklch colors: --primary: oklch(62.32% 0.1879 259.8deg)
normalize.css   reset, wrapped in @layer base ON PURPOSE
index.css       page/layout wrappers (@layer components), prefers-reduced-motion — plain CSS, no preprocessor
fonts.ts        next/font → appFont, CSS variable --font-app
```

- **CSS-first config** — there is no `tailwind.config.ts`. New token: value in `vars.css`, mapping in `@theme inline`
  (`--color-brand: var(--brand)`) → `bg-brand`, `bg-brand/10` (opacity via color-mix works because tokens are full colors).
- **Never add unlayered element rules** — unlayered CSS beats every utility (`a { color: inherit }` would kill `text-*`).
- Semantic tokens in shared components (`bg-background`, `text-foreground`, `bg-primary`, `text-destructive`).
- Single light theme by design; `themeColor`/manifest colors come from `projectConfig.theme`.
- **Fonts**: the `appFont.variable` class sits on `<html>`, not `<body>` (Tailwind resolves `--font-sans` on `:root`).
  Never name a next/font variable after a Tailwind token. Self-hosted by next/font — no preconnect/`<link>` to
  Google. A brand font file → `next/font/local` (woff2 in `public/assets/fonts/`). Keep weights few;
  `display: 'optional'` = no layout shift.
- **Numbers and glyphs in fixed boxes** (step circles, badges, counters): `tabular-nums lining-nums` for equal digit
  widths, `text-box: trim-both cap alphabetic` for optical vertical centring, a `grid place-items-center` square box —
  never padding tuned by eye (italic/serif fonts sit off-centre in their line box).
- Class order is sorted by `prettier-plugin-tailwindcss` (also inside `cn`, `cva`, `clsx`).
- Stylelint (`stylelint.config.js`) knows the Tailwind at-rules and rejects raw colors (hex, named, rgb/hsl) outside
  `vars.css`; `pnpm lint` runs it with 0 warnings.

## Gotchas

- **Links inherit the parent color, inputs are square — the classes are in the DOM but do nothing.** The reset was
  imported UNLAYERED and beat every layer → `normalize.css` lives in `@layer base`.
- **The next/font family never applies.** The variable class sat on `<body>`; a custom property is substituted where
  it is DEFINED (`:root`), so the reference was invalid → `appFont.variable` on `<html>`.

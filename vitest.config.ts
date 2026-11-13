import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Explicit aliases mirror `paths` from tsconfig.json. We configure them directly
  // instead of `vite-tsconfig-paths` because the default tsconfig excludes test
  // files, which causes the plugin to skip applying aliases to `*.test.tsx`.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@public': fileURLToPath(new URL('./public', import.meta.url)),
    },
  },
  test: {
    // Node by default (fast: no DOM per file). Component and hook tests opt
    // into a DOM with `// @vitest-environment jsdom` on their first line.
    environment: 'node',
    globals: true,
    // Every test starts clean: spies restored, vi.stubEnv / vi.stubGlobal undone.
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/types/**',
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
      ],
      // Ratchet baseline — raise as coverage grows, never lower.
      // (v3.0.0 measured 57/61/45/58 — floors sit ~5pp below.)
      thresholds: {
        statements: 52,
        branches: 56,
        functions: 40,
        lines: 52,
        // The security-critical layer is held to a real bar.
        'src/lib/**': {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70,
        },
      },
    },
  },
});

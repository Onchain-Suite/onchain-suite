import react from '@vitejs/plugin-react';
import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Components may import plain CSS. Tests never need it processed, and the
  // app's Tailwind PostCSS config does not load under Vitest, so skip PostCSS.
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      '@/auth': path.resolve(__dirname, './src/features/core/auth'),
      '@/ui': path.resolve(__dirname, './src/shared/components/ui'),
      '@/components': path.resolve(__dirname, './src/shared/components'),
      '@/config': path.resolve(__dirname, './src/shared/config'),
      '@/hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@/types': path.resolve(__dirname, './src/shared/types'),
      '@/validations': path.resolve(__dirname, './src/shared/validations'),
      '@/features': path.resolve(__dirname, './src/features'),
      // Mirrors tsconfig's paths. Without it, a test that imports a value
      // (not just a type) from the website feature fails to resolve.
      '@/onchain-suite-website': path.resolve(
        __dirname,
        './src/features/website/onchain-suite'
      ),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Agent worktrees under .claude are full copies of the repo — without
    // this every suite runs twice, the second time against stale code.
    //
    // `reference/` is a vendored v2.7 snapshot (design prototypes, a handoff
    // web app) — not the product under `src/`. Its ~21 tests pull dev deps the
    // app doesn't carry (e.g. @testing-library/user-event), so left in they
    // fail to even load and — because the husky pre-push runs this suite — they
    // silently block every push. It is reference material, never run as a gate.
    exclude: [...configDefaults.exclude, '**/.claude/**', 'reference/**'],
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    // 15s, not vitest's 5s default. The suite runs sequentially (one worker,
    // no file parallelism) and mounts large real page trees in jsdom, so on a
    // loaded machine an individual test can drift past 5s - and because the
    // husky pre-push runs the whole suite, a different handful timed out on
    // each run and blocked the push. A single generous budget stabilises the
    // gate without hiding real hangs; the dashboard smoke suite already used
    // 15s per test for the same reason.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});

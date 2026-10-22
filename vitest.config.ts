import react from '@vitejs/plugin-react';
import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
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
  },
});

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
    exclude: [...configDefaults.exclude, '**/.claude/**'],
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
  },
});

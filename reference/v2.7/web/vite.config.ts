import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production build config. Route-level code-splitting is handled by React.lazy in the router;
// vendor is split out so the app shell stays small and screens load on demand.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // 5s is Vitest's default and it is the right budget for an idle machine. These tests
    // render lazy route chunks and type through userEvent, and with a dev server rebuilding
    // alongside, three of them were measured at 6.1s, 6.3s and 9.0s — passing tests failed on
    // the clock. The budget is for a loaded machine; a genuinely hung test still fails.
    testTimeout: 15_000,
    // The Worker is the only server-side code in the product and it carries the guarantee
    // the published page makes, so its tests run with everything else.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'worker/**/*.{test,spec}.ts'],
  },
});

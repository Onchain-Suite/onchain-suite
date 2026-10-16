import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* Builds the whole app into ONE self-contained .html — every script, style and SVG inlined,
   no code-splitting, no network requests. Opens straight from the filesystem (file://) so it
   can be emailed, dropped in Slack, or archived. Separate from the deploy build, which keeps
   code-splitting for performance.
   Run: npm run build:html  →  dist-html/onchainsuite.html */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  // Inline every asset regardless of size so nothing is left as a sibling file.
  build: {
    outDir: 'dist-html',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

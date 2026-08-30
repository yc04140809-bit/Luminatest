// Single-file build for sharing a playtest link.
// Everything (JS, CSS, images) is inlined into one index.html so the game
// can be hosted anywhere that serves a single page. The regular
// vite.config.ts (chunked + PWA) stays the production build.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-singlefile',
    // Inline every asset (the Kaos portraits) as data URIs.
    assetsInlineLimit: 10 * 1024 * 1024,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // One file: no manual chunks, dynamic imports folded in.
        inlineDynamicImports: true,
      },
    },
  },
});

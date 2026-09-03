// Single-file build for sharing a playtest link.
// Everything (JS, CSS, images) is inlined into one index.html so the game
// can be hosted anywhere that serves a single page. The regular
// vite.config.ts (chunked + PWA) stays the production build.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { execSync } from 'node:child_process';

/**
 * Build identity, so a QA REPORT can say which build it describes. Read
 * once at config time; a checkout without git simply reports 'unknown'
 * rather than failing the build.
 */
function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

const buildDefine = {
  __BUILD_COMMIT__: JSON.stringify(gitCommit()),
  __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
};

export default defineConfig({
  base: './',
  define: buildDefine,
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

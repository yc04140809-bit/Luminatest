// Single-file build for sharing a playtest link.
// Everything (JS, CSS, images) is inlined into one index.html so the game
// can be hosted anywhere that serves a single page. The regular
// vite.config.ts (chunked + PWA) stays the production build.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { execSync } from 'node:child_process';
import { basename } from 'node:path';
import { encodeReviewAssets, REVIEW_ASSETS } from './scripts/review-encode-assets.mjs';

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

/**
 * Review copies of the heavy artwork, for THIS BUILD ONLY.
 *
 * The single-file build inlines every asset as a data URI, and base64
 * adds a third again: with the delivered PNGs the artifact came to
 * 21.97 MB against a 16 MB publishing limit, so there was no artifact.
 *
 * The delivered files are not touched, not resized and not overwritten
 * — the game, the tests and the screenshots all use them exactly as
 * they arrived. What is aliased below is a separate re-encoded copy at
 * the same resolution, so that the composition, the crop and the
 * staging a reviewer is looking at are the real ones. The regular
 * build (vite.config.ts) has no idea this exists.
 */
function reviewAssetAliases(): { find: RegExp; replacement: string }[] {
  encodeReviewAssets();
  return REVIEW_ASSETS.map((asset) => ({
    // Matched against the import specifier and replaced whole: the
    // specifier is relative, so the pattern has to swallow the leading
    // ../.. as well as the tail that identifies the file.
    find: new RegExp(`^.*assets/arcana/${basename(asset.source).replace('.', '\\.')}$`),
    replacement: asset.out,
  }));
}

const buildDefine = {
  __BUILD_COMMIT__: JSON.stringify(gitCommit()),
  __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
};

export default defineConfig({
  base: './',
  define: buildDefine,
  plugins: [react(), viteSingleFile()],
  resolve: { alias: reviewAssetAliases() },
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

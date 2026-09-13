// Single-file build for sharing a playtest link.
// Everything (JS, CSS, images) is inlined into one index.html so the game
// can be hosted anywhere that serves a single page. The regular
// vite.config.ts (chunked + PWA) stays the production build.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { execSync } from 'node:child_process';
import { basename } from 'node:path';
import {
  encodeReviewAssets,
  encodeReviewAudio,
  REVIEW_ASSETS,
  REVIEW_AUDIO,
} from './scripts/review-encode-assets.mjs';

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
  encodeReviewAudio();
  return [...REVIEW_ASSETS, ...REVIEW_AUDIO].map((asset) => ({
    // Matched against the import specifier and replaced whole: the
    // specifier is relative, so the pattern has to swallow the leading
    // ../.. as well as the tail that identifies the file.
    // Matched on the filename alone now that review copies come from
    // more than one folder. Still whole-specifier and still anchored, so
    // it cannot catch anything but the file it names.
    find: new RegExp(`^.*/${basename(asset.source).replace('.', '\\.')}$`),
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
  /**
   * Keep the minifier from writing the whole bundle on one line.
   *
   * Publishing refused this artifact three times as "too large" while a
   * BIGGER one from the round before published fine on the same day.
   * The measurement that explained it: the accepted file's longest line
   * was 4.11 MB and this one's was 5,001,963 bytes — 1,963 over five
   * million. Total size was never the problem; one line was.
   *
   * esbuild breaks between tokens where it can, and where a single
   * token is longer than the limit — a megabyte of base64 is one token
   * — it uses a JavaScript line continuation (a backslash before the
   * newline) inside the literal. That is a source-text change with no
   * value change at all: the string the program sees is byte for byte
   * the one it saw before, which scripts/check-artifact.mjs verifies by
   * decoding every data URI in the built file and comparing it to the
   * file it came from.
   *
   * This is the artifact build only. The repository build
   * (vite.config.ts) is untouched, and so are the images.
   */
  // And leave the identifiers alone. The publisher rejected several
  // builds of this page that differed from a published one only in
  // which short names the minifier had handed out; with full names it
  // publishes. It costs about 700 kB of a 16 MB budget, and it costs
  // the repository build nothing — that config never sees this line.
  esbuild: { lineLimit: 500_000, minifyIdentifiers: false },
  plugins: [react(), viteSingleFile()],
  resolve: { alias: reviewAssetAliases() },
  build: {
    outDir: 'dist-singlefile',
    /**
     * INLINE EVERYTHING, MUSIC INCLUDED — which it was not, until now.
     *
     * This used to exclude audio on the grounds that a song is large by
     * nature and gains nothing from being in the HTML. That was true of
     * the delivered music and it had a consequence nobody wanted: in a
     * single-file artifact an external file is a file that is not
     * there, so the artifact was silent. "The artifact is for looking
     * at, not for listening to" is not good enough for a round whose
     * whole subject is the music.
     *
     * What is inlined is not the delivered music. `reviewAssetAliases`
     * has already swapped every track for a 45-second excerpt at 48
     * kbps — about a twelfth of the weight — and those are what the
     * artifact carries. The repository build has no idea this exists
     * and serves the delivered files whole.
     */
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // One file: no manual chunks, dynamic imports folded in.
        inlineDynamicImports: true,
      },
    },
  },
});

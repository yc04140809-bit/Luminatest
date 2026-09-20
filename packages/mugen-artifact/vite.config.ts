import { mugenAliases } from '../shared-aliases.mjs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
  plugins: [react()],
  resolve: { alias: mugenAliases() },
  server: {
    watch: {
      /**
       * THE ANDROID PROJECT IS OUTPUT, NOT SOURCE.
       *
       * `npx cap sync android` copies the whole 85 MB build into
       * `android/app/src/main/assets/public/`, and that path is inside
       * this Vite root — so without this the dev server watches every
       * copied asset and, the moment a sync lands, sends a FULL PAGE
       * RELOAD to every connected browser:
       *
       *   [vite] (client) page reload android/app/src/main/assets/public/index.html
       *
       * Which is invisible while you are developing by hand and is
       * carnage during an e2e run: three browsers reload mid-test and
       * the failures land wherever they happen to land. It was measured
       * that way — a suite run with a `cap sync` in the middle of it
       * lost three tests to it, in three different specs.
       */
      ignored: ['**/android/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React is needed for the very first paint; Phaser is not — it
          // is dynamically imported with the forest screen and lands in
          // its own chunk, keeping the initial download small.
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});

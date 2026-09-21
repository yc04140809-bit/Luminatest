import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mugenAliases } from '../shared-aliases.mjs';

/**
 * THE APP'S BUILD, which is the Artifact's build minus every
 * concession to a 16 MiB page.
 *
 * Nothing is inlined, nothing is downscaled, and the music is the
 * music as delivered. `base: './'` because a Capacitor WebView serves
 * from a local origin and an absolute path would not be found there.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: mugenAliases() },
  build: { outDir: 'dist' },
  server: {
    watch: {
      /**
       * `cap sync` COPIES THE WHOLE BUILD IN HERE, and this directory
       * is inside the Vite root. Without this the watcher sees ~85MB
       * of new files and reloads every connected browser — which,
       * when it happened in the Artifact, silently reloaded pages in
       * the middle of an e2e run and produced failures that had
       * nothing to do with the tests. Learned once; written down here
       * so it is not learned twice.
       */
      ignored: ['**/android/**'],
    },
  },
});

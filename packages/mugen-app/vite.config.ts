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
});

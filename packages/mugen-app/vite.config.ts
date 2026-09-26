import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { mugenAliases } from '../shared-aliases.mjs';

const DEV_DIR = fileURLToPath(new URL('./src/dev/', import.meta.url));
const DEBUG_STUB = '\0mugen-debug-tools-stub';

/**
 * A RELEASE BUILD NEVER SEES src/dev/ AT ALL.
 *
 * The debug tools are only ever reached behind a compile-time check, so
 * their code is dropped from a release bundle anyway — but not their
 * pictures: Vite emits every image a module imports as soon as it loads
 * that module, before dead code is removed, so the preview's cut-in
 * samples (Levi, Aria) were shipped as files nothing could show. Here
 * every import of src/dev/ in a release build is answered with an empty
 * module instead, so nothing under it is ever loaded, and nothing it
 * imports is ever emitted. `npm run check:release` checks both.
 */
function withoutDebugTools(): Plugin {
  return {
    name: 'mugen-without-debug-tools',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || source === DEBUG_STUB) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved && resolved.id.startsWith(DEV_DIR) ? DEBUG_STUB : null;
    },
    load(id) {
      // Any name asked of it is a property of `{}`: only reached in code
      // that a release build never runs.
      return id === DEBUG_STUB ? { code: 'export default {};', syntheticNamedExports: true } : null;
    },
  };
}

/**
 * THE APP'S BUILD, which is the Artifact's build minus every
 * concession to a 16 MiB page.
 *
 * Nothing is inlined, nothing is downscaled, and the music is the
 * music as delivered. `base: './'` because a Capacitor WebView serves
 * from a local origin and an absolute path would not be found there.
 */
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const debugTools = command === 'serve' || env.VITE_MUGEN_DEBUG_TOOLS === '1';
  return {
    base: './',
    plugins: debugTools ? [react()] : [react(), withoutDebugTools()],
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
  };
});

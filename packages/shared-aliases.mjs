// WHERE THE SHARED CORE ACTUALLY IS, for every bundler in the workspace.
//
// One list, imported by the Artifact's two Vite configs and by the
// App's — because an alias table that exists in three places is a
// table that will disagree in three places. The TypeScript side reads
// the same mapping from packages/tsconfig.paths.json.
//
// AN ARRAY, NOT AN OBJECT, and that is not a style choice. The
// Artifact's single-file build already has an alias list of its own —
// one entry per artwork, pointing at a downscaled review copy — and it
// is an array. Spreading an array into an object literal turns it into
// `{0: …, 1: …}`, which Vite reads as an alias whose name is "0": the
// review copies stop being found and a 15 MB artifact quietly becomes
// a 112 MB one. It did, once. Both lists are arrays now so they can
// only ever be concatenated.
//
// ORDER MATTERS within the array: Vite takes the first entry that
// matches, so `@mugen/assets/files` has to come before `@mugen/assets`
// or every file import would resolve to the manifest.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGES = dirname(fileURLToPath(import.meta.url));

export function mugenAliases() {
  return [
    { find: '@mugen/core', replacement: resolve(PACKAGES, 'mugen-core/core') },
    { find: '@mugen/game', replacement: resolve(PACKAGES, 'mugen-core/game') },
    { find: '@mugen/content', replacement: resolve(PACKAGES, 'mugen-core/content') },
    { find: '@mugen/assets/files', replacement: resolve(PACKAGES, 'mugen-assets/files') },
    { find: '@mugen/assets', replacement: resolve(PACKAGES, 'mugen-assets/src/manifest.ts') },
  ];
}

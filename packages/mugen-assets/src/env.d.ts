/// <reference types="vite/client" />

// WHAT AN IMAGE IMPORT IS, for every package that reads this manifest.
//
// It used to be enough for the Artifact's own `src/vite-env.d.ts` to
// say this, because the manifest lived inside that project. It does
// not any more: the assets are their own package now and are compiled
// by whoever depends on them, so the declaration travels with the
// files rather than with one of the apps.

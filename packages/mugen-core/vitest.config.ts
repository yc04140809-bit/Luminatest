// THE SHARED CORE'S OWN TEST RUN.
//
// These tests moved here with the code they test — 1,180 of them — and
// they are the reason the core can be shared at all: the Artifact and
// the App both depend on this package, so the guarantee that it still
// works has to live here rather than in either of them.
//
// It reads the same alias table the bundlers do, because a test that
// resolves `@mugen/assets` differently from the build is a test of
// something the player will never run.
import { defineConfig } from 'vitest/config';
import { mugenAliases } from '../shared-aliases.mjs';

export default defineConfig({
  resolve: { alias: mugenAliases() },
  test: {
    include: ['{core,game,content}/**/*.test.ts'],
  },
});

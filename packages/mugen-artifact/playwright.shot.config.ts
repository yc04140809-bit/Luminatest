// The config for e2e/battleShot.ts — see the header there.
//
// A config of its own rather than a flag, because the shots want
// settings the suite must not have: one worker (so two screens are
// never photographed while competing for the machine) and no retries
// (a retry would silently overwrite the picture being looked at).
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './e2e',
  testMatch: '**/battleShot.ts',
  workers: 1,
  retries: 0,
});

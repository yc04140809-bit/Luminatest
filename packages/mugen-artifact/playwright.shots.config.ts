// The seven-screen camera (e2e/landscapeShots.ts), run on the same
// browser and viewport as the suite. Separate config so it never runs
// as part of a normal test run: it asserts nothing, it photographs.
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './e2e',
  testMatch: '**/landscapeShots.ts',
  workers: 1,
  retries: 0,
});

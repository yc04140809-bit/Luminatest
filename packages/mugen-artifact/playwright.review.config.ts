// The review package runs on the same browser and the same viewport the
// suite uses, so the pictures are the pictures the tests were looking at.
// It is a separate config only so the capture never runs as part of a
// normal test run.
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './e2e',
  testMatch: '**/reviewCapture.ts',
  // One shot at a time: the capture writes files and must not race itself.
  workers: 1,
  retries: 0,
});

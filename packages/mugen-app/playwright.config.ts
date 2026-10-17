import { defineConfig } from '@playwright/test';

/**
 * The App Alpha's own suite.
 *
 * A different port from the Artifact's on purpose: the two dev servers
 * are expected to be up at the same time while both are being worked
 * on, and a shared port would mean whichever started last silently
 * tested the other one's build.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 844, height: 390 },
    reducedMotion: 'reduce',
    launchOptions: { executablePath: '/opt/pw-browsers/chromium' },
  },
});

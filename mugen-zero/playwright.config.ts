import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
    // Screens fade and slide in by 6px on entry. Under load Playwright
    // sees that as "element is not stable" and burns a whole timeout
    // waiting, which made unrelated tests flake. The app already honours
    // prefers-reduced-motion, so ask for it: the suite tests the same
    // behaviour, deterministically.
    //
    // This line alone does not do it. In this environment the runner's
    // page fixture does not deliver the preference to the page —
    // matchMedia reads false inside it — so e2e/fixtures.ts asks again
    // on the page, and every spec imports `test` from there. Keep both:
    // this is the intent, that is the one that lands.
    reducedMotion: 'reduce',
    browserName: 'chromium',
    // The sandbox pre-installs Chromium here; do not download browsers.
    launchOptions: { executablePath: '/opt/pw-browsers/chromium' },
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});

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
    // Every test starts at the title, as before 「また、ここで。」 was put in front of it (2026-10-30 タスクC,
    // ui/themeIntro.tsx `themeIntroSkipped`, dev server only). Its own tests (e2e/themeIntro.spec.ts) clear this.
    // Likewise a rest goes straight on, without the clock (2026-10-31 タスクH, ui/timePass `timePassOff`);
    // its own tests (e2e/timePass.spec.ts) keep the clock.
    storageState: {
      cookies: [
        { name: 'mugen_dev_theme_intro', value: 'off', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
        { name: 'mugen_dev_time_pass', value: 'off', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
      ],
      origins: [],
    },
  },
});

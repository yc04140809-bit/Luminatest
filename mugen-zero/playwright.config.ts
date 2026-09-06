import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // One fewer than the machine has cores, so the dev server that is
  // serving all of them keeps one. Since the battle tempo retune a
  // single test may play a twenty-four exchange fight in real time, and
  // four of those competing for four cores is how a fight that takes
  // ninety seconds starts taking four minutes.
  workers: 3,
  // Raised from 60s with the battle tempo retune. A story fight is now
  // about ninety seconds of play BY DESIGN — twenty-four exchanges
  // rather than three — and a test that plays one from the title screen
  // to the four answers cannot finish inside a timeout shorter than the
  // fight. Alone such a run takes about eleven seconds; four of them at
  // once on a loaded machine take a great deal longer, and the number
  // below is headroom for that rather than patience with a hang. This
  // is the fight getting longer, not an assertion getting weaker.
  timeout: 240_000,
  use: {
    baseURL: 'http://localhost:5173',
    // MUGEN ZERO is a landscape game: this is the same 390x844 phone the
    // suite has always used, held the way it is played. A portrait
    // viewport is not wrong so much as beside the point — the app turns
    // its own stage to landscape either way, and measuring a rotated
    // stage against the window is how you get assertions that pass while
    // the game is off the side of the screen.
    viewport: { width: 844, height: 390 },
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

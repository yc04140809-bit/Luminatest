import { defineConfig } from '@playwright/test';

/**
 * The App Alpha's own suite.
 *
 * A different port from the Artifact's on purpose: the two dev servers
 * are expected to be up at the same time while both are being worked
 * on, and a shared port would mean whichever started last silently
 * tested the other one's build.
 */
/**
 * THE SPECS THAT MEASURE TIME (作者採用 2026-11-06, C6): an animation's frames, a sound's order, a cut-in's beat, a
 * fight's turn as it is shown — and FORGE's import, which writes one folder of the dev server. Run on their own, one
 * at a time; the rest two at once (`npm run test:e2e` — scripts/e2e.mjs). Two at once, a spec that measures time
 * was seen to miss by a frame (2026-11-05: 双極臨界 at ×2), which is why these are kept apart.
 * A plain `npx playwright test` still runs all of them one at a time, as before.
 */
export const TIMED_SPECS = [
  'aria', 'attack', 'battleSounds', 'battleStage', 'cutin', 'debugPreview', 'finale', 'forgeImport', 'fxDirector',
  'kaosFinisher', 'kaosSkill', 'levi', 'magic', 'music', 'npcTouch', 'partyBattle', 'screenShake', 'slash',
  'specialFx', 'themeIntro', 'timePass', 'visionPullBack', 'voice', 'zero',
].map((name) => `**/${name}.spec.ts`);

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  projects: [
    { name: 'calm', testIgnore: TIMED_SPECS },
    { name: 'timed', testMatch: TIMED_SPECS },
  ],
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
        // 時間の使い方 (段階4): her five lines the first time back in — passed, as the intro is; its own spec keeps it.
        { name: 'mugen_dev_time_guide', value: 'off', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
      ],
      origins: [],
    },
  },
});

import { test, expect, type Page } from '@playwright/test';

/**
 * THE MUSIC, in the App.
 *
 * What is asserted is what is SOUNDING, not what was asked for — the
 * two differ exactly when something is wrong. The player is reached
 * through a handle that only a development build carries.
 *
 * THIS IS A BROWSER, NOT A HANDSET. Autoplay is unblocked for the run
 * so the test can hear anything at all; on a phone the first touch
 * does that job, and whether a real WebView honours it is one of the
 * things only a device can say.
 */
test.use({
  launchOptions: {
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--autoplay-policy=no-user-gesture-required'],
  },
});

interface Sounding {
  current: string | null;
  sounding: boolean;
  /** How many music elements are audible at once. Must never pass one. */
  live: number;
}

async function sounding(page: Page): Promise<Sounding> {
  return page.evaluate(() => {
    const a = (window as unknown as {
      __mugenAudio?: {
        bgmState(): { current: string | null; sounding: boolean };
        bgm?: HTMLAudioElement | null;
        bgmOut?: HTMLAudioElement | null;
      };
    }).__mugenAudio;
    const st = a?.bgmState() ?? { current: null, sounding: false };
    const els = [a?.bgm, a?.bgmOut].filter((e): e is HTMLAudioElement => !!e);
    return {
      current: st.current,
      sounding: st.sounding,
      live: els.filter((e) => !e.paused && e.volume > 0.001).length,
    };
  });
}

/** Waits for the crossfade to finish, then checks exactly one piece is up. */
async function expectPlaying(page: Page, id: string) {
  await expect.poll(async () => (await sounding(page)).current, { timeout: 8000 }).toBe(id);
  await expect.poll(async () => (await sounding(page)).live, { timeout: 4000 }).toBe(1);
  expect((await sounding(page)).sounding).toBe(true);
}

async function freshTitle(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  await page.reload();
  // The first touch. On a phone nothing sounds before it — and nothing
  // can be touched before the title is drawn, which is also when the
  // App starts listening for that touch.
  await expect(page.getByTestId('start-button')).toBeVisible();
  await page.mouse.click(4, 4);
}

test('plays the right piece on every screen, one at a time', async ({ page }) => {
  await freshTitle(page);

  // THE TITLE IS NOT SILENT. The App draws the title for THEME_CHOICE,
  // a screen it does not have, and inherited that screen's silence
  // until this was caught — the same complaint the Artifact fixed.
  await expectPlaying(page, 'ALDEN_HOME');

  await page.getByTestId('start-button').click();
  await expectPlaying(page, 'OPENING');
  for (let i = 0; i < 3; i++) await page.getByTestId('opening-next').click();
  await page.getByTestId('naming-default').click();

  await expectPlaying(page, 'ALDEN_HOME');
  // Reading a page from the village does not restart the music.
  await page.getByTestId('status-button').click();
  await expectPlaying(page, 'ALDEN_HOME');
  await page.getByTestId('status-back').click();

  await page.getByTestId('explore-button').click();
  await expectPlaying(page, 'ALDEN_VILLAGE');
  await page.getByTestId('forest-button').click();
  await expectPlaying(page, 'GREENWOOD_FOREST');
  await page.getByTestId('encounter-button').click();
  await expectPlaying(page, 'NORMAL_BATTLE');
});

/**
 * THE FIGHT THAT MATTERS BRINGS ITS OWN MUSIC. Gald's is BOSS_BATTLE,
 * and the four answers that follow are hers.
 */
test('plays the boss piece for Gald, and her piece after', async ({ page }) => {
  await freshTitle(page);
  await page.getByTestId('start-button').click();
  for (let i = 0; i < 3; i++) await page.getByTestId('opening-next').click();
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('enemy-hp').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await expectPlaying(page, 'BOSS_BATTLE');

  const attack = page.getByTestId('attack-button');
  for (let i = 0; i < 80; i++) {
    if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
    if (await page.getByTestId('awakening-done').isVisible().catch(() => false)) {
      await page.getByTestId('awakening-done').click();
      continue;
    }
    if (!(await attack.isEnabled().catch(() => false))) {
      await page.waitForTimeout(250);
      continue;
    }
    await attack.click({ timeout: 3000 }).catch(() => {});
  }
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
  await expectPlaying(page, 'KAOS_EVENT');
});

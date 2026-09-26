import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { fightUntil } from './battle';

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

/**
 * The element that is playing, tagged, with where it has got to.
 *
 * Moving between screens that share a piece must leave THIS element
 * playing — a stop and restart would build a new one, and a seek back
 * to the top would show as time going backwards.
 */
async function tagPlaying(page: Page): Promise<number> {
  return page.evaluate(() => {
    const a = (window as unknown as { __mugenAudio: { bgm: HTMLAudioElement & { __tag?: string } } })
      .__mugenAudio;
    a.bgm.__tag = 'kept';
    return a.bgm.currentTime;
  });
}

async function stillTheSame(page: Page, since: number): Promise<number> {
  const now = await page.evaluate(() => {
    const a = (window as unknown as { __mugenAudio: { bgm: (HTMLAudioElement & { __tag?: string }) | null } })
      .__mugenAudio;
    return { tag: a.bgm?.__tag ?? null, paused: a.bgm?.paused ?? true, t: a.bgm?.currentTime ?? -1 };
  });
  expect(now.tag, 'the same element, never stopped and rebuilt').toBe('kept');
  expect(now.paused).toBe(false);
  expect(now.t, 'carried on, not started over').toBeGreaterThanOrEqual(since);
  return now.t;
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

  // TITLE_SCREEN — the logo and 「はじめる」 — plays its own piece.
  // The App draws the title for THEME_CHOICE, a screen it does not
  // have, and must not inherit that screen's silence.
  await expectPlaying(page, 'TITLE_MAIN');
  // And by FILE, not only by id: the recording written for the title.
  expect(
    await page.evaluate(() => {
      const a = (window as unknown as { __mugenAudio: { bgm: HTMLAudioElement | null } }).__mugenAudio;
      return decodeURIComponent(a.bgm?.src ?? '').split('/').pop()?.replace(/\?.*$/, '');
    }),
  ).toMatch(/^title-main.*\.mp3$/);

  // OPENING — the world, alone: a different piece, the title's stopped.
  await page.getByTestId('start-button').click();
  await expectPlaying(page, 'OPENING');
  // …and she arrives: her piece, as in the Artifact, held through the
  // naming that follows her.
  await page.getByTestId('opening-next').click();
  await expect(page.getByTestId('stage-figure')).toHaveAttribute('data-who', 'kaos');
  await expectPlaying(page, 'KAOS_EVENT');
  await throughTheOpening(page);
  await expectPlaying(page, 'KAOS_EVENT');
  await page.getByTestId('naming-default').click();

  // ALDEN_HOME — the house plays the village's theme.
  await expectPlaying(page, 'ALDEN_VILLAGE');

  // AND IT NEVER STARTS OVER, however the player moves around Alden:
  // house → status → house → village → house → village.
  let t = await tagPlaying(page);
  await page.getByTestId('status-button').click();
  await expectPlaying(page, 'ALDEN_VILLAGE');
  t = await stillTheSame(page, t);
  await page.getByTestId('status-back').click();
  await expectPlaying(page, 'ALDEN_VILLAGE');
  t = await stillTheSame(page, t);
  await page.getByTestId('explore-button').click();
  await expectPlaying(page, 'ALDEN_VILLAGE');
  t = await stillTheSame(page, t);
  await page.getByTestId('back-to-village').click();
  await expectPlaying(page, 'ALDEN_VILLAGE');
  t = await stillTheSame(page, t);
  await page.getByTestId('explore-button').click();
  await expectPlaying(page, 'ALDEN_VILLAGE');
  await stillTheSame(page, t);

  await page.getByTestId('forest-button').click();
  await expectPlaying(page, 'GREENWOOD_FOREST');
  await page.getByTestId('encounter-button').click();
  await expectPlaying(page, 'NORMAL_BATTLE');
});

/** Forgets the save but not the device's preferences — a new world. */
async function wipeSave(page: Page) {
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
}

/** Closing the game and opening it again, then 「つづきから」. */
async function restartAndContinue(page: Page) {
  await page.reload();
  await page.getByTestId('continue-button').click();
}

/** From the village, or wherever 「つづきから」 left them, to the map. */
async function toTheMap(page: Page) {
  const village = page.getByTestId('explore-button');
  const map = page.getByTestId('forest-button');
  await expect(village.or(map)).toBeVisible();
  if (await village.isVisible()) await village.click();
  await expect(map).toBeVisible();
}

/** From the village or the map, to the forest's ordinary fight. */
async function toTheRabbit(page: Page) {
  await toTheMap(page);
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible();
}

/** Through the road to Gald, and his fight to the end. */
async function beatGald(page: Page, whileFighting?: () => Promise<void>) {
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await expectPlaying(page, 'BOSS_BATTLE');
  await whileFighting?.();
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), {
    maxTurns: 80,
  });
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
}

/**
 * HIS MUSIC IS WON, AND WON BY ONE SAVE.
 *
 * Before him there is nothing to choose and no ♪ at all. His fight
 * plays his piece and offers no choice. Beating him makes it choosable
 * in an ordinary fight, the choice comes back after a restart, and a
 * brand-new world — on the same device, with the same preference still
 * stored — has not won it and does not play it.
 */
test('the boss piece is unlocked by beating Gald, in that save only', async ({ page }) => {
  await freshTitle(page);
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();

  // LOCKED: an ordinary fight has one piece and nothing to switch.
  await toTheRabbit(page);
  await expectPlaying(page, 'NORMAL_BATTLE');
  await expect(page.getByTestId('bp-bgm-cycle')).toHaveCount(0);

  // HIS FIGHT: his piece, and no control even though a preference exists.
  await restartAndContinue(page);
  await toTheMap(page);
  await page.getByTestId('forest-button').click();
  await beatGald(page, async () => {
    await expect(page.getByTestId('bp-bgm-cycle')).toHaveCount(0);
  });
  expect(
    await page.evaluate(() =>
      (window as unknown as { __mugenWorld: { getUnlockedBattleBgm(): string[] } }).__mugenWorld.getUnlockedBattleBgm(),
    ),
  ).toEqual(['NORMAL_BATTLE', 'BOSS_BATTLE']);

  // UNLOCKED, and it survived closing the game.
  await restartAndContinue(page);
  await toTheRabbit(page);
  await expectPlaying(page, 'NORMAL_BATTLE');
  await expect(page.getByTestId('bp-bgm-label')).toHaveText('1/2');
  await page.getByTestId('bp-bgm-cycle').click();
  await expectPlaying(page, 'BOSS_BATTLE');
  await expect(page.getByTestId('bp-bgm-label')).toHaveText('2/2');

  // THE CHOICE COMES BACK TOO.
  await restartAndContinue(page);
  await toTheRabbit(page);
  await expectPlaying(page, 'BOSS_BATTLE');
  await expect(page.getByTestId('bp-bgm-label')).toHaveText('2/2');
  // And round again to the start.
  await page.getByTestId('bp-bgm-cycle').click();
  await expectPlaying(page, 'NORMAL_BATTLE');
  await page.getByTestId('bp-bgm-cycle').click();
  await expectPlaying(page, 'BOSS_BATTLE');

  // ANOTHER WORLD HAS NOT WON IT, whatever this device prefers.
  await wipeSave(page);
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('mugen-battle-bgm'))).toBe('BOSS_BATTLE');
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await toTheRabbit(page);
  await expectPlaying(page, 'NORMAL_BATTLE');
  await expect(page.getByTestId('bp-bgm-cycle')).toHaveCount(0);
});

/**
 * THE FIGHT THAT MATTERS BRINGS ITS OWN MUSIC. Gald's is BOSS_BATTLE,
 * and the four answers that follow are hers.
 */
test('plays the boss piece for Gald, and her piece after', async ({ page }) => {
  await freshTitle(page);
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await expectPlaying(page, 'BOSS_BATTLE');

  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), {
    maxTurns: 80,
  });
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
  await expectPlaying(page, 'KAOS_EVENT');
});

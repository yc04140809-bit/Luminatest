import { test, expect, type Page } from './fixtures';
import { enterDevAdmin, playToLifeChoice, swingUntil, walkTheForestUntil } from './helpers';

/**
 * THE MUSIC, WITHOUT LISTENING TO IT.
 *
 * A browser under test makes no sound, and nothing in Playwright can
 * hear one. What CAN be checked is everything that decides what sounds:
 * which file the page is playing, that it is looping, that it is one
 * element and not two, and that walking from one scene to another
 * changes it. Those are the failures that actually happen — the wrong
 * track, the restart on every render, the two copies overlapping — and
 * every one of them is visible in the DOM.
 *
 * The audio elements are created by `new Audio()` and never attached to
 * the document, so they cannot be found with a selector. They are found
 * instead by patching the constructor before the app boots and keeping
 * a register of what was made, which is also the only way to see the
 * one thing that matters most: how MANY were made.
 */
const REGISTER = `
  window.__bgm = [];
  const RealAudio = window.Audio;
  window.Audio = function (src) {
    const el = new RealAudio(src);
    // The file it was made for. Kept separately because the player
    // clears .src when it lets an element go, and "what was this?" has
    // to survive that.
    el.__src = src;
    el.__started = false;
    el.__stopped = false;
    const play = el.play.bind(el);
    // NOT the element's own 'paused', which is what the first version
    // of this asked. A
    // freshly made element is paused, play() resolves asynchronously,
    // and a headless machine with no audio device may never actually
    // start — so "is it paused" answers "yes" about a piece of music
    // the app is playing perfectly well. What the app DID is the thing
    // under test, so what the app did is what is recorded.
    el.play = () => { el.__started = true; return play().catch(() => {}); };
    const pause = el.pause.bind(el);
    el.pause = () => { el.__stopped = true; return pause(); };
    window.__bgm.push(el);
    return el;
  };
  window.Audio.prototype = RealAudio.prototype;
`;

interface Track {
  src: string;
  loop: boolean;
  volume: number;
  started: boolean;
  stopped: boolean;
}

/** Every element the app has made, oldest first. */
async function made(page: Page): Promise<Track[]> {
  return page.evaluate(() =>
    ((window as unknown as { __bgm: Record<string, unknown>[] }).__bgm ?? []).map((a) => ({
      src: String(a.__src ?? ''),
      loop: Boolean(a.loop),
      volume: Number(a.volume),
      started: Boolean(a.__started),
      stopped: Boolean(a.__stopped),
    })),
  );
}

/** Just the filename, without the build's content hash. */
function nameOf(src: string): string {
  return decodeURIComponent(src)
    .split('/')
    .pop()!
    .replace(/-[A-Za-z0-9_-]{8}\.mp3$/, '.mp3');
}

/** The one that is sounding, by the name of its file. */
async function playing(page: Page): Promise<string | null> {
  const live = (await made(page)).filter((a) => a.started && !a.stopped && a.volume > 0);
  if (live.length === 0) return null;
  if (live.length > 1) {
    throw new Error(`two pieces of music at once: ${live.map((a) => nameOf(a.src)).join(', ')}`);
  }
  return nameOf(live[0].src);
}

/**
 * Waits until this is the piece that is playing, and says so.
 *
 * WAITS FOR THE ANSWER, not for a stopwatch and not for "one of them
 * has stopped". Both of the simpler versions were wrong in ways that
 * only showed up sometimes: a flat wait was long enough on an idle
 * machine and not on one running three browsers, and "wait until
 * exactly one is sounding" returns the OLD piece in the moment before
 * the new one starts. Asking for the piece by name has neither
 * problem, and it still fails loudly — the last thing it saw is in the
 * message — when the wrong piece is playing or two are.
 */
async function expectPlaying(page: Page, wanted: string, budgetMs = 8_000): Promise<void> {
  const deadline = Date.now() + budgetMs;
  let last: string | null = null;
  let overlap: unknown = null;
  for (;;) {
    try {
      overlap = null;
      last = await playing(page);
      if (last === wanted) return;
    } catch (twoAtOnce) {
      // A crossfade still crossing, or the bug this file exists to
      // catch. Waiting tells them apart.
      overlap = twoAtOnce;
    }
    if (Date.now() >= deadline) {
      if (overlap) throw overlap;
      expect(last, `waited ${budgetMs}ms for ${wanted}`).toBe(wanted);
      return;
    }
    await page.waitForTimeout(120);
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(REGISTER);
});

test('the six scenes, each with its own music', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');

  // 1. TITLE — nothing yet, because nothing has been touched. A phone
  //    will not make a sound before the player does something, and the
  //    game must not pretend otherwise.
  expect(await made(page)).toHaveLength(0);

  // …and the very first tap starts what the title had already asked
  //    for. Not a screen later: this tap.
  await page.getByTestId('start-button').click();
  expect(await playing(page)).toBe('opening.mp3');

  // 2. PROLOGUE — the monologue is still the opening, and her arrival
  //    is not.
  const monologue = page.getByTestId('prologue-monologue');
  await expect(monologue).toBeVisible();
  expect(await playing(page)).toBe('opening.mp3');
  await monologue.click();
  const kaos = page.getByTestId('kaos-intro');
  await expect(kaos).toBeVisible();
  await expectPlaying(page, 'kaos-event.mp3');

  // 3. ALDEN — home, and every room off it.
  for (let i = 0; i < 6; i++) await kaos.click().catch(() => {});
  await expect(page.getByTestId('explore-button')).toBeVisible({ timeout: 20_000 });
  await expectPlaying(page, 'alden-village.mp3');

  // 4. THE TAVERN — the one room in Alden with a different air.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  await expectPlaying(page, 'tavern.mp3');

  // …and leaving it is the village again, which is the whole of
  //    「イベント終了後は元のBGMへ復帰」: the music follows the room.
  //    A spot with something to say plays it first, so tap through
  //    whatever is being said before looking for the way out.
  const scene = page.getByTestId('talk-MOONLIGHT_TAVERN');
  const leave = page.getByTestId('talk-MOONLIGHT_TAVERN-leave');
  for (let i = 0; i < 20; i++) {
    if (await leave.isVisible().catch(() => false)) break;
    await scene.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await expect(leave).toBeVisible({ timeout: 10_000 });
  // And the music did not change while the scene played: the room is
  // the room whoever is talking in it.
  expect(await playing(page)).toBe('tavern.mp3');
  await leave.click();
  await expectPlaying(page, 'alden-village.mp3');

  // 5. THE FOREST.
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await expectPlaying(page, 'greenwood-forest.mp3');
});

test('a fight takes the music, and gives it back', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click().catch(() => {});
  await expect(page.getByTestId('explore-button')).toBeVisible({ timeout: 20_000 });

  await enterDevAdmin(page);
  // A world where Gald is already behind them, so the next thing in
  // the forest is a creature rather than the story's own fight. A
  // fresh world walks into him first, and his fight ends on the four
  // answers rather than back on the path.
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  // The ordinary win, which is what almost every fight in the forest
  // is. The rare one that turns out to be somebody ends on the four
  // answers instead of on the path, and this test is about the path.
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('dev-admin-back').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await expectPlaying(page, 'greenwood-forest.mp3');

  // 6. THE FIGHT.
  const fighting = page.getByTestId('battle-prototype');
  await walkTheForestUntil(page, () => fighting.isVisible().catch(() => false));
  await expect(fighting).toBeVisible();
  await expectPlaying(page, 'normal-battle.mp3');

  // AND BACK. Nothing is remembered to make this work: the music is a
  // function of where the player is, and winning puts them back on the
  // path they were walking.
  // Through the suite's own swinger, which presses by identity: the
  // commands are mid-animation most of the time and a fight that is
  // never swung at never ends.
  const forest = page.locator('.phaser-wrap canvas');
  await swingUntil(page, 'bp-attack', () => forest.isVisible().catch(() => false));
  await expect(forest).toBeVisible({ timeout: 20_000 });
  await expectPlaying(page, 'greenwood-forest.mp3');
});

test('the forest is never restarted by the screen redrawing itself', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click().catch(() => {});
  await expect(page.getByTestId('explore-button')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await expectPlaying(page, 'greenwood-forest.mp3');

  const before = (await made(page)).length;
  // Walk about for a while: the screen redraws on every step, and the
  // forest must not begin again under the player's feet.
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  for (const [fx, fy] of [[0.3, 0.5], [0.7, 0.5], [0.5, 0.3], [0.5, 0.7]] as const) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await page.waitForTimeout(400);
  }
  expect(await made(page), 'no second copy of the forest was ever made').toHaveLength(before);
  expect(await playing(page)).toBe('greenwood-forest.mp3');
});

test('♪ is in the fight, small, and changes nothing about the fight', async ({ page }) => {
  test.setTimeout(240_000);
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  await expectPlaying(page, 'normal-battle.mp3');

  const cycle = page.getByTestId('bp-bgm-cycle');
  await expect(cycle).toBeVisible();
  // Small: a chip beside the place name, not a control competing with
  // the turn order above it.
  const chip = (await cycle.boundingBox())!;
  const place = (await page.getByTestId('bx-place').boundingBox())!;
  expect(chip.width).toBeLessThan(place.width);
  expect(chip.height).toBeLessThanOrEqual(30);
  await expect(page.getByTestId('bp-bgm-label')).toHaveText('1/1');

  // Pressing it does not take a turn: the fight is where it was.
  const hp = page.getByTestId('bp-enemy-read');
  const before = await hp.textContent();
  await cycle.click();
  await page.waitForTimeout(700);
  expect(await hp.textContent()).toBe(before);
  // One piece registered, so it comes round to itself — and the
  // important half: it did not start a second copy of it.
  expect(await playing(page)).toBe('normal-battle.mp3');
});

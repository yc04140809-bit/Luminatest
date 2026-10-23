import { test, expect, type Page } from '@playwright/test';
import { readyToAct } from './battle';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * THE CAMERA, EACH BLOW, AND THE FINALE'S 間 (作者「無料強化メモ②③」「CAMERA KICK」
 * 「CAMERA DIRECTOR」2026-10-17; src/ui/fx/camera.ts, src/ui/battle/partyFx.ts,
 * content/story/chapter1Finale.ts, src/platform/ambience.ts).
 *
 * The camera's moves go through the Web Animations API on `transform` (the
 * shake keeps `translate`), so this records those calls from before the page
 * loads: who moved, which way, and that it came back. The flashes are CSS —
 * looked for where the blow lands. The suite runs with less motion
 * (playwright.config `reducedMotion`): the camera is off then (the last
 * camera test holds that); the flashes, the numbers and the finale's cues are
 * there either way.
 */

type Move = { who: string; ms: number; xs: number[]; scales: number[] };

async function recordCamera(page: Page) {
  await page.addInitScript(() => {
    const log: { who: string; ms: number; xs: number[]; scales: number[] }[] = [];
    (window as unknown as { __camera: typeof log }).__camera = log;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const list = Array.isArray(frames) ? frames : [];
      const el = this as HTMLElement;
      if (list.some((f) => f && typeof f === 'object' && 'transform' in f)) {
        const t = list.map((f) => String((f as { transform?: string }).transform ?? ''));
        log.push({
          // A layer of the world, or (the one struck reeling) its drawing — anything else would be the HUD.
          who: el.dataset.shakeLayer ?? (el.closest('[data-shake-layer]') && el.tagName === 'IMG' ? 'drawing' : el.className || el.tagName),
          ms: typeof options === 'object' ? Number(options?.duration ?? 0) : Number(options ?? 0),
          xs: t.map((s) => Number(/translate\((-?[\d.]+)px/.exec(s)?.[1] ?? 0) + Number(/translateX\((-?[\d.]+)%/.exec(s)?.[1] ?? 0)),
          scales: t.map((s) => Number(/scale\(([\d.]+)\)/.exec(s)?.[1] ?? 1)),
        });
      }
      return animate.call(this, frames, options);
    };
  });
}
const everything = (page: Page) => page.evaluate(() => (window as unknown as { __camera: Move[] }).__camera.slice());
/** The camera's own: the moves of the layers. */
const moves = async (page: Page) => (await everything(page)).filter((m) => m.who === 'field' || m.who === 'backdrop');
/** Nothing moved but the world (its layers, a drawing reeling) — never the HUD. */
const onlyTheWorld = async (page: Page) => (await everything(page)).every((m) => ['field', 'backdrop', 'drawing'].includes(m.who));
const clear = (page: Page) => page.evaluate(() => void ((window as unknown as { __camera: Move[] }).__camera.length = 0));
const atRest = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).transform === 'none' && el.getAnimations().length === 0);

/** To this member's turn: each other member defends. */
async function turnOf(page: Page, id: string) {
  for (let i = 0; i < 8; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === id) return;
    await page.getByTestId('pb-cmd-defend').click();
  }
  throw new Error(`never ${id}'s turn`);
}

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('CAMERA KICK: the hero\'s blow kicks the field toward the creature (left) and back; the painting half as far; the HUD never moves', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=party&footing=40');
    await turnOf(page, 'hero');
    await clear(page);
    await page.getByTestId('pb-cmd-attack').click();
    await expect.poll(async () => (await moves(page)).length).toBeGreaterThanOrEqual(2);
    const got = await moves(page);
    expect(new Set(got.map((m) => m.who))).toEqual(new Set(['field', 'backdrop']));
    expect(await onlyTheWorld(page)).toBe(true);
    const field = got.find((m) => m.who === 'field')!;
    const bg = got.find((m) => m.who === 'backdrop')!;
    // A jolt one way (left), SMALL (1.6% of the width — the reference video's), fast (≤150ms — his
    // tempo is sharp), a little past the other way, back to rest. The whole picture: the painting as far.
    expect(Math.min(...field.xs)).toBeLessThanOrEqual(-1.5);
    expect(Math.min(...field.xs)).toBeGreaterThanOrEqual(-2);
    expect(Math.max(...field.xs)).toBeGreaterThan(0);
    expect(Math.max(...field.xs)).toBeLessThan(0.5);
    expect(field.ms).toBeLessThanOrEqual(150);
    expect(field.xs[field.xs.length - 1]).toBe(0);
    expect(Math.min(...bg.xs)).toBe(Math.min(...field.xs));
    // The painting grows while it moves, never shrinks.
    expect(Math.min(...bg.scales)).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(500);
    expect(await atRest(page, '.pb-field')).toBe(true);
    expect(await atRest(page, '.pb-bg')).toBe(true);
  });

  test('重撃・豪断 (a cut-in move — 作者 2026-10-23): its camera FOLLOWS it — one TRACK, leaning in on him, swung at the creature and held, jolted at the blow, home again; a BREAK leaves it be', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=party&hurt=1&footing=4');
    await turnOf(page, 'grave');
    await clear(page);
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-tech-goudan').click();
    await expect(page.getByTestId('pb-break-flash')).toBeVisible();
    await expect.poll(async () => (await moves(page)).filter((m) => m.who === 'field').length).toBeGreaterThanOrEqual(1);
    const field = (await moves(page)).filter((m) => m.who === 'field');
    // One move only (the BREAK's focus would cut it short, so it is not played).
    expect(field).toHaveLength(1);
    const [track] = field;
    // A lean toward him first (he stands near the middle, so hardly sideways — nearer, though), then
    // swung at the creature on the left (the picture right) by LARGE (9% at most), nearer (to 1.08) — and home.
    expect(track.xs[1]).toBeLessThan(Math.max(...track.xs));
    expect(track.scales[1]).toBeGreaterThan(1);
    expect(Math.max(...track.xs)).toBeGreaterThan(3);
    expect(Math.max(...track.xs)).toBeLessThanOrEqual(9);
    expect(Math.max(...track.scales)).toBeGreaterThan(1.05);
    expect(Math.max(...track.scales)).toBeLessThanOrEqual(1.08);
    expect(track.xs[track.xs.length - 1]).toBe(0);
    expect(track.scales[track.scales.length - 1]).toBe(1);
    await page.waitForTimeout(1400);
    expect(await atRest(page, '.pb-field')).toBe(true);
  });

  test('ケイオスの魔法 (a cut-in move — 作者 2026-10-23): her cut-in, then the camera FOLLOWS the spell — leaning in on her, swung at the creature (the picture right) and held, home again', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=party&footing=40');
    await turnOf(page, 'kaos');
    await clear(page);
    await page.getByTestId('pb-cmd-magic').click();
    await page.locator('[data-testid^="pb-magic-"]:not([disabled])').first().click();
    // Her cut-in first (the same as the ordinary fight's), the commands held while it plays.
    await expect(page.getByTestId('pb-cinematic')).toBeVisible();
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'yes');
    await expect(page.getByTestId('pb-figure-kaos').getByTestId('pb-cast')).toHaveCount(1, { timeout: 10_000 });
    await expect.poll(async () => (await moves(page)).filter((m) => m.who === 'field').length).toBeGreaterThanOrEqual(1);
    const track = (await moves(page)).find((m) => m.who === 'field')!;
    // MEDIUM: swung up to 7% at the creature, nearer (to 1.06); a lean toward her first; home at the end.
    expect(Math.min(...track.xs)).toBeLessThan(0);
    expect(Math.max(...track.xs)).toBeGreaterThan(2);
    expect(Math.max(...track.xs)).toBeLessThanOrEqual(7);
    expect(Math.max(...track.scales)).toBeGreaterThan(1.03);
    expect(Math.max(...track.scales)).toBeLessThanOrEqual(1.06);
    expect(track.xs[track.xs.length - 1]).toBe(0);
    expect(await onlyTheWorld(page)).toBe(true);
    await page.waitForTimeout(1400);
    expect(await atRest(page, '.pb-field')).toBe(true);
  });

  test('零閃・天衝 (TIGS CAMERA KICK): a beat of stillness, then the picture kicks once (left, MEDIUM) and comes back', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 640, height: 300 });
    await page.goto('/?preview=finale&from=FORM2_WON');
    const on = page.getByTestId('finale-scene');
    for (let i = 0; i < 20 && (await on.getAttribute('data-scene')) !== 'STOPPED'; i++) {
      const key = `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`;
      await clear(page);
      await page.getByTestId('finale-next').click();
      await expect.poll(async () => `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`).not.toBe(key);
    }
    await expect(on).toHaveAttribute('data-scene', 'STOPPED');
    await expect.poll(async () => (await moves(page)).length).toBeGreaterThanOrEqual(1);
    const got = await moves(page);
    expect(got).toHaveLength(1);
    const [kick] = got;
    expect(kick.who).toBe('backdrop');
    // MEDIUM is 2.2% of the width; a KICK moves the painting as far as the field (the whole picture).
    expect(Math.min(...kick.xs)).toBeLessThanOrEqual(-2);
    expect(Math.min(...kick.xs)).toBeGreaterThanOrEqual(-2.5);
    expect(Math.max(...kick.xs)).toBeLessThan(0.6);
    expect(kick.ms).toBeLessThanOrEqual(220);
    // It grows just enough to hide its edges, never shrinks.
    expect(Math.min(...kick.scales)).toBeGreaterThanOrEqual(1);
    // Back at rest once the cut has landed, held and jolted (its shake, on `translate`, is not the camera's).
    await page.waitForTimeout(1200);
    expect(await atRest(page, '.finale-stage')).toBe(true);
  });

  test('the ordinary fight too (実機 2026-10-23: none before ヴァルシール): his blow landing jolts the whole picture left, as the reference video does; the HUD never moves', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=battle');
    await expect(page.getByTestId('bp-attack')).toBeEnabled({ timeout: 15_000 });
    await clear(page);
    await page.getByTestId('bp-attack').click();
    await expect.poll(async () => (await moves(page)).length, { timeout: 5_000 }).toBeGreaterThanOrEqual(1);
    const [kick] = await moves(page);
    // The stage itself (backdrop and everyone on it) — marked as a painting, so it grows to hide its edges.
    expect(kick.who).toBe('backdrop');
    expect(Math.min(...kick.xs)).toBeLessThanOrEqual(-1.5);
    expect(Math.min(...kick.xs)).toBeGreaterThanOrEqual(-2);
    expect(Math.min(...kick.scales)).toBeGreaterThanOrEqual(1);
    expect(kick.xs[kick.xs.length - 1]).toBe(0);
    expect(await onlyTheWorld(page)).toBe(true);
  });

  test('the ordinary fight\'s 《瞬断》 (a cut-in move): after its cut-in the camera FOLLOWS the swing — one TRACK at the creature (the picture right), home again — not a KICK', async ({ page }) => {
    test.setTimeout(120_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    // The game's own forest fight (the preview has no skill tray).
    await page.goto('/');
    await page.evaluate(async () => {
      for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
    });
    await page.reload();
    await page.getByTestId('start-button').click();
    await throughTheOpening(page);
    await page.getByTestId('naming-default').click();
    await pastTheIntro(page);
    await page.getByTestId('explore-button').click();
    await page.getByTestId('forest-button').click();
    await page.getByTestId('encounter-button').click();
    await readyToAct(page);
    await clear(page);
    await page.getByTestId('bp-skill').click();
    await page.getByTestId('skill-shundan').click();
    await expect(page.getByTestId('bp-cinematic')).toBeVisible();
    await expect.poll(async () => (await moves(page)).length, { timeout: 8_000 }).toBeGreaterThanOrEqual(1);
    const [track] = await moves(page);
    expect(track.who).toBe('backdrop');
    // The stage as a painting: half the swing (MEDIUM 7% → 3.5% at most), toward the creature on the left.
    expect(Math.max(...track.xs)).toBeGreaterThan(1);
    expect(Math.max(...track.xs)).toBeLessThanOrEqual(4);
    expect(Math.max(...track.scales)).toBeGreaterThan(1);
    expect(track.xs[track.xs.length - 1]).toBe(0);
    expect(await onlyTheWorld(page)).toBe(true);
  });

  test('AUTO at ×2: the camera never piles up — everything back at rest, the fight won', async ({ page }) => {
    test.setTimeout(120_000);
    await recordCamera(page);
    await page.goto('/?preview=party&hurt=1');
    await page.getByTestId('pb-speed').click();
    await page.getByTestId('pb-auto').click();
    await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 100_000 });
    const got = await moves(page);
    expect(got.length).toBeGreaterThan(0);
    expect(await onlyTheWorld(page)).toBe(true);
    // No move longer than the longest (a giant's draw back, slowed) — at ×2 they are halved.
    expect(Math.max(...got.map((m) => m.ms))).toBeLessThanOrEqual(640);
    // Back at rest once the last blow's moves are over (they never pile up, so this comes soon).
    await expect.poll(() => atRest(page, '.pb-field'), { timeout: 2_000 }).toBe(true);
    await expect.poll(() => atRest(page, '.pb-bg'), { timeout: 2_000 }).toBe(true);
  });
});

test('less motion asked for (as the suite runs): the camera does not move', async ({ page }) => {
  test.setTimeout(60_000);
  await recordCamera(page);
  await page.goto('/?preview=party&hurt=1&footing=4');
  await turnOf(page, 'grave');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  await expect(page.getByTestId('pb-break-flash')).toBeVisible();
  await page.waitForTimeout(400);
  expect(await everything(page)).toEqual([]);
});

test('each blow its own flash where it lands: a white cut, Kaos\'s circle and colour, the feathers; the big number on 重撃・豪断', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?preview=party&hurt=1&footing=40');
  const hit = (kind: string) => page.locator(`[data-testid="pb-hit"][data-kind="${kind}"]`);

  await turnOf(page, 'hero');
  await page.getByTestId('pb-cmd-attack').click();
  await expect(page.getByTestId('pb-foe').locator('[data-testid="pb-hit"][data-kind="slash"]')).toHaveCount(1);

  await turnOf(page, 'grave');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  await expect(page.getByTestId('pb-foe').getByTestId('pb-float')).toHaveAttribute('data-tier', 'big');

  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-star_feather').click();
  await page.getByTestId('pb-target-grave').click();
  await expect(page.getByTestId('pb-figure-grave').locator('[data-testid="pb-hit"][data-kind="feather"]')).toHaveCount(1);
  // Feathers: no jolt, no camera — and nothing that cuts.
  await expect(hit('slash')).toHaveCount(0);

  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-magic').click();
  // Her first damage spell (星光弾).
  await page.locator('[data-testid^="pb-magic-"]:not([disabled])').first().click();
  await expect(page.getByTestId('pb-figure-kaos').getByTestId('pb-cast')).toHaveCount(1);
  await expect(page.getByTestId('pb-foe').locator('[data-testid="pb-hit"][data-kind="magic"]')).toHaveCount(1);
});

/** Reads the finale until this line is up. */
async function readUntil(page: Page, scene: string, text: string) {
  const on = page.getByTestId('finale-scene');
  for (let i = 0; i < 90; i++) {
    if ((await on.getAttribute('data-scene')) === scene && (await page.getByTestId('finale-line').textContent())?.includes(text)) return;
    const key = `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`;
    await page.getByTestId('finale-next').click();
    await expect.poll(async () => `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`).not.toBe(key);
  }
  throw new Error(`never reached ${scene}: ${text}`);
}

test('the finale\'s 間, its music and each place\'s air: the hymn falls away at the red light and stays gone; a hum in the depths; the words wait their 間 — and つぎへ never does', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 640, height: 300 });
  await page.goto('/?preview=finale&from=NONE');
  const on = page.getByTestId('finale-scene');
  await readUntil(page, 'RUINS_SEAL', '黒いフードの人影');
  await expect(on).toHaveAttribute('data-ambience', 'HUM');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mugenAmbience: () => string | null }).__mugenAmbience())).toBe('HUM');
  await expect(on).toHaveAttribute('data-music', 'AS_IS');
  await readUntil(page, 'RUINS_SEAL', '装置が、赤く光った。');
  await expect(on).toHaveAttribute('data-music', 'DROP');
  await readUntil(page, 'RUINS_SEAL', '……違う。');
  await expect(page.getByTestId('finale-line')).toHaveAttribute('data-pause', '500');
  await expect(on).toHaveAttribute('data-music', 'DROP');
  // The 間 is the words' alone: つぎへ is there at once, and goes on at once.
  await expect(page.getByTestId('finale-next')).toBeEnabled();
  await readUntil(page, 'RUINS_SEAL', '床の封印紋');
  await expect(page.getByTestId('finale-line')).toHaveAttribute('data-pause', '700');
  await readUntil(page, 'RUINS_SEAL', '完全起動');
  await expect(on).toHaveAttribute('data-music', 'DROP');
  // The next scene: the music as it is again; the village (morning) has no air of its own.
  await readUntil(page, 'MORNING', '翌朝。');
  await expect(on).toHaveAttribute('data-music', 'AS_IS');
  await expect(on).toHaveAttribute('data-ambience', 'NONE');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mugenAmbience: () => string | null }).__mugenAmbience())).toBeNull();
  await readUntil(page, 'RAID', '柵を踏み砕いて');
  await expect(on).toHaveAttribute('data-ambience', 'FIRE');
});

test('before the fight on the grassland: the music falls away at 「止める。」, a breath on 「おう。」, a dark moment — then the fight, with no air left under it', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 640, height: 300 });
  await page.goto('/?preview=finale&from=LURED');
  const on = page.getByTestId('finale-scene');
  await expect(on).toHaveAttribute('data-scene', 'FORM1_START');
  await expect(on).toHaveAttribute('data-ambience', 'WIND');
  await readUntil(page, 'FORM1_START', '止める。');
  await expect(on).toHaveAttribute('data-music', 'DROP');
  await readUntil(page, 'FORM1_START', 'おう。');
  await expect(page.getByTestId('finale-line')).toHaveAttribute('data-pause', '500');
  await page.getByTestId('finale-next').click();
  await expect(page.getByTestId('finale-breath')).toBeVisible();
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  await expect(page.getByTestId('finale-breath')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __mugenAmbience: () => string | null }).__mugenAmbience())).toBeNull();
});

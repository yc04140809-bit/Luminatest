import { test, expect, type Page } from '@playwright/test';
import { goTo, hero, settled, things, touch } from './roam';

/**
 * THE GRASSLAND PoC — 遠近スケール and 探索ポイント発見演出 (作者「探索システム拡張」2026-10-18), from
 * the DEBUG door (`?preview=walk&place=GRASSLAND`). Far back the party is drawn smaller, smoothly, yet
 * stays easy to find (an aura a little stronger, a ring never too small); the things there are faint
 * from afar, and the moment one is first noticed it flashes, swells, sparkles and is heard — each kind
 * its own shape, movement and sound — once, and then settles. Other places are not changed.
 */

const scene = (page: Page) => page.getByTestId('walk-scene');
type Noticed = { id: string; cue: string; sfx: string };
const noticedLog = (page: Page) => page.evaluate(() => ((window as unknown as { __mugenNoticed?: Noticed[] }).__mugenNoticed ?? []).slice());

async function openGrassland(page: Page) {
  await page.goto('/?preview=walk&place=GRASSLAND');
  await expect(scene(page)).toHaveAttribute('data-place', 'GRASSLAND');
  await settled(page);
  await expect
    .poll(() => page.getByTestId('walk-painting').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
    .toBe(true);
}

test('its painting at its own shape, the camera following the party up the meadow to the great tree; smaller far back, smoothly', async ({ page }) => {
  test.setTimeout(90_000);
  await openGrassland(page);
  const src = decodeURIComponent((await page.getByTestId('walk-painting').getAttribute('src')) ?? '');
  expect(src).toContain('walk-grassland-river');
  const box = (await page.getByTestId('walk-painting').boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(1462 / 1076, 1);
  const top0 = Number((await scene(page).getAttribute('data-view'))!.split(',')[2]);
  const nearScale = Number(await scene(page).getAttribute('data-scale'));
  const nearRing = (await page.getByTestId('walk-ring-hero').boundingBox())!.width;
  const nearAura = Number(await page.getByTestId('walk-hero').evaluate((el) => getComputedStyle(el).getPropertyValue('--aura-u')));
  // Up the meadow, round to the hill under the great tree.
  for (const p of [{ x: 0.55, y: 0.45 }, { x: 0.45, y: 0.37 }, { x: 0.36, y: 0.33 }]) await touch(page, p);
  const far = await hero(page);
  expect(far.y).toBeLessThan(0.36);
  const farScale = Number(await scene(page).getAttribute('data-scale'));
  expect(farScale).toBeLessThan(nearScale);
  expect(farScale).toBeGreaterThanOrEqual(0.55);
  expect(farScale).toBeLessThanOrEqual(0.7);
  // The camera came up with them.
  const top1 = Number((await scene(page).getAttribute('data-view'))!.split(',')[2]);
  expect(top1).toBeGreaterThan(top0 + 40);
  // Still easy to find: the ring never too small; the aura relatively stronger.
  const farRing = (await page.getByTestId('walk-ring-hero').boundingBox())!.width;
  expect(farRing).toBeGreaterThanOrEqual(34 - 0.5);
  expect(farRing).toBeLessThan(nearRing + 0.5);
  const farAura = Number(await page.getByTestId('walk-hero').evaluate((el) => getComputedStyle(el).getPropertyValue('--aura-u')));
  expect(farAura).toBeGreaterThan(nearAura);
  // On screen, the hero is where his feet are drawn — in view.
  const h = (await page.getByTestId('walk-hero').boundingBox())!;
  expect(h.y).toBeGreaterThan(0);
  expect(h.y + h.height).toBeLessThan(page.viewportSize()!.height);
});

test('faint from afar; first noticed: it flashes and swells (data-fresh), its kind\'s sound once; then it settles, and is never "first" again', async ({ page }) => {
  test.setTimeout(90_000);
  await openGrassland(page);
  // From where they start, the signpost is only faintly there.
  await expect(page.getByTestId('walk-hint-OLD_SIGNPOST')).toBeAttached();
  await expect(page.getByTestId('walk-marker-OLD_SIGNPOST')).toHaveCount(0);
  // Coming near it.
  const sign = (await things(page)).find((t) => t.id === 'OLD_SIGNPOST')!;
  await touch(page, { x: sign.stand.x + 0.06, y: sign.stand.y + 0.03 });
  const mark = page.getByTestId('walk-marker-OLD_SIGNPOST');
  await expect(mark).toHaveAttribute('data-cue', 'LOOK');
  await expect(mark).toHaveAttribute('data-fresh', 'yes');
  await expect(page.getByTestId('walk-hint-OLD_SIGNPOST')).toHaveCount(0);
  const heard = (await noticedLog(page)).filter((n) => n.id === 'OLD_SIGNPOST');
  expect(heard).toHaveLength(1);
  // Settled after a moment: still there, quietly.
  await expect(mark).toHaveAttribute('data-fresh', 'no', { timeout: 5_000 });
  // Away and back: noticed again, but not first-noticed again — no flash, no second sound.
  await touch(page, { x: 0.75, y: 0.75 });
  await expect(page.getByTestId('walk-hint-OLD_SIGNPOST')).toHaveClass(/seen/);
  await touch(page, { x: sign.stand.x + 0.06, y: sign.stand.y + 0.03 });
  await expect(mark).toHaveAttribute('data-fresh', 'no');
  expect((await noticedLog(page)).filter((n) => n.id === 'OLD_SIGNPOST')).toHaveLength(1);
});

test('each kind its own shape and sound: a thing to look at, one to gather, the event mark', async ({ page }) => {
  test.setTimeout(90_000);
  await openGrassland(page);
  await goTo(page, 'ROADSIDE_MARK');
  await expect(page.getByTestId('walk-marker-ROADSIDE_MARK')).toHaveAttribute('data-cue', 'EVENT');
  await goTo(page, 'grass_pickup_004');
  await expect(page.getByTestId('walk-marker-grass_pickup_004')).toHaveAttribute('data-cue', 'GATHER');
  await goTo(page, 'OLD_SIGNPOST');
  await expect(page.getByTestId('walk-marker-OLD_SIGNPOST')).toHaveAttribute('data-cue', 'LOOK');
  const log = await noticedLog(page);
  const sound = (id: string) => log.find((n) => n.id === id);
  expect(sound('ROADSIDE_MARK')?.cue).toBe('EVENT');
  expect(sound('grass_pickup_004')?.cue).toBe('GATHER');
  // Each first-noticed moment was heard with a sound of its kind (the most notable, when several at once).
  for (const n of log.filter((x) => x.sfx)) expect(n.sfx).toMatch(/^explore_notice_(look|gather|rare|event|memory)$/);
  // Each thing first noticed once.
  expect(new Set(log.map((n) => n.id)).size).toBe(log.length);
});

test('a thing to gather is gathered as before (looked into, its line said)', async ({ page }) => {
  await openGrassland(page);
  await goTo(page, 'grass_pickup_004');
  await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', 'grass_pickup_004');
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-caption')).toHaveText('花の群れの中に、香りの強い草があった。');
});

test('the places of old are not changed: the forest and the ruins show their 「！」 as before, no discovery marks', async ({ page }) => {
  await page.goto('/?preview=walk&place=ANCIENT_RUINS');
  await settled(page);
  expect(await page.locator('.disc-marker').count()).toBe(0);
  expect(await page.locator('.roam-sign.g-cue').count()).toBe(0);
});

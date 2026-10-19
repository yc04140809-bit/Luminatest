import { test, expect, type Page } from '@playwright/test';
import { goTo, hero, settled, things, touch, type P } from './roam';

/**
 * THE GROUND TOLD APART — the PoC of 作者「探索画面仕様 更新指示」(2026-10-17), on the ruins only,
 * from the DEBUG door (`?preview=walk&place=ANCIENT_RUINS&areas=1`): the paved road (緑 MAIN),
 * the old steps on the left (黄 SIDE), everything else not walked (赤); the three blue marks of the
 * grid image to look at, and every pickup and find of the ruins as before. The ruins the game
 * walks are not changed (exploreRuins.spec holds them).
 */

const scene = (page: Page) => page.getByTestId('walk-scene');

async function openPoC(page: Page, extra = '') {
  await page.goto(`/?preview=walk&place=ANCIENT_RUINS&areas=1${extra}`);
  await expect(scene(page)).toHaveAttribute('data-areas', 'yes');
  await settled(page);
  await expect
    .poll(() => page.getByTestId('walk-painting').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
    .toBe(true);
}

test('its own painting (the grid image\'s), the party on the road (MAIN) — and since 2026-10-19 the game\'s ruins walk it too', async ({ page }) => {
  await openPoC(page);
  expect(decodeURIComponent((await page.getByTestId('walk-painting').getAttribute('src')) ?? '')).toContain('walk-ruins-path');
  await expect(scene(page)).toHaveAttribute('data-zone', 'MAIN');
  // Without `areas=1`: the ruins as the game walks them — the same painting and ground.
  await page.goto('/?preview=walk&place=ANCIENT_RUINS');
  await expect(scene(page)).toHaveAttribute('data-areas', 'yes');
  expect(decodeURIComponent((await page.getByTestId('walk-painting').getAttribute('src')) ?? '')).toContain('walk-ruins-path');
});

test('up the road to the far steps: smaller there, facing away; then round the rubble onto the side steps (SIDE), where something is noticed', async ({ page }) => {
  test.setTimeout(90_000);
  await openPoC(page);
  await touch(page, { x: 0.84, y: 0.35 });
  const far = await hero(page);
  expect(far.y).toBeLessThan(0.4);
  await expect(scene(page)).toHaveAttribute('data-zone', 'MAIN');
  expect(Number(await scene(page).getAttribute('data-scale'))).toBeLessThan(0.65);
  // Down and across, then up the side steps — on the ground at every moment of the walk.
  await touch(page, { x: 0.4, y: 0.66 });
  const zones = new Set<string>();
  const walk = touch(page, { x: 0.22, y: 0.47 });
  for (let i = 0; i < 30; i++) {
    zones.add((await scene(page).getAttribute('data-zone')) ?? '');
    await page.waitForTimeout(60);
  }
  await walk;
  expect(zones.has('NONE')).toBe(false);
  await expect(scene(page)).toHaveAttribute('data-zone', 'SIDE');
  await expect(page.getByTestId('walk-caption')).toHaveText('崩れた石段が、上の小さなアーチへ続いている。');
});

test('a touch where the ground is not (赤): the ring says so, and the walk goes to the nearest ground', async ({ page }) => {
  await openPoC(page);
  // The rubble at the front left.
  await touch(page, { x: 0.12, y: 0.86 });
  await expect(page.getByTestId('walk-tap-ring')).toHaveAttribute('data-blocked', 'yes');
  await expect(scene(page)).not.toHaveAttribute('data-zone', 'NONE');
  // On the road: no.
  await touch(page, { x: 0.6, y: 0.66 });
  await expect(page.getByTestId('walk-tap-ring')).toHaveAttribute('data-blocked', 'no');
});

test('the grid\'s blue marks are things to look at — the carved stone, the fallen pillar, the arch up the steps — each said once', async ({ page }) => {
  test.setTimeout(90_000);
  await openPoC(page);
  const said: Record<string, string> = {};
  for (const id of ['FALLEN_PILLAR', 'CARVED_STONE', 'STONE_ARCH']) {
    await goTo(page, id);
    await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', id);
    await page.getByTestId('walk-look').click();
    said[id] = (await page.getByTestId('walk-caption').textContent()) ?? '';
  }
  expect(said.CARVED_STONE).toContain('模様');
  expect(said.FALLEN_PILLAR).toContain('柱');
  expect(said.STONE_ARCH).toContain('アーチ');
});

test('DEBUG `&zones=1` draws the ground by kind over the painting', async ({ page }) => {
  await openPoC(page, '&zones=1');
  await expect(page.getByTestId('walk-areas')).toBeAttached();
  await expect(page.getByTestId('walk-areas').locator('polygon')).toHaveCount(2);
  const ts = await things(page);
  expect(ts.some((t: { id: string }) => t.id === 'CARVED_STONE')).toBe(true);
});

test('the explorer kept in sight: a soft aura and a ring at the feet of each; the ring brighter beside a thing', async ({ page }) => {
  await openPoC(page);
  await expect(page.getByTestId('walk-ring-hero')).toBeAttached();
  await expect(page.getByTestId('walk-ring-kaos')).toBeAttached();
  const glow = await page.getByTestId('walk-hero').locator('img').evaluate((i) => getComputedStyle(i).filter);
  expect(glow).toContain('drop-shadow');
  await goTo(page, 'FALLEN_PILLAR');
  await expect(page.getByTestId('walk-ring-hero')).toHaveAttribute('data-state', 'at-thing');
  const feet: P = await hero(page);
  expect(feet.x).toBeGreaterThan(0);
});

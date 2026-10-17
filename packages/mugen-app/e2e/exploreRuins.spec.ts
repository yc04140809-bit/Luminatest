import { test, expect, type Page } from '@playwright/test';
import { marksClear } from './walk';
import { dist, goTo, hero, kaos, noticed, openFloor, scale, settled, things, touch } from './roam';

/**
 * 古代遺跡 (working title), WALKED ABOUT IN — the walk in two dimensions.
 *
 * Reached only by the developer's door (`?preview=walk&place=ANCIENT_RUINS`,
 * DEBUG builds). A touch on the floor walks the party there, across and
 * back into the picture or forward out of it, drawn smaller the farther
 * back they stand; walls and sky are not floor. Nothing shows its 「！」
 * until the party is near it, and once read the 「！」 is gone for good.
 * The arch, the banner and the steps are not the end: small finds turn up
 * on the floor while walking about, somewhere else each time, never more
 * than two waiting. It opens no world at all.
 */

const scene = (page: Page) => page.getByTestId('walk-scene');

async function openRuins(page: Page) {
  await page.goto('/?preview=walk&place=ANCIENT_RUINS');
  await expect(scene(page)).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await expect(scene(page)).toHaveAttribute('data-mode', 'roam');
  await settled(page);
  await expect
    .poll(() => page.getByTestId('walk-painting').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
    .toBe(true);
  // The first small find has turned up somewhere.
  await expect.poll(async () => (await things(page)).some((t) => t.kind === 'find')).toBe(true);
}

async function look(page: Page) {
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-caption')).not.toBeEmpty();
}

const height = async (page: Page, id: string) => (await page.getByTestId(id).boundingBox())!.height;

test('the title’s DEBUG doors include the ruins, and it opens the walk there', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('debug-walk-ruins').click();
  await expect(scene(page)).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await expect(scene(page).locator('h1')).toHaveText('古代遺跡');
  expect(decodeURIComponent((await page.getByTestId('walk-painting').getAttribute('src')) ?? '')).toContain('battle/ruins.png');
});

test('a touch on the floor walks there — forward out of the picture and back into it, smaller the farther back', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await openRuins(page);
  await expect(page.getByTestId('walk-hint')).toHaveText('地面をタップして歩く');
  // Forward, to the front of the floor.
  const front = await openFloor(page, 0.66);
  await touch(page, front);
  await expect(page.getByTestId('walk-hint')).toHaveCount(0);
  const atFront = await hero(page);
  expect(atFront.x).toBeCloseTo(front.x, 2);
  expect(atFront.y).toBeCloseTo(front.y, 2);
  const frontScale = await scale(page);
  const frontTall = await height(page, 'walk-hero');
  const frontFeet = (await page.getByTestId('walk-hero').boundingBox())!;
  // Back, into the picture: higher on the screen and smaller.
  const back = await openFloor(page, 0.545);
  await touch(page, back);
  const atBack = await hero(page);
  expect(atBack.y).toBeLessThan(atFront.y - 0.08);
  const backScale = await scale(page);
  expect(backScale).toBeLessThan(frontScale);
  expect(backScale).toBeGreaterThanOrEqual(0.78);
  expect(backScale).toBeLessThanOrEqual(0.9);
  expect(frontScale).toBeGreaterThanOrEqual(0.95);
  const backBox = (await page.getByTestId('walk-hero').boundingBox())!;
  expect(backBox.height).toBeLessThan(frontTall * 0.93);
  expect(backBox.y + backBox.height).toBeLessThan(frontFeet.y + frontFeet.height - 40);
  // Kaos keeps a step behind him, at her own depth, the same rule.
  const k = await kaos(page);
  expect(dist(k, atBack)).toBeLessThan(0.08);
  expect(Math.abs((await scale(page, 'kaos')) - backScale)).toBeLessThan(0.08);
  // And forward again.
  await touch(page, front);
  expect(await scale(page)).toBeCloseTo(frontScale, 2);
  expect(errors).toEqual([]);
});

test('walls, pillars and sky are not floor: a touch there walks to the floor nearest it', async ({ page }) => {
  await openRuins(page);
  // High on the right: the parapet, the drop and the mountains beyond.
  await touch(page, { x: 0.78, y: 0.25 });
  const p = await hero(page);
  expect(p.y).toBeGreaterThan(0.53);
  expect(p.y).toBeLessThan(0.58);
  // High on the left: the steps and the ivy.
  await touch(page, { x: 0.3, y: 0.2 });
  const q = await hero(page);
  expect(q.y).toBeGreaterThan(0.46);
  expect(q.y).toBeLessThan(0.52);
});

test('「！」 only near a thing: none from the start, it appears coming close, 調べる beside it, and once read it is gone for good', async ({
  page,
}) => {
  await openRuins(page);
  const mark = (id: string) => page.getByTestId(`walk-marker-${id}`);
  // From where they come in, nothing of the place's own is in notice.
  for (const id of ['STONE_ARCH', 'OLD_BANNER', 'BROKEN_STEPS']) await expect(mark(id)).toHaveCount(0);
  // Coming near the arch: its 「！」 appears; not yet 調べる.
  const arch = (await things(page)).find((t) => t.id === 'STONE_ARCH')!;
  await touch(page, { x: arch.stand.x + 0.1, y: arch.stand.y + 0.05 });
  await expect(mark('STONE_ARCH')).toBeVisible();
  await expect(mark('STONE_ARCH')).toHaveAttribute('data-state', 'near');
  await expect(page.getByTestId('walk-look')).toHaveCount(0);
  // It stands on the arch, above where it is looked at from.
  const m = (await mark('STONE_ARCH').boundingBox())!;
  const feet = (await page.getByTestId('walk-hero').boundingBox())!;
  expect(m.y + m.height).toBeLessThan(feet.y + feet.height - 30);
  // Beside it.
  await goTo(page, 'STONE_ARCH');
  await expect(mark('STONE_ARCH')).toHaveAttribute('data-state', 'here');
  await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', 'STONE_ARCH');
  await look(page);
  await expect(page.getByTestId('walk-caption')).toHaveText('欠けた石のアーチが、遠い山々を切り取っている。');
  // Read: no 「！」 at all — not dimmed, not grey, gone — and nothing to look at there.
  await expect(mark('STONE_ARCH')).toHaveCount(0);
  await expect(page.getByTestId('walk-look')).toHaveCount(0);
  // Walking away and back does not bring it back.
  await touch(page, await openFloor(page, 0.66));
  await touch(page, arch.stand);
  await expect(mark('STONE_ARCH')).toHaveCount(0);
  // (A small find may lie near enough to be in reach; the arch never is again.)
  await expect(page.locator('[data-testid="walk-look"][data-point="STONE_ARCH"]')).toHaveCount(0);
  expect((await things(page)).some((t) => t.id === 'STONE_ARCH')).toBe(false);
});

test('the arch, the banner and the steps each say their line once read; touching a 「！」 walks to its thing', async ({ page }) => {
  await openRuins(page);
  const said: Record<string, string> = {};
  for (const id of ['STONE_ARCH', 'OLD_BANNER', 'BROKEN_STEPS']) {
    await goTo(page, id);
    await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', id);
    await look(page);
    said[id] = (await page.getByTestId('walk-caption').textContent()) ?? '';
  }
  expect(said).toEqual({
    STONE_ARCH: '欠けた石のアーチが、遠い山々を切り取っている。',
    OLD_BANNER: '色褪せた旗が、風に小さく揺れている。',
    BROKEN_STEPS: '崩れた石段に、白い花が根を張っている。',
  });
  await expect(scene(page)).toHaveAttribute('data-read', 'STONE_ARCH OLD_BANNER BROKEN_STEPS');
  await expect(page.locator('[data-testid^="walk-figure-"]')).toHaveCount(0);
});

test('after the three, the place goes on: small finds turn up somewhere else, one after another, never the same line twice running', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openRuins(page);
  for (const id of ['STONE_ARCH', 'OLD_BANNER', 'BROKEN_STEPS']) {
    await goTo(page, id);
    await look(page);
  }
  const read: { id: string; spot: string; text: string }[] = [];
  const route = [0.66, 0.56, 0.62].flatMap((y) => [0.8, 0.3, 0.6].map((x) => ({ x, y })));
  for (let round = 0, r = 0; read.length < 4 && round < 20; round++) {
    const waiting = (await things(page)).filter((t) => t.kind === 'find');
    // Never more than two waiting at once.
    expect(waiting.length).toBeLessThanOrEqual(2);
    const f = waiting[0];
    if (!f) {
      // Nothing waiting: walk about, and give it a moment.
      await touch(page, route[r++ % route.length]);
      await page.waitForTimeout(1000);
      continue;
    }
    // A faint glint where it lies, seen from anywhere; its 「！」 only near.
    await expect(page.getByTestId(`walk-sign-${f.id}`)).toHaveCount(1);
    await goTo(page, f.id);
    await expect(page.getByTestId(`walk-marker-${f.id}`)).toBeVisible();
    await expect(page.getByTestId('walk-look')).toHaveAttribute('data-kind', 'find');
    await look(page);
    read.push({ id: f.id, spot: `${f.mark.x},${f.mark.y}`, text: (await page.getByTestId('walk-caption').textContent()) ?? '' });
    // Read: its 「！」 and its glint are gone, and it is not put straight back.
    await expect(page.getByTestId(`walk-marker-${f.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`walk-sign-${f.id}`)).toHaveCount(0);
    expect((await things(page)).some((t) => t.kind === 'find' && `${t.mark.x},${t.mark.y}` === read.at(-1)!.spot)).toBe(false);
  }
  expect(read.length).toBe(4);
  // Four different finds, four different lines, and not all on one spot.
  expect(new Set(read.map((x) => x.id)).size).toBe(4);
  expect(new Set(read.map((x) => x.text)).size).toBe(4);
  expect(new Set(read.map((x) => x.spot)).size).toBeGreaterThan(1);
  for (let i = 1; i < read.length; i++) expect(read[i].spot).not.toBe(read[i - 1].spot);
});

test('walking about without reading: no more than two finds wait at once', async ({ page }) => {
  test.setTimeout(90_000);
  await openRuins(page);
  for (const p of [
    { x: 0.3, y: 0.62 },
    { x: 0.8, y: 0.62 },
    { x: 0.2, y: 0.6 },
    { x: 0.85, y: 0.64 },
    { x: 0.4, y: 0.66 },
  ]) {
    await touch(page, p);
    await page.waitForTimeout(3200);
    expect((await things(page)).filter((t) => t.kind === 'find').length).toBeLessThanOrEqual(2);
  }
  expect((await things(page)).filter((t) => t.kind === 'find').length).toBe(2);
  // Not every one of them in notice at once: a 「！」 is for what is near.
  expect((await noticed(page)).length).toBeLessThanOrEqual(2);
});

test('it opens no world: no save is created by walking the ruins', async ({ page }) => {
  await page.goto('/?preview=walk&place=ANCIENT_RUINS');
  await page.evaluate(async () => {
    await Promise.all(
      ((await indexedDB.databases?.()) ?? []).map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
    localStorage.clear();
  });
  await openRuins(page);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))).toEqual([]);
  await goTo(page, 'STONE_ARCH');
  await look(page);
  const f = (await things(page)).find((t) => t.kind === 'find')!;
  await goTo(page, f.id);
  await look(page);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByTestId('walk-preview-leave').click();
  await expect(page.getByTestId('start-button')).toBeVisible();
});

test('controls are not floor: 調べる and the way out never move anybody', async ({ page }) => {
  await openRuins(page);
  await goTo(page, 'STONE_ARCH');
  const at = await hero(page);
  await page.getByTestId('walk-look').click();
  await page.waitForTimeout(300);
  expect(await hero(page)).toEqual(at);
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
});

test.describe('in motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('they really walk: in from the right, step by step back and forward, the camera and the far light following', async ({
    page,
  }) => {
    await page.goto('/?preview=walk&place=ANCIENT_RUINS');
    await expect(scene(page)).toHaveAttribute('data-walking', 'yes');
    await settled(page);
    const shift = (sel: string) =>
      page.evaluate((s) => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s)!).transform).m41, sel);
    // Back into the picture: sampled on the way, he climbs the screen and shrinks a little at a time.
    const p0 = await shift('.walk-painting');
    const l0 = await shift('.walk-light');
    await touch(page, { x: 0.3, y: 0.5 }, false);
    const seen: number[] = [];
    for (let i = 0; i < 40; i++) {
      seen.push(await scale(page));
      if ((await scene(page).getAttribute('data-walking')) === 'no') break;
      await page.waitForTimeout(60);
    }
    await settled(page);
    expect(new Set(seen.map((s) => s.toFixed(2))).size).toBeGreaterThan(3);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThanOrEqual(seen[i - 1] + 1e-3);
    for (let i = 1; i < seen.length; i++) expect(seen[i - 1] - seen[i]).toBeLessThan(0.03);
    // The camera followed him left; the far light by less.
    const dp = (await shift('.walk-painting')) - p0;
    const dl = (await shift('.walk-light')) - l0;
    expect(dp).toBeGreaterThan(0);
    expect(dl).toBeGreaterThan(0);
    expect(dl).toBeLessThan(dp);
    // And forward again: he grows back, a little at a time.
    await touch(page, { x: 0.4, y: 0.66 }, false);
    const grow: number[] = [];
    for (let i = 0; i < 40; i++) {
      grow.push(await scale(page));
      if ((await scene(page).getAttribute('data-walking')) === 'no') break;
      await page.waitForTimeout(60);
    }
    expect(grow.at(-1)!).toBeGreaterThan(grow[0] + 0.05);
    expect(((await scene(page).getAttribute('data-ambient')) ?? '').length).toBeGreaterThan(0);
  });

  test('a second touch while walking changes where they are going', async ({ page }) => {
    await openRuins(page);
    await touch(page, { x: 0.1, y: 0.6 }, false);
    await expect(scene(page)).toHaveAttribute('data-walking', 'yes');
    await page.waitForTimeout(250);
    await touch(page, { x: 0.85, y: 0.64 });
    expect((await hero(page)).x).toBeGreaterThan(0.6);
  });

  test('quiet moments still come, and are never in the way', async ({ page }) => {
    await openRuins(page);
    await touch(page, await openFloor(page, 0.6));
    await expect(scene(page)).toHaveAttribute('data-moment', /LEAF_PASS|LIGHT_SHIFT|BIRD_SHADOW/, { timeout: 20_000 });
    expect(await page.getByTestId('walk-moment').evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
  });
});

test('less motion asked for: no drifting touches, and a touch is a step taken at once', async ({ page }) => {
  await openRuins(page);
  await expect(page.locator('.amb')).toHaveCount(0);
  await goTo(page, 'STONE_ARCH');
  await expect(page.getByTestId('walk-look')).toBeVisible();
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: front and back, beside each thing — the party, the words, 調べる and every 「！」 on screen and clear`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await openRuins(page);
    const inside = async (id: string) => {
      const b = await page.getByTestId(id).boundingBox();
      expect(b, id).not.toBeNull();
      expect(b!.x, id).toBeGreaterThanOrEqual(0);
      expect(b!.y, id).toBeGreaterThanOrEqual(0);
      expect(b!.x + b!.width, id).toBeLessThanOrEqual(w);
      expect(b!.y + b!.height, id).toBeLessThanOrEqual(h);
    };
    const check = async () => {
      await inside('walk-hero');
      await inside('walk-kaos');
      await inside('walk-preview-leave');
      if (await page.getByTestId('walk-caption').isVisible()) await inside('walk-caption');
      if (await page.getByTestId('walk-look').isVisible()) await inside('walk-look');
      await marksClear(page, ['walk-caption', 'walk-preview-leave', 'walk-look']);
    };
    // The very front, as low as the floor goes on this screen.
    await touch(page, { x: 0.6, y: 0.95 });
    await check();
    // Beside each of the place's own things, before and after reading it.
    for (const id of ['STONE_ARCH', 'OLD_BANNER', 'BROKEN_STEPS']) {
      await goTo(page, id);
      await check();
      await look(page);
      await check();
    }
  });
}

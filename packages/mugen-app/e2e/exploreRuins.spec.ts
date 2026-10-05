import { test, expect, type Page } from '@playwright/test';

/**
 * 古代遺跡 (working title), WALKED — the forest's walk across another place.
 *
 * Reached only by the developer's door (`?preview=walk&place=ANCIENT_RUINS`,
 * DEBUG builds). The same screen as the forest — right to left, stop to
 * stop, glints up close, a quiet moment now and then, less motion when
 * asked — across a different painting. It opens no world at all.
 */

const scene = (page: Page) => page.getByTestId('walk-scene');

async function openRuins(page: Page) {
  await page.goto('/?preview=walk&place=ANCIENT_RUINS');
  await expect(scene(page)).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
  await expect
    .poll(() => page.getByTestId('walk-painting').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
    .toBe(true);
}

async function stepLeft(page: Page) {
  await page.getByTestId('walk-forward').click();
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
}

test('the title’s DEBUG doors include the ruins, and it opens the walk there', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('debug-walk-ruins').click();
  await expect(scene(page)).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await expect(scene(page).locator('h1')).toHaveText('古代遺跡');
  // The painting is the ruins' own (the battle background of the same place), as delivered.
  expect(decodeURIComponent((await page.getByTestId('walk-painting').getAttribute('src')) ?? '')).toContain('battle/ruins.png');
});

test('right to left, stop to stop: the arch, the banner, the steps — each glints up close and says what it is', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await openRuins(page);
  await expect(page.getByTestId('walk-caption')).not.toBeEmpty();
  await expect(page.getByTestId('walk-look')).toHaveCount(0);
  const x = async () => {
    const b = (await page.getByTestId('walk-hero').boundingBox())!;
    return b.x + b.width / 2;
  };
  let last = await x();
  const said: Record<string, string> = {};
  for (let i = 0; i < 5 && !(await page.getByTestId('walk-forward').isDisabled()); i++) {
    await stepLeft(page);
    const now = await x();
    expect(now, 'always further left').toBeLessThan(last);
    last = now;
    const look = page.getByTestId('walk-look');
    if (await look.isVisible()) {
      const id = (await look.getAttribute('data-point'))!;
      await expect(page.getByTestId(`walk-point-${id}`)).toHaveAttribute('data-strength', '1.00');
      await look.click();
      said[id] = (await page.getByTestId('walk-caption').textContent()) ?? '';
    }
  }
  expect(said).toEqual({
    STONE_ARCH: '欠けた石のアーチが、遠い山々を切り取っている。',
    OLD_BANNER: '色褪せた旗が、風に小さく揺れている。',
    BROKEN_STEPS: '崩れた石段に、白い花が根を張っている。',
  });
  // Nothing here belongs to the forest: no figure, no doors to a fight or a story.
  await expect(page.locator('[data-testid^="walk-figure-"]')).toHaveCount(0);
  await expect(page.getByTestId('gald-button')).toHaveCount(0);
  await expect(page.getByTestId('encounter-button')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('it opens no world: no save is created by walking the ruins', async ({ page }) => {
  // Cleared from inside the preview, which holds nothing open.
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
  for (let i = 0; i < 5 && !(await page.getByTestId('walk-forward').isDisabled()); i++) {
    await stepLeft(page);
    if (await page.getByTestId('walk-look').isVisible()) await page.getByTestId('walk-look').click();
  }
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))).toEqual([]);
  // And the way out goes back to the title.
  await page.getByTestId('walk-preview-leave').click();
  await expect(page.getByTestId('start-button')).toBeVisible();
});

test.describe('in motion', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('the same depth and quiet moments as the forest', async ({ page }) => {
    await openRuins(page);
    const shift = (sel: string) =>
      page.evaluate((s) => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s)!).transform).m41, sel);
    const [p0, n0, l0] = [await shift('.walk-painting'), await shift('.walk-near'), await shift('.walk-light')];
    await stepLeft(page);
    const dp = (await shift('.walk-painting')) - p0;
    const dn = (await shift('.walk-near')) - n0;
    const dl = (await shift('.walk-light')) - l0;
    expect(dn).toBeGreaterThan(dp);
    expect(dp).toBeGreaterThan(dl);
    expect(dl).toBeGreaterThan(0);
    expect(((await scene(page).getAttribute('data-ambient')) ?? '').length).toBeGreaterThan(0);
    // Walk back to open ground, where nothing is being looked at, and wait for one.
    await page.getByTestId('walk-back').click();
    await expect(scene(page)).toHaveAttribute('data-walking', 'no');
    await expect(scene(page)).toHaveAttribute('data-moment', /LEAF_PASS|LIGHT_SHIFT|BIRD_SHADOW/, { timeout: 20_000 });
    expect(await page.getByTestId('walk-moment').evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
  });
});

test('less motion asked for: no drifting touches, and a step is a step', async ({ page }) => {
  await openRuins(page);
  await expect(page.locator('.amb')).toHaveCount(0);
  await page.getByTestId('walk-forward').click();
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
  await expect(page.getByTestId('walk-look')).toBeVisible();
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: the party, the glint, 調べる and the words are on screen at every stop`, async ({ page }) => {
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
    for (let stop = 0; stop < 5; stop++) {
      await inside('walk-hero');
      await inside('walk-kaos');
      await inside('walk-caption');
      await inside('walk-preview-leave');
      await inside('walk-forward');
      if (await page.getByTestId('walk-look').isVisible()) {
        await inside('walk-look');
        const id = (await page.getByTestId('walk-look').getAttribute('data-point'))!;
        await inside(`walk-point-${id}`);
      }
      if (await page.getByTestId('walk-forward').isDisabled()) break;
      await stepLeft(page);
    }
  });
}

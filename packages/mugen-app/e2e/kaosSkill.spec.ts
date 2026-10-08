import { test, expect, type Page } from '@playwright/test';
import { enemyHp, readyToAct } from './battle';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * KAOS'S SKILL, IN THE DEBUG PREVIEW (2026-10-08).
 *
 * A showing part beside Levi's, Aria's and his, joined to no skill of the
 * game's — the author's motion test for her スキル (CHAOS): she steps in
 * where he stood, casting; 「双極臨界」, a seal of gold rays and a blue ring
 * round the creature; 「界核崩壊」, the seal falls into a dark core; it breaks
 * in light. Checked: the order and the two names, her picture as delivered,
 * one of her on the field at a time, the fight under it untouched (no
 * number, no health), nothing left after, ×2 — and that the game's own
 * fight never plays it.
 */

interface Frame {
  t: number;
  step: string;
  phase: string;
  seal: string;
  core: boolean;
  burst: boolean;
  cutIn: string;
  heroAside: boolean;
  fieldKaosShown: boolean;
  enemy: string;
  hits: number;
  enemyHp: string;
}

async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __on: boolean };
    w.__frames = [];
    w.__on = true;
    const t0 = performance.now();
    const tick = () => {
      const figure = document.querySelector<HTMLElement>('[data-testid="kaos-figure"]');
      const fieldKaos = document.querySelector<HTMLElement>('.bp-kaos');
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        step: figure?.dataset.step ?? '',
        phase: document.querySelector('[data-testid="kaos-phase"]')?.textContent ?? '',
        seal: document.querySelector<HTMLElement>('[data-testid="kaos-seal"]')?.dataset.step ?? '',
        core: !!document.querySelector('[data-testid="kaos-core"]'),
        burst: !!document.querySelector('[data-testid="kaos-burst"]'),
        cutIn: document.querySelector('[data-testid="cut-in-name"]')?.textContent ?? '',
        heroAside: !!document.querySelector('.bp-hero.aside'),
        fieldKaosShown: !!fieldKaos && parseFloat(getComputedStyle(fieldKaos).opacity) > 0.5,
        enemy: document.querySelector<HTMLElement>('.bp-enemy')?.dataset.sceneEnemy ?? '',
        hits: document.querySelectorAll('.bp-hit').length,
        enemyHp: document.querySelector('[data-testid="bp-enemy-hp"]')?.textContent ?? '',
      });
      if (w.__on) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function stop(page: Page): Promise<Frame[]> {
  return page.evaluate(
    () =>
      new Promise<Frame[]>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const w = window as unknown as { __frames: Frame[]; __on: boolean };
            w.__on = false;
            resolve(w.__frames);
          }),
        ),
      ),
  );
}

async function openPanel(page: Page) {
  const button = page.getByTestId('debug-kaos');
  if (!(await button.isVisible())) await page.getByTestId('debug-toggle').click();
  await expect(button).toBeVisible();
}

async function leftNothing(page: Page) {
  await expect(page.getByTestId('kaos-figure')).toHaveCount(0);
  await expect(page.getByTestId('bp-scene-over')).toHaveCount(0);
  await expect(page.locator('.bp-hero.aside')).toHaveCount(0);
  await expect(page.locator('.bp-stage[data-scene]')).toHaveCount(0);
  await expect(page.locator('.bp-enemy[data-scene-enemy]')).toHaveCount(0);
  await expect(page.getByTestId('bp-commands')).toHaveAttribute('data-locked', 'no');
}

const order = <T,>(xs: T[]) => xs.filter((x, i) => i === 0 || x !== xs[i - 1]);

for (const motion of ['no-preference', 'reduce'] as const)
  test.describe(`motion: ${motion}`, () => {
    test.use({ reducedMotion: motion });

    test('from the DEBUG panel: her cut-in 「双極臨界」, then 双極臨界, 界核崩壊, the burst — and nothing left', async ({ page }) => {
      await page.goto('/?preview=battle');
      await readyToAct(page);
      const hpBefore = await enemyHp(page);
      await openPanel(page);
      await record(page);
      await page.getByTestId('debug-kaos').click();
      await expect(page.getByTestId('kaos-figure')).toBeVisible({ timeout: 6000 });
      await expect(page.getByTestId('kaos-figure')).toHaveCount(0, { timeout: 10_000 });
      await leftNothing(page);
      const f = await stop(page);

      // Her cut-in first, under her skill's own name (the author's 双極臨界, not v18's 双極崩界), then her.
      expect(f.some((x) => x.cutIn === '双極崩界')).toBe(false);
      const cut = f.findIndex((x) => x.cutIn === '双極臨界');
      const in_ = f.findIndex((x) => x.step !== '');
      expect(cut).toBeGreaterThanOrEqual(0);
      expect(in_).toBeGreaterThan(cut);
      // Her steps, in order.
      expect(order(f.map((x) => x.step).filter(Boolean))).toEqual(['enter', 'critical', 'collapse', 'burst', 'recover']);
      // The two names in the corner, in order.
      expect(order(f.map((x) => x.phase).filter(Boolean))).toEqual(['双極臨界', '界核崩壊']);
      // The seal closes in 双極臨界 and falls in 界核崩壊; the core, then the burst.
      expect(f.some((x) => x.step === 'critical' && x.seal === 'critical')).toBe(true);
      expect(f.some((x) => x.step === 'collapse' && x.seal === 'collapse' && x.core)).toBe(true);
      expect(f.some((x) => x.step === 'burst' && x.burst)).toBe(true);
      // He steps aside for her; and she is on the field once — her place in the party empty while she casts.
      const during = f.filter((x) => ['critical', 'collapse', 'burst'].includes(x.step));
      expect(during.every((x) => x.heroAside)).toBe(true);
      expect(during.every((x) => !x.fieldKaosShown)).toBe(true);
      // The creature drawn in, then struck — and the fight under it untouched.
      expect(order(f.map((x) => x.enemy).filter(Boolean))).toEqual(['drawn', 'struck']);
      expect(f.every((x) => x.hits === 0)).toBe(true);
      expect(await enemyHp(page)).toEqual(hpBefore);
      // After: she is back in her place.
      await expect.poll(() => page.locator('.bp-kaos').evaluate((el) => parseFloat(getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
      await expect(page.getByTestId('debug-last-kaos')).toBeVisible();
    });
  });

test('her picture as delivered: kaos-cast.png, whole, not mirrored, on the screen', async ({ page }) => {
  await page.goto('/?preview=battle&debug=0&kaos=bare');
  const art = page.getByTestId('kaos-art');
  await expect(art).toBeVisible({ timeout: 6000 });
  await expect.poll(() => art.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  const seen = await art.evaluate((i: HTMLImageElement) => ({
    src: decodeURIComponent(i.currentSrc || i.src),
    natural: [i.naturalWidth, i.naturalHeight],
    fit: getComputedStyle(i).objectFit,
    transform: getComputedStyle(i).transform,
  }));
  expect(seen.src).toContain('kaos-cast');
  expect(seen.natural).toEqual([1103, 1426]);
  expect(seen.fit).toBe('contain');
  expect(seen.transform).toBe('none');
  const vp = page.viewportSize()!;
  const b = (await page.getByTestId('kaos-figure').boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(-1);
  expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 1);
});

test('×2: quicker, and still every part of it', async ({ page }) => {
  const time = async (speed: 1 | 2) => {
    await page.goto('/?preview=battle');
    await readyToAct(page);
    if (speed === 2) await page.getByTestId('bp-speed').click();
    await openPanel(page);
    await page.getByTestId('debug-kaos-cutin').click(); // 先にカットイン：なし
    await expect(page.getByTestId('debug-kaos-cutin')).toContainText('なし');
    await record(page);
    await page.getByTestId('debug-kaos').click();
    await expect(page.getByTestId('kaos-figure')).toBeVisible();
    await expect(page.getByTestId('kaos-figure')).toHaveCount(0, { timeout: 10_000 });
    const f = await stop(page);
    const on = f.filter((x) => x.step !== '');
    expect(order(on.map((x) => x.step))).toEqual(['enter', 'critical', 'collapse', 'burst', 'recover']);
    await leftNothing(page);
    return on[on.length - 1].t - on[0].t;
  };
  const slow = await time(1);
  const fast = await time(2);
  expect(slow).toBeGreaterThan(2400);
  expect(slow).toBeLessThan(4200);
  expect(fast).toBeLessThan(slow);
  expect(fast).toBeGreaterThanOrEqual(1700);
});

test('the game’s own fight never plays it', async ({ page }) => {
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
  await record(page);
  for (let i = 0; i < 3; i++) {
    await readyToAct(page);
    await page.getByTestId('bp-attack').click();
  }
  await readyToAct(page);
  const f = await stop(page);
  expect(f.some((x) => x.step !== '' || x.phase !== '' || x.seal !== '' || x.core || x.burst)).toBe(false);
  await expect(page.getByTestId('debug-kaos')).toHaveCount(0);
});

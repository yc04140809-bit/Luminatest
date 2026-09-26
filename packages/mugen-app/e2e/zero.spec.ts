import { test, expect, type Page } from '@playwright/test';
import { enemyHp, readyToAct } from './battle';
import { throughTheOpening } from './opening';

/**
 * HIS 零閃・天衝, IN THE DEBUG PREVIEW (STEP 9).
 *
 * A master of the showing, joined to no skill of the game's: his sword
 * gathers, he dashes through and past the creature, the field goes black
 * and a red moon rises, one cut splits the moon and the screen in two,
 * the halves fall, the black parts to the field again, the cut lands on
 * the creature in black blood, and he walks home. Checked: that order,
 * that he really moves (his own drawing) and comes back to the pixel,
 * that he stands behind the creature over there, that the fight under it
 * is untouched (no number, no health, no press), that nothing is left
 * after, ×2 (the moon never under 1.4s) — and that the game's own fight
 * never plays it.
 */

interface Frame {
  t: number;
  step: string;
  hero: string;
  heroLeft: number;
  moon: boolean;
  halves: number;
  cut: boolean;
  screenCut: boolean;
  brk: boolean;
  blood: number;
  streak: boolean;
  enemyBroken: boolean;
  cutIn: string;
  hits: number;
  told: boolean;
  enemyHp: string;
  locked: string;
}

async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __on: boolean };
    w.__frames = [];
    w.__on = true;
    const t0 = performance.now();
    const has = (id: string) => !!document.querySelector(`[data-testid="${id}"]`);
    const tick = () => {
      const stage = document.querySelector<HTMLElement>('.bp-stage');
      const zero = stage?.dataset.scene === 'zero';
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        step: zero ? (stage?.dataset.sceneStep ?? '') : '',
        hero: document.querySelector<HTMLElement>('.bp-hero')?.dataset.sceneHero ?? '',
        heroLeft: Math.round(document.querySelector('.bp-hero .bp-art')?.getBoundingClientRect().left ?? 0),
        moon: has('zero-moon-disc'),
        halves: document.querySelectorAll('[data-testid="zero-moon-half"]').length,
        cut: document.querySelector<HTMLElement>('.zr-over')?.dataset.cut === 'yes',
        screenCut: has('zero-screen-cut'),
        brk: has('zero-break'),
        blood: document.querySelectorAll('[data-testid="zero-blood"] i').length,
        streak: has('zero-streak'),
        enemyBroken: !!document.querySelector('.bp-enemy[data-scene-enemy="broken"]'),
        cutIn: document.querySelector('[data-testid="cut-in-name"]')?.textContent ?? '',
        hits: document.querySelectorAll('.bp-hit').length,
        told: !!document.querySelector('.bp-told'),
        enemyHp: document.querySelector('[data-testid="bp-enemy-hp"]')?.textContent ?? '',
        locked: document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') ?? '',
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
  const button = page.getByTestId('debug-zero');
  if (!(await button.isVisible())) await page.getByTestId('debug-toggle').click();
  await expect(button).toBeVisible();
}

/** Nothing of it is left: he is home, the creature as it was, the row free. */
async function leftNothing(page: Page) {
  await expect(page.locator('.bp-stage[data-scene]')).toHaveCount(0);
  await expect(page.getByTestId('bp-scene-over')).toHaveCount(0);
  await expect(page.locator('.bp-hero[data-scene-hero]')).toHaveCount(0);
  await expect(page.locator('.bp-enemy[data-scene-enemy]')).toHaveCount(0);
  await expect(page.getByTestId('zero-moon')).toHaveCount(0);
  await expect(page.getByTestId('bp-commands')).toHaveAttribute('data-locked', 'no');
}

const firstT = (f: Frame[], test: (x: Frame) => boolean) => f.find(test)?.t ?? -1;

for (const motion of ['no-preference', 'reduce'] as const)
  test.describe(`motion: ${motion}`, () => {
    test.use({ reducedMotion: motion });

    test('from the DEBUG panel: dash, black, red moon, cut, split, fall, back, black blood, home — nothing left', async ({
      page,
    }) => {
      await page.goto('/?preview=battle');
      await readyToAct(page);
      const hpBefore = await enemyHp(page);
      const homeLeft = await page.evaluate(() =>
        Math.round(document.querySelector('.bp-hero .bp-art')!.getBoundingClientRect().left),
      );
      await openPanel(page);
      await record(page);
      await page.getByTestId('debug-zero').click();
      await expect(page.locator('.bp-stage[data-scene="zero"]')).toHaveCount(1, { timeout: 6000 });
      await expect(page.locator('.bp-stage[data-scene="zero"]')).toHaveCount(0, { timeout: 12_000 });
      await leftNothing(page);
      await page.waitForTimeout(300);
      const f = await stop(page);

      // His cut-in first — the confirmed name — then the skill.
      const cut = f.findIndex((x) => x.cutIn === '零閃・天衝');
      const in_ = f.findIndex((x) => x.step !== '');
      expect(cut).toBeGreaterThanOrEqual(0);
      expect(in_).toBeGreaterThan(cut);

      // The order.
      const at = (s: string) => firstT(f, (x) => x.step === s);
      const order = ['charge', 'dash', 'hitstop', 'moon', 'pause', 'break', 'recover', 'return'];
      for (let i = 1; i < order.length; i++) expect(at(order[i])).toBeGreaterThan(at(order[i - 1]));
      // Inside the moon: the moon, then one cut through it and the screen, both halves.
      expect(firstT(f, (x) => x.moon)).toBeGreaterThanOrEqual(at('moon'));
      expect(firstT(f, (x) => x.cut)).toBeGreaterThan(firstT(f, (x) => x.moon));
      expect(f.some((x) => x.screenCut)).toBe(true);
      expect(Math.max(...f.map((x) => x.halves))).toBe(2);
      expect(f.filter((x) => x.moon).every((x) => x.step === 'moon')).toBe(true);
      // Back on the field: the cut lands, black blood, the creature struck by it only then.
      expect(f.filter((x) => x.brk).every((x) => x.step === 'break')).toBe(true);
      expect(Math.max(...f.map((x) => x.blood))).toBe(14);
      expect(f.some((x) => x.enemyBroken)).toBe(true);
      expect(f.filter((x) => x.enemyBroken).every((x) => x.step === 'break')).toBe(true);

      // He himself runs past it, and comes home to the pixel.
      const away = f.filter((x) => x.hero === 'away');
      expect(away.length).toBeGreaterThan(0);
      expect(Math.min(...away.map((x) => x.heroLeft))).toBeLessThan(homeLeft - 200);
      const after = f.filter((x) => x.step === '' && x.t > at('return'));
      expect(Math.abs(after[after.length - 1].heroLeft - homeLeft)).toBeLessThanOrEqual(1);

      // The fight under it is untouched.
      expect(f.some((x) => x.hits > 0)).toBe(false);
      expect(f.some((x) => x.told)).toBe(false);
      expect(new Set(f.map((x) => x.enemyHp)).size).toBe(1);
      expect(await enemyHp(page)).toEqual(hpBefore);
      expect(f.filter((x) => x.step !== '').every((x) => x.locked === 'yes')).toBe(true);
      await expect(page.getByTestId('debug-last-zero')).toBeVisible();
    });
  });

test('×2: quicker, and the red moon still held at least 1.4s', async ({ page }) => {
  const time = async (speed: 1 | 2) => {
    await page.goto('/?preview=battle');
    await readyToAct(page);
    if (speed === 2) await page.getByTestId('bp-speed').click();
    await openPanel(page);
    await page.getByTestId('debug-zero-cutin').click(); // 先にカットイン：なし
    await expect(page.getByTestId('debug-zero-cutin')).toContainText('なし');
    await record(page);
    await page.getByTestId('debug-zero').click();
    await expect(page.locator('.bp-stage[data-scene="zero"]')).toHaveCount(1);
    await expect(page.locator('.bp-stage[data-scene="zero"]')).toHaveCount(0, { timeout: 12_000 });
    const f = await stop(page);
    await leftNothing(page);
    const moon = f.filter((x) => x.step === 'moon');
    expect(moon[moon.length - 1].t - moon[0].t).toBeGreaterThanOrEqual(1350);
    for (const seen of [(x: Frame) => x.cut, (x: Frame) => x.brk, (x: Frame) => x.blood > 0])
      expect(f.some(seen)).toBe(true);
    const on = f.filter((x) => x.step !== '');
    return on[on.length - 1].t - on[0].t;
  };
  const slow = await time(1);
  const fast = await time(2);
  expect(fast).toBeLessThan(slow);
});

for (const [label, query, size] of [
  ['the moss rabbit', '', { width: 844, height: 390 }],
  ['Gald', '&enemy=gald', { width: 844, height: 390 }],
  ['a small phone', '', { width: 667, height: 320 }],
] as const)
  test(`where it happens — ${label}: he is past it, behind it, not far off the screen`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(`/?preview=battle&debug=0&zero=bare${query}`);
    // Over there (from the held instant to the cut landing).
    await expect(page.locator('.bp-hero[data-scene-hero="away"]')).toHaveCount(1, { timeout: 6000 });
    const at = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>('.bp-hero')!;
      const enemy = document.querySelector<HTMLElement>('.bp-enemy')!;
      const h = hero.querySelector('.bp-art')!.getBoundingClientRect();
      const e = enemy.querySelector('.bp-art')!.getBoundingClientRect();
      return {
        heroMid: h.left + h.width / 2,
        heroLeft: h.left,
        heroWidth: h.width,
        enemyMid: e.left + e.width / 2,
        heroZ: Number(getComputedStyle(hero).zIndex),
        enemyZ: Number(getComputedStyle(enemy).zIndex),
      };
    });
    // Past it: his middle beyond its middle.
    expect(at.heroMid).toBeLessThan(at.enemyMid);
    // Not far off the screen: at most a third of him over the edge.
    expect(at.heroLeft).toBeGreaterThanOrEqual(-at.heroWidth * 0.35);
    // Behind it, so the creature is seen as the cut lands.
    expect(at.heroZ).toBeLessThan(at.enemyZ);
  });

test('stopped part-way by 「もう一度」, it is gone at once and he is home', async ({ page }) => {
  // Where he stands, measured on the same fight without it.
  await page.goto('/?preview=battle');
  await readyToAct(page);
  const homeLeft = await page.evaluate(() =>
    Math.round(document.querySelector('.bp-hero .bp-art')!.getBoundingClientRect().left),
  );
  await page.goto('/?preview=battle&zero=bare');
  await expect(page.getByTestId('zero-moon')).toHaveCount(1, { timeout: 6000 });
  await openPanel(page);
  await page.getByTestId('debug-replay').click();
  await leftNothing(page);
  await page.waitForTimeout(400);
  const left = await page.evaluate(() =>
    Math.round(document.querySelector('.bp-hero .bp-art')!.getBoundingClientRect().left),
  );
  expect(Math.abs(left - homeLeft)).toBeLessThanOrEqual(1);
  await page.waitForTimeout(4500);
  await expect(page.locator('.bp-stage[data-scene]')).toHaveCount(0);
});

test("the game's own fight never plays it", async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
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
  expect(f.some((x) => x.step !== '' || x.moon || x.hero !== '')).toBe(false);
  await expect(page.getByTestId('debug-zero')).toHaveCount(0);
});

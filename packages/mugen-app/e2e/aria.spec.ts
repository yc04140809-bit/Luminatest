import { test, expect, type Page } from '@playwright/test';
import { enemyHp, readyToAct } from './battle';
import { throughTheOpening } from './opening';

/**
 * ARIA'S BLUE-ROSE ARROW, IN THE DEBUG PREVIEW (STEP 7).
 *
 * A showing part, joined to no skill of the game's: a BLESSING. She steps
 * in where he stood, leans back and draws her bow at the sky, the arrow
 * flies up and bursts in a star high over the field, a blue rose opens
 * and its light falls on the party with petals as he comes back. The
 * creature is never touched. Checked: the order, that the arrow goes up
 * and away from the party and bursts in the sky, that it all stays on the
 * screen, that the fight under it is untouched (no number, no health, no
 * stat tags, no press), that nothing is left after, ×2 — and that the
 * game's own fight never plays it.
 */

interface Frame {
  t: number;
  step: string;
  back: boolean;
  arrow: boolean;
  star: boolean;
  rose: boolean;
  crests: number;
  petals: boolean;
  cutIn: string;
  heroAside: boolean;
  heroBlessed: boolean;
  enemyTouched: boolean;
  hits: number;
  told: boolean;
  statWords: boolean;
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
      const figure = document.querySelector<HTMLElement>('[data-testid="aria-figure"]');
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        step: figure?.dataset.step ?? '',
        back: figure?.dataset.back === 'yes',
        arrow: has('aria-arrow'),
        star: has('aria-star'),
        rose: has('aria-rose'),
        crests: document.querySelectorAll('[data-testid="aria-crest"]').length,
        petals: has('aria-petals'),
        cutIn: document.querySelector('[data-testid="cut-in-name"]')?.textContent ?? '',
        heroAside: !!document.querySelector('.bp-hero.aside'),
        heroBlessed: !!document.querySelector('.bp-hero[data-scene-hero="blessed"]'),
        enemyTouched: !!document.querySelector('.bp-enemy[data-scene-enemy]'),
        hits: document.querySelectorAll('.bp-hit').length,
        told: !!document.querySelector('.bp-told'),
        statWords: /ATK|SPD|CRIT|PARTY BLESSING/.test(
          document.querySelector('[data-testid="battle-preview"]')?.textContent ?? '',
        ),
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
  const button = page.getByTestId('debug-aria');
  if (!(await button.isVisible())) await page.getByTestId('debug-toggle').click();
  await expect(button).toBeVisible();
}

/** Nothing of it is left: he is back, the creature as it was, the row free. */
async function leftNothing(page: Page) {
  await expect(page.getByTestId('aria-figure')).toHaveCount(0);
  await expect(page.getByTestId('bp-scene-field')).toHaveCount(0);
  await expect(page.getByTestId('bp-scene-over')).toHaveCount(0);
  await expect(page.locator('.bp-hero.aside')).toHaveCount(0);
  await expect(page.locator('.bp-hero[data-scene-hero]')).toHaveCount(0);
  await expect(page.locator('.bp-stage[data-scene]')).toHaveCount(0);
  await expect(page.locator('.bp-enemy[data-scene-enemy]')).toHaveCount(0);
  await expect(page.getByTestId('bp-commands')).toHaveAttribute('data-locked', 'no');
}

const firstT = (f: Frame[], test: (x: Frame) => boolean) => f.find(test)?.t ?? -1;

for (const motion of ['no-preference', 'reduce'] as const)
  test.describe(`motion: ${motion}`, () => {
    test.use({ reducedMotion: motion });

    test('from the DEBUG panel: her cut-in, the draw, the arrow bursts in the sky, the rose, its light — and nothing left', async ({
      page,
    }) => {
      await page.goto('/?preview=battle');
      await readyToAct(page);
      const hpBefore = await enemyHp(page);
      await openPanel(page);
      await record(page);
      await page.getByTestId('debug-aria').click();
      await expect(page.getByTestId('aria-figure')).toBeVisible({ timeout: 6000 });
      await expect(page.getByTestId('aria-figure')).toHaveCount(0, { timeout: 10_000 });
      await leftNothing(page);
      const f = await stop(page);

      // Her cut-in first (v18's sample, its provisional name), then her.
      const cut = f.findIndex((x) => x.cutIn === '天弓・蒼薔薇祝界');
      const in_ = f.findIndex((x) => x.step !== '');
      expect(cut).toBeGreaterThanOrEqual(0);
      expect(in_).toBeGreaterThan(cut);
      expect(f.slice(in_).some((x) => x.cutIn !== '')).toBe(false);

      // The order.
      const at = (s: string) => firstT(f, (x) => x.step === s);
      expect(at('draw')).toBeGreaterThan(at('enter'));
      expect(at('shot')).toBeGreaterThan(at('draw'));
      expect(firstT(f, (x) => x.arrow)).toBeGreaterThanOrEqual(at('shot'));
      expect(firstT(f, (x) => x.star)).toBeGreaterThan(firstT(f, (x) => x.arrow));
      expect(at('bloom')).toBeGreaterThan(firstT(f, (x) => x.star));
      expect(firstT(f, (x) => x.rose)).toBeGreaterThanOrEqual(at('bloom'));
      expect(at('bless')).toBeGreaterThan(at('bloom'));
      expect(firstT(f, (x) => x.petals)).toBeGreaterThanOrEqual(at('bless'));
      expect(firstT(f, (x) => x.back)).toBeGreaterThan(at('bless'));
      expect(at('recover')).toBeGreaterThan(firstT(f, (x) => x.back));

      // The arrow only in flight — and the creature never touched: a blessing.
      expect(f.filter((x) => x.arrow).every((x) => x.step === 'shot')).toBe(true);
      expect(f.some((x) => x.enemyTouched)).toBe(false);
      // A small rose on each of the two of them.
      expect(Math.max(...f.map((x) => x.crests))).toBe(2);

      // He steps aside for her; back in the rose's light, and she is gone.
      expect(f.filter((x) => ['draw', 'shot', 'bloom'].includes(x.step)).every((x) => x.heroAside)).toBe(true);
      expect(f.some((x) => x.heroBlessed && !x.heroAside)).toBe(true);
      expect(f.filter((x) => x.back).every((x) => !x.heroAside)).toBe(true);

      // The fight under it is untouched: no number, no line, no health, no stat tags, no press.
      expect(f.some((x) => x.hits > 0)).toBe(false);
      expect(f.some((x) => x.told)).toBe(false);
      expect(f.some((x) => x.statWords)).toBe(false);
      expect(new Set(f.map((x) => x.enemyHp)).size).toBe(1);
      expect(await enemyHp(page)).toEqual(hpBefore);
      expect(f.filter((x) => x.step !== '').every((x) => x.locked === 'yes')).toBe(true);
      await expect(page.getByTestId('debug-last-aria')).toBeVisible();
    });
  });

test('×2: quicker, and still every part of it', async ({ page }) => {
  const time = async (speed: 1 | 2) => {
    await page.goto('/?preview=battle');
    await readyToAct(page);
    if (speed === 2) await page.getByTestId('bp-speed').click();
    await openPanel(page);
    await page.getByTestId('debug-aria-cutin').click(); // 先にカットイン：なし
    await expect(page.getByTestId('debug-aria-cutin')).toContainText('なし');
    await record(page);
    await page.getByTestId('debug-aria').click();
    await expect(page.getByTestId('aria-figure')).toBeVisible();
    await expect(page.getByTestId('aria-figure')).toHaveCount(0, { timeout: 10_000 });
    const f = await stop(page);
    for (const seen of [(x: Frame) => x.arrow, (x: Frame) => x.star, (x: Frame) => x.rose, (x: Frame) => x.petals])
      expect(f.some(seen)).toBe(true);
    await leftNothing(page);
    const on = f.filter((x) => x.step !== '');
    return on[on.length - 1].t - on[0].t;
  };
  const slow = await time(1);
  const fast = await time(2);
  expect(fast).toBeLessThan(slow);
  expect(fast).toBeGreaterThanOrEqual(2200);
});

for (const [label, query, size] of [
  ['the moss rabbit', '', { width: 844, height: 390 }],
  ['Gald', '&enemy=gald', { width: 844, height: 390 }],
  ['a small phone', '', { width: 667, height: 320 }],
] as const)
  test(`where it happens — ${label}: she leans back, the arrow goes up and bursts in the sky, all on the screen`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto(`/?preview=battle&debug=0&aria=bare${query}`);
    // Measured on the frame the arrow bursts.
    const at = await page.evaluate(
      () =>
        new Promise<{
          W: number;
          H: number;
          art: { left: number; right: number; top: number; bottom: number };
          enemy: { left: number; right: number; top: number; bottom: number };
          arrow: { left: number; right: number; top: number; bottom: number };
          star: { x: number; y: number };
          tip: { x: number; y: number };
        }>((resolve) => {
          const box = (s: string) => {
            const r = document.querySelector(s)!.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          };
          const tick = () => {
            const star = document.querySelector<HTMLElement>('[data-testid="aria-star"]');
            const arrow = document.querySelector<HTMLElement>('[data-testid="aria-arrow"]');
            if (!star || !arrow) return void requestAnimationFrame(tick);
            resolve({
              W: window.innerWidth,
              H: window.innerHeight,
              // Her picture as drawn, leaning back included.
              art: box('[data-testid="aria-art"]'),
              enemy: box('.bp-enemy .bp-art'),
              arrow: box('[data-testid="aria-arrow"]'),
              star: { x: parseFloat(star.style.left), y: parseFloat(star.style.top) },
              tip: { x: parseFloat(arrow.style.left), y: parseFloat(arrow.style.top) },
            });
          };
          requestAnimationFrame(tick);
        }),
    );
    // She stands clear of the creature, on the screen, leaning back included.
    expect(at.art.left).toBeGreaterThan(at.enemy.right);
    expect(at.art.right).toBeLessThanOrEqual(at.W);
    expect(at.art.top).toBeGreaterThanOrEqual(0);
    expect(at.art.bottom).toBeLessThanOrEqual(at.H);
    // The arrow goes UP and to the left — away from the party, into the sky.
    expect(at.star.y).toBeLessThan(at.tip.y - at.H * 0.05);
    expect(at.star.x).toBeLessThan(at.tip.x);
    // It bursts high over the field — above the creature, not on it.
    expect(at.star.y).toBeLessThan(at.enemy.top);
    expect(at.star.y).toBeLessThanOrEqual(at.H * 0.2);
    // And all of it on the screen.
    expect(at.arrow.left).toBeGreaterThanOrEqual(0);
    expect(at.arrow.top).toBeGreaterThanOrEqual(0);
    expect(at.star.x).toBeGreaterThanOrEqual(0);
    expect(at.star.y).toBeGreaterThanOrEqual(0);
  });

test('the rose over the field, and its small roses on the party', async ({ page }) => {
  await page.goto('/?preview=battle&debug=0&aria=bare');
  await expect(page.getByTestId('aria-crest')).toHaveCount(2, { timeout: 6000 });
  const at = await page.evaluate(() => {
    const r = (e: Element) => e.getBoundingClientRect();
    const inside = (x: number, y: number, b: DOMRect) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    const crests = [...document.querySelectorAll<HTMLElement>('[data-testid="aria-crest"]')].map((c) => ({
      x: parseFloat(c.style.left),
      y: parseFloat(c.style.top),
    }));
    const hero = r(document.querySelector('.bp-hero .bp-art')!);
    const kaos = r(document.querySelector('.bp-kaos .bp-art')!);
    const rose = document.querySelector<HTMLElement>('[data-testid="aria-rose"]')!;
    const size = parseFloat(rose.style.width);
    return {
      onHero: crests.some((c) => inside(c.x, c.y, hero)),
      onKaos: crests.some((c) => inside(c.x, c.y, kaos)),
      rose: { x: parseFloat(rose.style.left), y: parseFloat(rose.style.top), size },
      W: window.innerWidth,
      H: window.innerHeight,
    };
  });
  expect(at.onHero).toBe(true);
  expect(at.onKaos).toBe(true);
  // The rose stands whole on the screen.
  expect(at.rose.x - at.rose.size / 2).toBeGreaterThanOrEqual(0);
  expect(at.rose.x + at.rose.size / 2).toBeLessThanOrEqual(at.W);
  expect(at.rose.y - at.rose.size / 2).toBeGreaterThanOrEqual(0);
  expect(at.rose.y + at.rose.size / 2).toBeLessThanOrEqual(at.H);
});

test('stopped part-way by 「もう一度」, it is gone at once', async ({ page }) => {
  await page.goto('/?preview=battle&aria=bare');
  await expect(page.getByTestId('aria-figure')).toHaveAttribute('data-step', 'draw', { timeout: 5000 });
  await openPanel(page);
  await page.getByTestId('debug-replay').click();
  await leftNothing(page);
  await page.waitForTimeout(4500);
  await expect(page.getByTestId('aria-figure')).toHaveCount(0);
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
  expect(f.some((x) => x.step !== '' || x.rose || x.arrow || x.heroAside)).toBe(false);
  await expect(page.getByTestId('debug-aria')).toHaveCount(0);
});

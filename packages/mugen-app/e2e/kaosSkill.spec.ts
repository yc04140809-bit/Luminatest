import { test, expect, type Page } from '@playwright/test';
import { enemyHp, readyToAct } from './battle';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * KAOS'S 双極崩界 (v19), IN THE DEBUG PREVIEW (2026-10-09).
 *
 * A showing part beside Levi's, Aria's and his, joined to no skill of the
 * game's — the author's v19 (KAOS_ULTIMATE_V19_HANDOFF.md): her cut-in
 * 「双極崩界」; she steps in where he stood; 双極臨界, the gold-and-blue aura
 * round her; the working fixed on the creature's centre; 界核崩壊, the dark,
 * the flash, the blast from its centre with five shockwaves and 36
 * fragments; back. Checked: the order, the names, the v19 base times, her
 * picture as delivered, one of her on the field at a time, the fight under
 * it untouched (no number, no health), nothing left after, ×2 (the blast at
 * least 1.8s) — and that the game's own fight never plays it.
 */

interface Frame {
  t: number;
  step: string;
  phase: string;
  aura: string;
  effect: string;
  flash: boolean;
  cutIn: string;
  heroAside: boolean;
  fieldKaosShown: boolean;
  enemy: string;
  hits: number;
  enemyHp: string;
}

/**
 * Her steps as the page commits them — every change to her `data-step`,
 * timed, whether or not a frame was painted for it. The frames below are
 * sampled once per animation frame, and on a busy machine frames can be
 * starved for longer than a step lasts (her recover, 850ms, was missed that
 * way in full runs); the order and the timings are read from this instead.
 */
interface StepMark {
  t: number;
  step: string;
}

async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __on: boolean; __steps: StepMark[]; __watch?: MutationObserver };
    w.__frames = [];
    w.__on = true;
    w.__steps = [];
    const t0 = performance.now();
    const note = () => {
      const step = document.querySelector<HTMLElement>('[data-testid="kaos-figure"]')?.dataset.step ?? '';
      if (w.__steps.length === 0 ? step !== '' : w.__steps[w.__steps.length - 1].step !== step) {
        w.__steps.push({ t: Math.round(performance.now() - t0), step });
      }
    };
    w.__watch?.disconnect();
    w.__watch = new MutationObserver(note);
    w.__watch.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-step'] });
    const tick = () => {
      const figure = document.querySelector<HTMLElement>('[data-testid="kaos-figure"]');
      const fieldKaos = document.querySelector<HTMLElement>('.bp-kaos');
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        step: figure?.dataset.step ?? '',
        phase: document.querySelector('[data-testid="kaos-phase"]')?.textContent ?? '',
        aura: document.querySelector<HTMLElement>('[data-testid="kaos-aura"]')?.className ?? '',
        effect: document.querySelector<HTMLElement>('[data-testid="kaos-effect"]')?.dataset.state ?? '',
        flash: !!document.querySelector('[data-testid="kaos-flash"].is-active'),
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

/** Her steps, in order, with when each began; the last mark (step '') is when she was gone. */
async function stepsOf(page: Page): Promise<StepMark[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __steps: StepMark[]; __watch?: MutationObserver };
    w.__watch?.disconnect();
    return w.__steps;
  });
}
const stepNames = (marks: StepMark[]) => marks.map((m) => m.step).filter(Boolean);
/** From her stepping in to her being gone. */
const lasting = (marks: StepMark[]) => marks[marks.length - 1].t - marks[0].t;

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

    test('from the DEBUG panel: her cut-in 「双極崩界」, 双極臨界, the working fixed, 界核崩壊 — and nothing left', async ({ page }) => {
      await page.goto('/?preview=battle');
      await readyToAct(page);
      const hpBefore = await enemyHp(page);
      await openPanel(page);
      await record(page);
      await page.getByTestId('debug-kaos').click();
      await expect(page.getByTestId('kaos-figure')).toBeVisible({ timeout: 6000 });
      await expect(page.getByTestId('kaos-figure')).toHaveCount(0, { timeout: 16_000 });
      await leftNothing(page);
      const f = await stop(page);
      const marks = await stepsOf(page);

      // Her cut-in first, 「双極崩界」 (v19), then her.
      expect(f.some((x) => x.cutIn === '双極臨界')).toBe(false);
      const cut = f.findIndex((x) => x.cutIn === '双極崩界');
      const in_ = f.findIndex((x) => x.step !== '');
      expect(cut).toBeGreaterThanOrEqual(0);
      expect(in_).toBeGreaterThan(cut);
      // Her steps, in order — v19's enter, channel, lock, blast, recover — and then gone.
      expect(stepNames(marks)).toEqual(['enter', 'channel', 'lock', 'blast', 'recover']);
      expect(marks[marks.length - 1].step).toBe('');
      // The two names in the corner, in order.
      expect(order(f.map((x) => x.phase).filter(Boolean))).toEqual(['双極臨界', '界核崩壊']);
      // The aura round her in 双極臨界, charged when the working is fixed.
      expect(f.some((x) => x.step === 'channel' && x.aura.includes('is-active') && !x.aura.includes('is-charged'))).toBe(true);
      expect(f.some((x) => x.step === 'lock' && x.aura.includes('is-charged'))).toBe(true);
      // The working fixed on the creature, then the blast and the flash.
      expect(order(f.map((x) => x.effect).filter((e) => e && e !== 'off'))).toEqual(['locked', 'blast']);
      expect(f.some((x) => x.step === 'blast' && x.flash)).toBe(true);
      // About as long as v19's base times (180 + 1700 + 720 + 2800 + 850).
      expect(lasting(marks)).toBeGreaterThan(5400);
      // He steps aside for her; and she is on the field once — her place in the party empty while she casts.
      const during = f.filter((x) => ['channel', 'lock', 'blast'].includes(x.step));
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

test('the blast is fixed on the creature’s centre: five shockwaves, 36 fragments, no number', async ({ page }) => {
  await page.goto('/?preview=battle&debug=0&kaos=bare');
  const effect = page.getByTestId('kaos-effect');
  await expect(effect).toHaveAttribute('data-state', 'blast', { timeout: 8000 });
  await expect(page.getByTestId('kaos-shockwave')).toHaveCount(5);
  await expect(page.getByTestId('kaos-fragment')).toHaveCount(36);
  const at = await effect.boundingBox();
  const art = (await page.getByTestId('bp-enemy-art').boundingBox())!;
  expect(Math.abs(at!.x - (art.x + art.width / 2))).toBeLessThan(art.width * 0.2);
  expect(at!.y).toBeGreaterThan(art.y);
  expect(at!.y).toBeLessThan(art.y + art.height);
  // v19's stand-in 「38」 is not drawn.
  expect(await page.locator('.ks-over').textContent()).not.toMatch(/\d/);
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
    await expect(page.getByTestId('kaos-figure')).toHaveCount(0, { timeout: 16_000 });
    await stop(page);
    const marks = await stepsOf(page);
    expect(stepNames(marks)).toEqual(['enter', 'channel', 'lock', 'blast', 'recover']);
    expect(marks[marks.length - 1].step).toBe('');
    await leftNothing(page);
    const first = (step: string) => marks.find((m) => m.step === step)!.t;
    return { whole: lasting(marks), blast: first('recover') - first('blast') };
  };
  const slow = await time(1);
  const fast = await time(2);
  expect(slow.whole).toBeGreaterThan(5400);
  expect(slow.whole).toBeLessThan(7600);
  expect(fast.whole).toBeLessThan(slow.whole);
  // v19: at ×2 the blast still keeps at least 1.8s.
  expect(fast.blast).toBeGreaterThanOrEqual(1750);
  expect(fast.whole).toBeGreaterThanOrEqual(3200);
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
  expect(f.some((x) => x.step !== '' || x.phase !== '' || x.aura !== '' || x.effect !== '' || x.flash)).toBe(false);
  await expect(page.getByTestId('debug-kaos')).toHaveCount(0);
});

import { test, expect, type Page } from './fixtures';
import { playToLifeChoice } from './helpers';

/**
 * THE PART OF THE GLASS THAT BELONGS TO THE GAME.
 *
 * A notch, a camera cutout, Android's gesture strip and the frame a
 * published copy is shown in all live inside the viewport and none of
 * them belong to the game. Held sideways they land on the LEFT and
 * RIGHT as often as the top and bottom — which is the case that was
 * actually failing: the commands along the bottom, and the right-hand
 * corner, were under somebody else's furniture and could not be
 * pressed.
 *
 * `env(safe-area-inset-*)` is nought in a desktop browser and there is
 * no API to set it, so the way to test this is to overwrite the four
 * paddings the root derives from them. That is the same measurement
 * the code makes — root content box in, stage out — with the numbers a
 * phone would have supplied.
 */
const INSETS = { top: 24, right: 48, bottom: 32, left: 48 };

async function applyInsets(page: Page, insets = INSETS) {
  await page.addStyleTag({
    content: `.landscape-root {
      padding: ${insets.top}px ${insets.right}px ${insets.bottom}px ${insets.left}px !important;
    }`,
  });
  // The stage re-measures from a ResizeObserver, which fires on the
  // next frame rather than on the next statement.
  await page.waitForTimeout(300);
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(page: Page, testId: string): Promise<Box> {
  const b = await page.getByTestId(testId).boundingBox();
  if (!b) throw new Error(`${testId} has no box`);
  return b;
}

/** Everything a thumb has to be able to reach, on the battle screen. */
const BATTLE_CONTROLS = ['bp-attack', 'bp-defend', 'bp-auto', 'bp-speed'];

test.describe('with nothing in the way', () => {
  /**
   * THE NON-DESTRUCTIVE HALF. A phone with no notch and no gesture bar
   * must be exactly where it was: the whole glass, no letterbox, scale
   * 1. If this ever fails, the fix has cost every device that did not
   * have the problem.
   */
  test('the stage is still the whole screen', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    const stage = await boxOf(page, 'landscape-stage');
    expect(Math.round(stage.width)).toBe(844);
    expect(Math.round(stage.height)).toBe(390);
    expect(Math.round(stage.x)).toBe(0);
    expect(Math.round(stage.y)).toBe(0);
  });
});

test.describe('with a notch, a cutout and a gesture bar', () => {
  test('the stage moves inside them rather than under them', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await applyInsets(page);
    const stage = await boxOf(page, 'landscape-stage');
    // Inside on every side, which is the whole claim.
    expect(stage.x).toBeGreaterThanOrEqual(INSETS.left - 1);
    expect(stage.y).toBeGreaterThanOrEqual(INSETS.top - 1);
    expect(stage.x + stage.width).toBeLessThanOrEqual(844 - INSETS.right + 1);
    expect(stage.y + stage.height).toBeLessThanOrEqual(390 - INSETS.bottom + 1);
  });

  test('the commands stay inside them, and stay thumb-sized', async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 844, height: 390 });
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await applyInsets(page);

    for (const id of BATTLE_CONTROLS) {
      const b = await boxOf(page, id);
      expect(b.x, `${id} clear of the left cutout`).toBeGreaterThanOrEqual(INSETS.left - 1);
      expect(b.y, `${id} clear of the notch`).toBeGreaterThanOrEqual(INSETS.top - 1);
      expect(b.x + b.width, `${id} clear of the right cutout`).toBeLessThanOrEqual(
        844 - INSETS.right + 1,
      );
      expect(b.y + b.height, `${id} clear of the gesture bar`).toBeLessThanOrEqual(
        390 - INSETS.bottom + 1,
      );
      // And still worth aiming at. 44 is the promise the rest of the
      // game makes; the stage may be scaled down to fit, so the test is
      // against what is actually drawn.
      expect(b.height, `${id} is thumb-sized`).toBeGreaterThanOrEqual(36);
    }
  });

  /**
   * Being inside the box is not the same as being pressable. An
   * element can be in the right place and still have something
   * transparent laid over it — which is exactly what a full-screen HUD
   * layer is. This asks the page what a thumb would actually hit.
   */
  test('a thumb that lands on a command hits the command', async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 844, height: 390 });
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await applyInsets(page);

    for (const id of BATTLE_CONTROLS) {
      const b = await boxOf(page, id);
      const hit = await page.evaluate(
        ([x, y, wanted]) => {
          const el = document.elementFromPoint(Number(x), Number(y));
          return el?.closest(`[data-testid="${wanted}"]`) !== null;
        },
        [String(b.x + b.width / 2), String(b.y + b.height / 2), id],
      );
      expect(hit, `${id} is what is under the thumb`).toBe(true);
    }
  });
});

test.describe('the smallest landscape phone, with furniture on it', () => {
  test('nothing is cut off the right-hand side', async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 800, height: 360 });
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await applyInsets(page, { top: 16, right: 44, bottom: 24, left: 44 });

    // The party column and the AUTO/×2 chips are the right-hand edge of
    // the battle screen, and the first things a cutout takes.
    for (const id of ['bx-party', 'bp-modes']) {
      const b = await boxOf(page, id);
      expect(b.x + b.width, `${id} inside the right cutout`).toBeLessThanOrEqual(800 - 44 + 1);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

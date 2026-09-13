import { test, expect } from './fixtures';
import { playToLifeChoice } from './helpers';

/**
 * WHAT A BLOW LOOKS LIKE, AND WHAT IT COSTS TO LOOK AT IT.
 *
 * The fight used to report damage and show almost none of it. What is
 * checked here is that the moment of contact is DRAWN — a number off
 * the wound rather than a sentence at the bottom of the screen — and
 * that none of the drawing costs the player anything: the commands
 * stay pressable, the fight's own numbers stay readable, and nothing
 * that appears outlives the beat it belongs to.
 */

test('a swing is seen, not just reported', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });

  const before = await page.getByTestId('bp-enemy-read').textContent();
  await page.getByTestId('bp-attack').click();

  // THE NUMBER, on the field. And it is the fight's own number: the
  // health it took off the bar is the figure that floated off it.
  const damage = page.getByTestId('bp-hit-damage');
  await expect(damage).toHaveCount(1, { timeout: 3_000 });
  const shown = Number((await damage.textContent())?.trim());
  expect(Number.isFinite(shown)).toBe(true);
  expect(shown).toBeGreaterThan(0);

  await expect(page.getByTestId('bp-enemy-read')).not.toHaveText(before ?? '');
  const after = await page.getByTestId('bp-enemy-read').textContent();
  const hpOf = (t: string | null) => Number(/(\d+)/.exec((t ?? '').replace(/\s+/g, ''))?.[1] ?? NaN);
  expect(hpOf(before) - hpOf(after), 'the number shown is the health taken').toBe(shown);
});

test('nothing it draws is left on the field', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  await page.getByTestId('bp-attack').click();
  // COUNTED, NOT "VISIBLE". The effect is a decoration and says so —
  // `aria-hidden`, and a zero-sized anchor with everything drawn out of
  // its margins — so it is deliberately not visible in the sense a
  // screen reader or `toBeVisible` means. Whether it is THERE is the
  // question, and the count answers it.
  await expect(page.getByTestId('bp-hit-fx')).toHaveCount(1, { timeout: 3_000 });
  // Gone on its own, without anybody pressing anything.
  await expect(page.getByTestId('bp-hit-fx')).toHaveCount(0, { timeout: 6_000 });
});

/**
 * A second swing arriving before the first has finished must REPLACE
 * the effect rather than stack a second one on top of it. One element,
 * always.
 */
test('a fast player never gets two effects at once', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  const attack = page.getByTestId('bp-attack');
  for (let i = 0; i < 6; i++) {
    await attack.click({ timeout: 1200 }).catch(() => {});
    expect(await page.getByTestId('bp-hit-fx').count()).toBeLessThanOrEqual(1);
    await page.waitForTimeout(90);
  }
});

/**
 * THE READING STEPS BACK, AND DOES NOT LEAVE.
 *
 * The corners dim while a blow lands so the field is what the player is
 * looking at. The numbers that say how the fight is going dim less, and
 * never to nothing: losing track of your own health to a prettier
 * screen is not a trade anybody agreed to.
 */
test('the reading steps back for a blow and comes back after it', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });

  const hud = page.getByTestId('bp-hud');
  await expect(hud).toHaveAttribute('data-stagecraft', 'IDLE');
  const opacityOf = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? Number(getComputedStyle(el).opacity) : null;
    }, sel);

  await page.getByTestId('bp-attack').click();
  await expect(hud).toHaveAttribute('data-stagecraft', 'ATTACK', { timeout: 3_000 });
  await page.waitForTimeout(200);
  const readingDuring = await opacityOf('.bx-tc');
  const vitalsDuring = await opacityOf('.bx-enemy-plate');
  expect(readingDuring!).toBeLessThan(0.9);
  expect(vitalsDuring!, 'the fight’s own numbers never go out').toBeGreaterThanOrEqual(0.3);

  // And back, on its own.
  await expect(hud).toHaveAttribute('data-stagecraft', 'IDLE', { timeout: 6_000 });
  await page.waitForTimeout(420);
  expect((await opacityOf('.bx-tc'))!).toBeGreaterThan(0.95);
});

/**
 * A cut-in is over the commands for a moment. A player who presses 攻撃
 * during one has pressed 攻撃 — every part of it is transparent to a
 * thumb, and that is what this asks the page.
 */
test('a cut-in never eats a tap', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  // Her magic is what has a cut-in, and it arrives partway through the
  // fight. Swing until she has stepped forward.
  const magic = page.getByTestId('bp-magic');
  for (let i = 0; i < 40; i++) {
    if (await magic.isVisible().catch(() => false)) break;
    const scene = page.getByTestId('magic-awakening');
    if (await scene.isVisible().catch(() => false)) {
      await scene.click({ timeout: 1200 }).catch(() => {});
      continue;
    }
    await page.getByTestId('bp-attack').click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await expect(magic).toBeVisible({ timeout: 10_000 });
  // Pressed by identity, as the suite's swinger does: the commands are
  // mid-animation most of the time and a click that waits for one to
  // settle can wait out the test.
  const press = async (id: string) => {
    await page
      .getByTestId(id)
      .evaluate((el) => {
        if (el instanceof HTMLButtonElement && !el.disabled) el.click();
      })
      .catch(() => {});
  };
  await press('bp-magic');
  await expect(page.getByTestId('magic-tray')).toBeVisible({ timeout: 5_000 });
  await press('magic-starlight_bolt');

  const cut = page.getByTestId('bp-cutin');
  await expect(cut).toHaveCount(1, { timeout: 3_000 });
  await expect(page.getByTestId('bp-cutin-name')).toContainText('《');
  // What is under the thumb where the commands are, while it plays.
  const box = (await page.getByTestId('bp-attack').boundingBox())!;
  const underneath = await page.evaluate(
    ([x, y]) => document.elementFromPoint(Number(x), Number(y))?.closest('[data-testid]')
      ?.getAttribute('data-testid') ?? null,
    [String(box.x + box.width / 2), String(box.y + box.height / 2)],
  );
  expect(underneath, 'the commands are still what a thumb hits').not.toBe('bp-cutin');
  // And it takes itself off.
  await expect(cut).toHaveCount(0, { timeout: 6_000 });
});

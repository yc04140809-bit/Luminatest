import { test, expect, type Page } from './fixtures';
import { enterDevAdmin, walkTheForestUntil } from './helpers';

/**
 * WHAT A SPELL LOOKS LIKE.
 *
 * The effects are CSS over a few empty spans, so what is worth holding
 * is not how they look — a screenshot answers that better than a test —
 * but the things that would quietly stop being true: that each spell
 * has its own, that they are gone when the beat is, that the number the
 * player reads is the number the log printed, that twice speed really
 * does shorten them, and that none of it moves the buttons.
 */
async function intoFight(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE').click();
  await page.getByTestId('battle-ui-OLD').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('dev-admin-back').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  const battle = page.getByTestId('battle-screen');
  await walkTheForestUntil(page, () => battle.isVisible().catch(() => false));
  await expect(battle).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(400);
}

async function cast(page: Page, id: string) {
  await page.getByTestId('magic-button').click();
  await page.getByTestId(`magic-${id}`).click();
}

test.describe('what a spell looks like', () => {
  test('each of the four has its own, and none of them outlives its beat', async ({ page }) => {
    await intoFight(page);
    const pairs: [string, string][] = [
      ['starlight_bolt', 'fx-starlight'],
      ['comet_strike', 'fx-comet'],
      ['star_shield', 'fx-ward'],
      ['mending_light', 'fx-mend'],
    ];
    for (const [id, fx] of pairs) {
      await cast(page, id);
      await page.waitForTimeout(200);
      await expect(page.getByTestId(fx), `${id} draws ${fx}`).toBeVisible();
      // Nobody else's effect is on screen at the same time.
      for (const [, other] of pairs) {
        if (other !== fx) await expect(page.getByTestId(other)).toHaveCount(0);
      }
      await page.waitForTimeout(1600);
      await expect(page.getByTestId(fx), `${fx} is cleared up`).toHaveCount(0);
    }
  });

  test('the shield is visible for as long as it is standing', async ({ page }) => {
    await intoFight(page);
    await expect(page.getByTestId('ward-held')).toHaveCount(0);
    await cast(page, 'star_shield');
    await page.waitForTimeout(1400);
    // Its beat is over; the shell it left is not.
    await expect(page.getByTestId('fx-ward')).toHaveCount(0);
    await expect(page.getByTestId('ward-held')).toBeVisible();
    // Four blows buy it, and the cast itself spent one.
    // Four blows buy it — blows that LAND, and the creature spends some
    // of its turns hiding instead, so this takes more than four turns.
    for (let i = 0; i < 12; i += 1) {
      if ((await page.getByTestId('ward-held').count()) === 0) break;
      if (await page.getByTestId('creature-life-choice-screen').isVisible().catch(() => false)) break;
      await page.getByTestId('attack-button').click();
      await page.waitForTimeout(900);
    }
    await expect(page.getByTestId('ward-held')).toHaveCount(0);
  });

  test('the number that floats up is the number the log printed', async ({ page }) => {
    await intoFight(page);
    // Take some damage first, so there is room to mend.
    for (let i = 0; i < 4; i += 1) {
      await page.getByTestId('attack-button').click();
      await page.waitForTimeout(800);
    }
    await cast(page, 'mending_light');
    await page.waitForTimeout(400);
    const shown = await page.getByTestId('heal-number').textContent();
    const log = (await page.getByTestId('battle-log').textContent()) ?? '';
    const printed = /HPが(\d+)回復した/.exec(log)?.[1];
    expect(printed, 'the log said how much').toBeTruthy();
    expect(shown?.replace('+', '')).toBe(printed);
  });

  test('twice speed really does halve the effects', async ({ page }) => {
    await intoFight(page);
    const fxVar = () =>
      page.evaluate(() =>
        getComputedStyle(document.querySelector('[data-testid="battle-screen"]')!)
          .getPropertyValue('--fx')
          .trim(),
      );
    expect(await fxVar()).toBe('1');
    await page.getByTestId('speed-button').click();
    expect(await fxVar()).toBe('0.5');

    // And the beat itself is shorter, which is the half that does not
    // depend on CSS: this suite runs with motion turned off, so an
    // animation-duration here would be measuring the browser rather
    // than the game. How long the effect is ON SCREEN comes from
    // `beatMs`, and that is what actually shortens.
    //
    // The bolt is held 520ms at ×1, so 260 at ×2: gone by 400, and at
    // ×1 it would still be there.
    await cast(page, 'starlight_bolt');
    await page.waitForTimeout(400);
    await expect(page.getByTestId('fx-starlight')).toHaveCount(0);
    await page.waitForTimeout(1400);

    await page.getByTestId('speed-button').click();
    expect(await fxVar()).toBe('1');
    await cast(page, 'starlight_bolt');
    await page.waitForTimeout(400);
    await expect(page.getByTestId('fx-starlight')).toBeVisible();
  });

  test('nothing an effect does moves the commands', async ({ page }) => {
    await intoFight(page);
    const row = page.getByTestId('attack-button');
    const before = (await row.boundingBox())!;
    // The comet is the one beat that leans the camera in.
    await cast(page, 'comet_strike');
    await page.waitForTimeout(240);
    const during = (await row.boundingBox())!;
    expect(during.x).toBeCloseTo(before.x, 0);
    expect(during.y).toBeCloseTo(before.y, 0);
    expect(during.width).toBeCloseTo(before.width, 0);
    await page.waitForTimeout(1400);
    const after = (await row.boundingBox())!;
    expect(after.y).toBeCloseTo(before.y, 0);
  });
});

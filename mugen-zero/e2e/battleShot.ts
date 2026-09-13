// THE BATTLE SCREEN, PHOTOGRAPHED.
//
// Not a test — it asserts nothing and nothing depends on it. It is the
// one thing that answers "what does it actually look like now", which
// is the question every round of this screen's work has turned on and
// which no amount of passing e2e can answer. It lives here rather than
// in a scratch directory because a screenshot taken a different way
// each time is not a comparison.
//
//   npx playwright test --config playwright.shot.config.ts
//
// SHOT_DIR says where they land and SHOT_TAG prefixes them, so two
// builds can be photographed side by side:
//
//   SHOT_TAG=before npx playwright test --config playwright.shot.config.ts
//
// `npm run test:e2e` never picks it up: Playwright's default testMatch
// wants a `.spec.ts`, and this deliberately is not one.

import { test } from './fixtures';
import { expect } from '@playwright/test';
import { enterDevAdmin, playToLifeChoice, swingUntil } from './helpers';

const OUT = process.env.SHOT_DIR ?? 'test-results/shots';
const TAG = process.env.SHOT_TAG ?? 'battle';

/** Every opponent the DEV ADMIN preview can put on the field. */
const OPPONENTS = ['MOSS_RABBIT', 'GALD'] as const;

for (const who of OPPONENTS) {
  test(`${who}`, async ({ page }) => {
    // The size the screen is judged on: a phone held sideways.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await page
      .locator('[data-testid="start-button"], [data-testid="continue-button"]')
      .first()
      .click();
    // A fresh profile opens on the prologue; a saved one does not.
    const monologue = page.getByTestId('prologue-monologue');
    if (await monologue.isVisible().catch(() => false)) {
      await monologue.click();
      const kaos = page.getByTestId('kaos-intro');
      for (let i = 0; i < 6; i++) await kaos.click().catch(() => {});
    }
    await expect(page.getByTestId('explore-button')).toBeVisible({ timeout: 20_000 });

    await enterDevAdmin(page);
    // Without this the story fight opens instead, on the old screen.
    await page.getByTestId('force-story-off').click();
    await page.getByTestId(`preview-opponent-${who}`).click();
    await page.getByTestId('open-battle-prototype').click();
    await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 10_000 });

    // Long enough for the opening line to have finished arriving, so
    // the picture is the screen at rest rather than mid-animation.
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${TAG}-${who}.png` });
  });
}

/**
 * AND THE STORY'S OWN FIGHT, THROUGH THE FRONT DOOR.
 *
 * Not the DEV ADMIN preview of him — the real thing, walked to from the
 * title screen the way a player reaches it. The whole point of moving
 * this fight onto the game's battle screen is that it can be looked at
 * where it actually happens, so this is the shot that is worth having.
 */
test('STORY_GALD', async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${TAG}-STORY_GALD.png` });

  // And again once he is down, which is where his own line is.
  await swingUntil(page, 'bp-attack', () =>
    page.getByTestId('bp-enemy-downed').isVisible().catch(() => false),
  );
  await expect(page.getByTestId('bp-enemy-downed')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${TAG}-STORY_GALD_DOWN.png` });
});

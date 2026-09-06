// THE SEVEN SCREENS, PHOTOGRAPHED.
//
// Not part of the test suite (no .spec in the name). This is the
// screenshot half of the landscape stabilisation pass: the seven places
// the game is judged on, taken at one phone size, into a directory you
// name. Run it before a change and after it and put the two side by
// side — a layout that is wrong is wrong in a picture, and no assertion
// in this repository would have caught a character standing off the
// bottom of the field or a title breaking one glyph per line.
//
//   SHOT_DIR=/tmp/before npx playwright test e2e/landscapeShots.ts
//
// It asserts nothing on purpose. It is a camera.

import { test, expect, type Page } from './fixtures';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { enterDevAdmin, playToLifeChoice, RING_TAPS, swingUntil } from './helpers';

const OUT = process.env.SHOT_DIR ?? resolve(process.cwd(), '..', 'review', 'landscape');

async function newWorld(page: Page) {
  await page.goto('/');
  await page
    .locator('[data-testid="start-button"], [data-testid="continue-button"]')
    .first()
    .click();
  const monologue = page.getByTestId('prologue-monologue');
  if (await monologue.isVisible().catch(() => false)) {
    await monologue.click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click().catch(() => {});
  }
  await expect(page.getByTestId('explore-button')).toBeVisible({ timeout: 20_000 });
}

async function openForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await page.locator('.phaser-wrap canvas').waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1800);
}

async function forestWith(page: Page, force: 'EVENT' | 'ITEM' | 'BATTLE', finishable = false) {
  await newWorld(page);
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId(`force-encounter-${force}`).click();
  if (finishable) await page.getByTestId('battle-start-finishable').click();
  await page.getByTestId('dev-admin-back').click();
  await openForest(page);
}

async function walkUntil(page: Page, arrived: () => Promise<boolean>) {
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  for (const at of RING_TAPS) {
    await page.mouse.click(box.x + box.width * at.fx, box.y + box.height * at.fy);
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(180);
      if (await arrived()) return;
    }
  }
}

const SHOTS: { file: string; go: (page: Page) => Promise<void> }[] = [
  {
    file: '1_tavern.png',
    go: async (page) => {
      await newWorld(page);
      await page.getByTestId('explore-button').click();
      await page.getByTestId('location-MOONLIGHT_TAVERN').click();
      await expect(page.getByTestId('talk-MOONLIGHT_TAVERN')).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(600);
    },
  },
  {
    file: '2_greenwood.png',
    go: async (page) => {
      await newWorld(page);
      await openForest(page);
    },
  },
  {
    file: '3_gald_encounter.png',
    go: async (page) => {
      await playToLifeChoice(page, '', { stopAt: 'ENCOUNTER' });
      await page.waitForTimeout(600);
    },
  },
  {
    file: '4_gald_battle.png',
    go: async (page) => {
      await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
      await page.waitForTimeout(600);
    },
  },
  {
    file: '5_gald_life_choice.png',
    go: async (page) => {
      await playToLifeChoice(page);
      await page.waitForTimeout(600);
    },
  },
  {
    file: '6_moss_rabbit_battle.png',
    go: async (page) => {
      await forestWith(page, 'BATTLE');
      const battle = page.getByTestId('battle-prototype');
      await walkUntil(page, () => battle.isVisible().catch(() => false));
      await expect(battle).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(600);
    },
  },
  {
    file: '7_moss_rabbit_down.png',
    go: async (page) => {
      await forestWith(page, 'BATTLE', true);
      const battle = page.getByTestId('battle-prototype');
      await walkUntil(page, () => battle.isVisible().catch(() => false));
      await expect(battle).toBeVisible({ timeout: 20_000 });
      const choice = page.getByTestId('bp-mugen-choice');
      await swingUntil(page, 'bp-attack', () => choice.isVisible().catch(() => false), 60_000);
      await page.waitForTimeout(600);
    },
  },
];

test.describe.configure({ mode: 'serial' });

test('photograph the seven screens', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  mkdirSync(OUT, { recursive: true });
  for (const shot of SHOTS) {
    await shot.go(page);
    await page.screenshot({ path: join(OUT, shot.file) });
  }
});

import { test, expect, type Page } from './fixtures';
import { enterDevAdmin, PHONES, viewportOf } from './helpers';

/**
 * LANDSCAPE MIGRATION — the game is played sideways now.
 *
 * Three claims are worth a test rather than a screenshot:
 *
 *  - the stage is landscape whichever way the device is held. A phone
 *    held upright gets the landscape game, turned, not a portrait one;
 *  - the battlefield has the creature on the left and the party on the
 *    right, which is a fact about coordinates and not about taste;
 *  - the battle screen is three bands in order — who is in this, what
 *    is happening, what you can do — and none of them overlap.
 */

async function newWorld(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

function stageBox(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="landscape-stage"]') as HTMLElement;
    const r = el.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      rotated: el.dataset.rotated === 'yes',
      // What the stage thinks it is, before the turn.
      laidOutW: el.offsetWidth,
      laidOutH: el.offsetHeight,
    };
  });
}

test.describe('the stage is always landscape', () => {
  for (const phone of PHONES) {
    test(`a ${phone.name} phone gets the landscape game, unturned`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      await page.goto('/');
      const box = await stageBox(page);
      expect(box.rotated, 'a landscape window needs no turning').toBe(false);
      expect(box.laidOutW).toBeGreaterThan(box.laidOutH);
      // And it covers the window exactly: no letterbox, no overhang.
      expect(box.width).toBeCloseTo(phone.width, 0);
      expect(box.height).toBeCloseTo(phone.height, 0);
    });
  }

  for (const phone of PHONES) {
    test(`a ${phone.name} phone held upright gets it turned, not squashed`, async ({ page }) => {
      // The window is portrait; the game must not be.
      await page.setViewportSize({ width: phone.height, height: phone.width });
      await page.goto('/');
      const box = await stageBox(page);
      expect(box.rotated, 'an upright phone turns the stage').toBe(true);
      // Laid out landscape …
      expect(box.laidOutW).toBe(phone.width);
      expect(box.laidOutH).toBe(phone.height);
      // … and, once turned, sitting exactly over the upright window
      // rather than off the side of it. A quarter turn about the
      // top-left corner without the push-back leaves the whole game at
      // negative x, which looks like a blank page.
      expect(Math.round(box.x)).toBe(0);
      expect(Math.round(box.y)).toBe(0);
      expect(Math.round(box.width)).toBe(phone.height);
      expect(Math.round(box.height)).toBe(phone.width);
    });
  }

  test('a turned stage is still something you can play', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await newWorld(page);
    // Not a geometry assertion: the buttons of a rotated stage have to
    // actually take a tap, or the whole approach is decorative.
    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('settings-screen')).toBeVisible();
    await page.getByTestId('settings-back').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
  });
});

test.describe('the battlefield', () => {
  for (const phone of PHONES) {
    test(`enemy left, party right, on a ${phone.name} phone`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      await newWorld(page);
      await enterDevAdmin(page);
      await page.getByTestId('open-battle-prototype').click();
      await expect(page.getByTestId('battle-prototype')).toBeVisible();

      const enemy = (await page.locator('.bp-enemy').boundingBox())!;
      const hero = (await page.locator('.bp-hero').boundingBox())!;
      const kaos = (await page.locator('.bp-kaos').boundingBox())!;

      const mid = (b: { x: number; width: number }) => b.x + b.width / 2;
      expect(mid(enemy), 'the creature is on the left half').toBeLessThan(phone.width / 2);
      expect(mid(hero), 'you are on the right half').toBeGreaterThan(phone.width / 2);
      expect(mid(kaos), 'and so is she').toBeGreaterThan(phone.width / 2);
      // Clear of each other: a fight you can read across.
      expect(enemy.x + enemy.width).toBeLessThan(hero.x);
    });
  }

  test('is three bands, in order, that do not overlap', async ({ page }) => {
    await newWorld(page);
    await enterDevAdmin(page);
    await page.getByTestId('open-battle-prototype').click();
    await expect(page.getByTestId('battle-prototype')).toBeVisible();

    const band = (await page.locator('.bp-band').boundingBox())!;
    const stage = (await page.locator('.bp-stage').boundingBox())!;
    const commands = (await page.locator('.bp-commands').boundingBox())!;

    expect(band.y + band.height, 'the band sits above the field').toBeLessThanOrEqual(stage.y + 1);
    expect(stage.y + stage.height, 'the field sits above the commands').toBeLessThanOrEqual(
      commands.y + 1,
    );
    // The middle band is the point of the screen and gets the room.
    const screen = (await page.locator('.bp-screen').boundingBox())!;
    expect(stage.height / screen.height, 'the field is most of the screen').toBeGreaterThan(0.5);
    // Both healths are readable at once, one on each side.
    const enemyHp = (await page.getByTestId('bp-enemy-hp').boundingBox())!;
    const playerHp = (await page.getByTestId('bp-player-hp').boundingBox())!;
    expect(enemyHp.x).toBeLessThan(playerHp.x);
    expect(enemyHp.x + enemyHp.width).toBeLessThanOrEqual(playerHp.x + 1);
  });
});

test.describe('nothing scrolls sideways', () => {
  for (const phone of PHONES) {
    test(`title through battle on a ${phone.name} phone`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      const noScroll = async (where: string) => {
        const over = await page.evaluate(() => ({
          x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        }));
        expect(over.x, `${where}: no sideways scroll`).toBeLessThanOrEqual(1);
        expect(over.y, `${where}: no vertical scroll`).toBeLessThanOrEqual(1);
      };
      await page.goto('/');
      await noScroll('title');
      await newWorld(page);
      await noScroll('home');
      await page.getByTestId('explore-button').click();
      await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
      await noScroll('explore');
    });
  }
});

import { test, expect, type Page } from '@playwright/test';
import { playToLifeChoice } from './helpers';

/**
 * The battle UI prototype: a second battle screen, behind a dev flag,
 * that has not been adopted.
 *
 * What these tests are for is mostly the safety rule — the old screen
 * still exists, the story's own fight never sees the new one, and the
 * flag being off is the same game as before.
 */
const SPOTS: readonly [number, number][] = [
  [180, 118], [138, 166], [224, 158], [120, 250],
  [172, 232], [238, 258], [206, 322], [134, 330],
];

async function freshWorld(page: Page) {
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

interface Setup {
  ui: 'OLD' | 'PROTOTYPE';
  story: 'on' | 'off';
  finishable?: boolean;
}

async function setup(page: Page, options: Setup) {
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId(`battle-ui-${options.ui}`).click();
  if (options.finishable) await page.getByTestId('battle-start-finishable').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId(options.story === 'on' ? 'force-story-on' : 'force-story-off').click();
  await page.getByTestId('dev-admin-back').click();
}

/** Walks the forest until a fight starts, whichever screen shows it. */
async function walkIntoAFight(page: Page): Promise<void> {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  const fighting = () =>
    page
      .getByTestId('battle-prototype')
      .or(page.getByTestId('battle-screen'))
      .isVisible()
      .catch(() => false);
  for (const [x, y] of SPOTS) {
    await page.mouse.click(box.x + box.width * (x / 360), box.y + box.height * (y / 520));
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(180);
      if (await fighting()) return;
    }
  }
}

test.describe('battle UI prototype', () => {
  test('is not what a player gets: the flag is off and the old screen shows', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'OLD', story: 'off' });
    await walkIntoAFight(page);
    await expect(page.getByTestId('battle-screen')).toBeVisible();
    await expect(page.getByTestId('battle-prototype')).toHaveCount(0);
  });

  test('shows the forest, the creature on the left and the two of them on the right', async ({
    page,
  }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off' });
    await walkIntoAFight(page);
    const stage = page.getByTestId('battle-prototype');
    await expect(stage).toBeVisible();

    // The world is on screen and is not covered by a panel.
    await expect(page.locator('.bp-bg')).toBeVisible();
    const bg = await page.locator('.bp-bg').boundingBox();
    const view = page.viewportSize()!;
    expect(bg!.width).toBeGreaterThanOrEqual(view.width - 1);
    // More than half the screen is still world.
    expect(bg!.height / view.height).toBeGreaterThan(0.5);

    // Left is the enemy; right is the party.
    const enemy = (await page.locator('.bp-enemy').boundingBox())!;
    const hero = (await page.locator('.bp-hero').boundingBox())!;
    const kaos = (await page.locator('.bp-kaos').boundingBox())!;
    expect(enemy.x + enemy.width / 2).toBeLessThan(view.width / 2);
    expect(hero.x + hero.width / 2).toBeGreaterThan(view.width / 2);
    expect(kaos.x + kaos.width / 2).toBeGreaterThan(view.width / 2);
    // He stands between her and it.
    expect(hero.x).toBeLessThan(kaos.x);
    // Nobody is a postage stamp.
    expect(enemy.height).toBeGreaterThan(80);
    expect(hero.height).toBeGreaterThan(80);
    // And they do not sit on top of each other.
    expect(hero.x + hero.width).toBeLessThan(kaos.x + kaos.width);

    await expect(page.getByTestId('bp-enemy-hp')).toContainText('モスラビット');
    await expect(page.getByTestId('bp-player-hp')).toContainText('40/40');
    await expect(page.getByTestId('bp-message')).toContainText('モスラビット');
    await expect(page.getByTestId('bp-attack')).toBeVisible();
    await expect(page.getByTestId('bp-skill')).toBeVisible();
    // Fighting is not deciding: no life question while it is a fight.
    await expect(page.getByTestId('bp-mugen-choice')).toHaveCount(0);
  });

  test('uses the real battle logic, not a mock of it', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off' });
    await walkIntoAFight(page);
    const hp = page.getByTestId('bp-enemy-hp');
    await expect(hp).toContainText('22/22');
    await page.getByTestId('bp-attack').click();
    // The existing numbers: the player hits for 8 to 12.
    await expect(hp).not.toContainText('22/22');
    await expect(page.getByTestId('bp-message')).toContainText('ダメージ');
  });

  test('opens the skill tray without inventing a skill system', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off' });
    await walkIntoAFight(page);
    const tray = page.getByTestId('bp-skill-tray');
    await expect(tray).toHaveCount(0);
    await page.getByTestId('bp-skill').click();
    await expect(tray).toBeVisible();
    // One thing that exists, and an honest gap where the rest will go.
    await expect(page.getByTestId('bp-skill-guard')).toBeVisible();
    await page.getByTestId('bp-skill').click();
    await expect(tray).toHaveCount(0);
  });

  test('an ordinary fight ends ordinarily, back on the path', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off', finishable: true });
    await walkIntoAFight(page);
    await page.getByTestId('bp-attack').click();
    await expect(page.getByTestId('bp-normal-end')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('bp-mugen-choice')).toHaveCount(0);
    await page.getByTestId('bp-normal-end').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  });

  test('the commands become the four answers only once there is a life to decide', async ({
    page,
  }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'on', finishable: true });
    await walkIntoAFight(page);
    await expect(page.getByTestId('bp-commands')).toBeVisible();
    await page.getByTestId('bp-attack').click();

    const mugen = page.getByTestId('bp-mugen-choice');
    await expect(mugen).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('bp-attack')).toHaveCount(0);
    for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
      const button = await page.getByTestId(`bp-mugen-${id}`).boundingBox();
      expect(button!.height, `${id} is a real target`).toBeGreaterThanOrEqual(44);
    }

    await page.getByTestId('bp-mugen-SPARE').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // The choice made in the new UI is the real one, written by the same
    // code the old screen's path uses.
    const kinds = await page.evaluate(
      () =>
        new Promise<string[]>((resolve, reject) => {
          const open = indexedDB.open('mugen-zero-save');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const rq = db
              .transaction('memory_events', 'readonly')
              .objectStore('memory_events')
              .getAll();
            rq.onsuccess = () => {
              db.close();
              resolve((rq.result as { type: string }[]).map((e) => e.type));
            };
            rq.onerror = () => reject(rq.error);
          };
        }),
    );
    expect(kinds).toContain('PLAYER_SPARED_CREATURE');
  });

  test("never touches the story's own fight, flag on or not", async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('mugen-battle-ui', 'PROTOTYPE'));
    await page.evaluate(async () => {
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
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    // Gald is fought on the screen he has always been fought on.
    await expect(page.getByTestId('battle-screen')).toBeVisible();
    await expect(page.getByTestId('gald-portrait-ready')).toBeVisible();
    await expect(page.getByTestId('battle-prototype')).toHaveCount(0);
  });

  for (const width of [360, 390, 412]) {
    test(`fits a ${width}px phone without scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await freshWorld(page);
      await setup(page, { ui: 'PROTOTYPE', story: 'off' });
      await walkIntoAFight(page);
      await expect(page.getByTestId('battle-prototype')).toBeVisible();

      const scrolls = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      }));
      expect(scrolls.x, 'no sideways scroll').toBe(false);
      expect(scrolls.y, 'no vertical scroll').toBe(false);

      for (const id of ['bp-attack', 'bp-skill']) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box.height, `${id} is thumb-sized`).toBeGreaterThanOrEqual(44);
      }
      // The message is on screen and readable, not clipped away.
      const message = (await page.getByTestId('bp-message').boundingBox())!;
      expect(message.width).toBeGreaterThan(width * 0.8);
      expect(message.y + message.height).toBeLessThanOrEqual(844);
    });
  }
});

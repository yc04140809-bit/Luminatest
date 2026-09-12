import { test, expect, type Page } from './fixtures';
import { enterDevAdmin, PHONES, viewportOf } from './helpers';

/**
 * LANDSCAPE MIGRATION — the game is played sideways now.
 *
 * Three claims are worth a test rather than a screenshot:
 *
 *  - the stage is landscape whichever way the device is held, and is
 *    never TURNED to get there. A phone held upright gets a smaller
 *    landscape stage the right way up, not the game printed up its side;
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
      portraitHost:
        (document.querySelector('[data-testid="landscape-root"]') as HTMLElement).dataset
          .portraitHost === 'yes',
      // What the stage was laid out as, before any transform. If these
      // and the rect above disagree, something is being turned.
      laidOutW: el.offsetWidth,
      laidOutH: el.offsetHeight,
      transform: getComputedStyle(el).transform,
    };
  });
}

test.describe('the stage is always landscape', () => {
  for (const phone of PHONES) {
    test(`a ${phone.name} phone gets the landscape game, unturned`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      await page.goto('/');
      const box = await stageBox(page);
      expect(box.portraitHost, 'a sideways phone is not a portrait host').toBe(false);
      expect(box.laidOutW).toBeGreaterThan(box.laidOutH);
      // And it covers the window exactly: no letterbox, no overhang.
      expect(box.width).toBeCloseTo(phone.width, 0);
      expect(box.height).toBeCloseTo(phone.height, 0);
    });
  }

  for (const phone of PHONES) {
    test(`a ${phone.name} phone held upright gets a smaller stage, not a turned one`, async ({
      page,
    }) => {
      // The window is portrait; the game must not be, and must not be
      // rotated into place either. This is the assertion the whole
      // stabilisation pass exists for.
      const window = { width: phone.height, height: phone.width };
      await page.setViewportSize(window);
      await page.goto('/');
      const box = await stageBox(page);
      expect(box.portraitHost, 'an upright phone is a portrait host').toBe(true);
      // Nothing is turned: no transform, and the box on screen is the
      // box that was laid out — a rotated element's rect has its width
      // and height the other way round.
      expect(box.transform === 'none' || box.transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
      expect(Math.round(box.width)).toBe(box.laidOutW);
      expect(Math.round(box.height)).toBe(box.laidOutH);
      // Landscape-shaped, and inside the window rather than over its edge.
      expect(box.laidOutW).toBeGreaterThan(box.laidOutH);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(window.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(window.height + 1);
      // And the player is told why the game got smaller.
      await expect(page.getByTestId('turn-hint')).toBeVisible();
    });
  }

  test('text on an upright phone reads across, not up the side', async ({ page }) => {
    // A quarter-turned stage passes every geometry assertion above and
    // is still unreadable, because every glyph in it is on its side.
    // The only way to catch that from a test is to ask the browser what
    // the text is actually doing.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const start = page.getByTestId('start-button');
    await expect(start).toBeVisible();
    const box = (await start.boundingBox())!;
    expect(box.width, 'a button of upright text is wider than it is tall').toBeGreaterThan(
      box.height,
    );
    const turned = await start.evaluate((el) => {
      // Shrinking the stage is allowed and expected (a pure scale has
      // zero in the b and c places of the matrix). Turning or skewing
      // it is what this is looking for.
      for (let node: HTMLElement | null = el as HTMLElement; node; node = node.parentElement) {
        const t = getComputedStyle(node).transform;
        if (!t || t === 'none') continue;
        const m = t.match(/^matrix\(([^)]+)\)$/);
        if (!m) return t;
        const [, b, c] = m[1].split(',').map((n) => Number(n.trim()));
        if (Math.abs(b) > 0.001 || Math.abs(c) > 0.001) return t;
      }
      return null;
    });
    expect(turned, 'nothing between the button and the page is rotated').toBeNull();
    // And the whole title screen fits inside the shrunk stage rather
    // than hanging off the bottom of it: a game you cannot press START
    // on is not a game that fits.
    const stage = (await page.getByTestId('landscape-stage').boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(stage.y - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
  });

  test('a shrunk stage is still something you can play', async ({ page }) => {
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

  /**
   * THE FIELD IS THE SCREEN, AND THE READING IS IN THE CORNERS.
   *
   * This used to check three bands in order, which was the shape the
   * battle screen had: numbers on top, field in the middle, commands
   * underneath. The overhaul made the field the whole surface and put
   * every panel into a corner of it, so what is checked is the promise
   * that shape was making — that the fight gets the screen, and the
   * reading does not stand in front of it.
   */
  test('is one field with the reading laid into its corners', async ({ page }) => {
    await newWorld(page);
    await enterDevAdmin(page);
    await page.getByTestId('open-battle-prototype').click();
    await expect(page.getByTestId('battle-prototype')).toBeVisible();

    const screen = (await page.locator('.bp-screen').boundingBox())!;
    const stage = (await page.locator('.bp-stage').boundingBox())!;
    expect(stage.height / screen.height, 'the field is the screen').toBeGreaterThan(0.95);
    expect(stage.width / screen.width, 'edge to edge').toBeGreaterThan(0.95);

    // Each panel in its own corner, and the middle of the field left
    // empty for the fighting to happen in.
    const mid = { x: screen.x + screen.width / 2, y: screen.y + screen.height / 2 };
    const corners = {
      'bx-turn-order': ['left', 'top'],
      'bp-enemy-hp': ['left', 'top'],
      'bx-party': ['right', 'top'],
      'bx-world-memory': ['left', 'bottom'],
      'bp-modes': ['right', 'bottom'],
      'bp-commands': ['centre', 'bottom'],
    } as const;
    for (const [id, [side, end]] of Object.entries(corners)) {
      const box = (await page.getByTestId(id).boundingBox())!;
      if (side === 'left') expect(box.x, `${id} is on the left`).toBeLessThan(mid.x);
      if (side === 'right') {
        expect(box.x + box.width, `${id} is on the right`).toBeGreaterThan(mid.x);
      }
      if (side === 'centre') {
        const centre = box.x + box.width / 2;
        expect(Math.abs(centre - mid.x), `${id} is centred`).toBeLessThan(screen.width * 0.06);
      }
      if (end === 'top') expect(box.y, `${id} is near the top`).toBeLessThan(mid.y);
      if (end === 'bottom') {
        expect(box.y + box.height, `${id} is near the bottom`).toBeGreaterThan(mid.y);
      }
      expect(box.x, `${id} is not off the left`).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, `${id} is not off the right`).toBeLessThanOrEqual(
        screen.x + screen.width + 1,
      );
    }

    // Both healths are readable at once, one on each side.
    const enemyHp = (await page.getByTestId('bp-enemy-hp').boundingBox())!;
    const playerHp = (await page.getByTestId('bp-player-hp').boundingBox())!;
    expect(enemyHp.x).toBeLessThan(playerHp.x);
    expect(enemyHp.x + enemyHp.width).toBeLessThanOrEqual(playerHp.x + 1);

    // And there is no MUGEN ZERO logo in the corner of a fight: the
    // brief took it out because a brand mark is the one thing on this
    // screen that tells the player nothing.
    await expect(page.locator('.bp-screen .home-crest-name, .bp-screen .title-logo')).toHaveCount(0);
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
      // Wait for the app to have its stylesheet before measuring it. The
      // dev server injects CSS from JavaScript, so for a frame or two
      // after the HTML lands the page is unstyled — body carries its
      // default 8px margin and the document is 8px taller than the
      // window. That is a fact about the dev server, not about the
      // layout, and measuring it says nothing.
      await expect(page.getByTestId('landscape-stage')).toBeVisible();
      await expect(page.getByTestId('start-button')).toBeVisible();
      await noScroll('title');
      await newWorld(page);
      await noScroll('home');
      await page.getByTestId('explore-button').click();
      await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
      await noScroll('explore');
    });
  }
});

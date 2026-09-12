import { test, expect, type Page } from './fixtures';
import { enterDevAdmin, PHONES, RING_TAPS, viewportOf } from './helpers';

/**
 * THE BATTLE HUD — the four corners of the new battle screen.
 *
 * The overhaul turned the fight into the whole screen and moved every
 * piece of reading into a corner of it. What is checked here is that
 * each of those pieces says something TRUE, because a panel that is
 * decorative is worse than no panel: a player who learns that the turn
 * order or the depth meter means nothing stops reading the rest.
 *
 * The three commands that are new — アイテム, 防御 and 逃走 — are here
 * too, because the brief lists all three as things a fight must have
 * and none of them existed before.
 */
test.describe.configure({ mode: 'parallel' });

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

/** The prototype on its own, from DEV ADMIN. Writes nothing. */
async function openPreview(page: Page) {
  await enterDevAdmin(page);
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('open-battle-prototype').click();
  await expect(page.getByTestId('battle-prototype')).toBeVisible();
  // The commands are not on screen at once: Kaos steps in at the start
  // of a fight and the row arrives when she is done.
  await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 10_000 });
}

/**
 * Sets a real forest fight up and leaves the player on HOME.
 *
 * Split from the walk on purpose: the preset writes a world with some
 * history in it, so anything counting what the world remembers has to
 * read the count AFTER this and not before.
 */
async function armForestFight(page: Page) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('battle-ui-PROTOTYPE').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('force-chaos-NONE').click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('home-memory')).toBeVisible();
}

/** And then walks into it. */
async function walkIntoAFight(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2200);
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  const fighting = () =>
    page
      .getByTestId('battle-prototype')
      .isVisible()
      .catch(() => false);
  for (let pass = 0; pass < 2; pass++) {
    for (const at of RING_TAPS) {
      await page.mouse.click(box.x + box.width * at.fx, box.y + box.height * at.fy);
      for (let i = 0; i < 16; i++) {
        await page.waitForTimeout(180);
        if (await fighting()) return;
      }
    }
  }
  throw new Error('never walked into a fight');
}

test.describe('TURN ORDER', () => {
  test('reads left to right and says who is acting', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);

    const strip = page.getByTestId('bx-turn-order');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText('TURN ORDER');

    // Two in the fight, so the strip alternates. Exactly one of them is
    // lit, and while nobody is swinging it is the player's turn next.
    const turns = strip.locator('.bx-turn');
    await expect(turns).toHaveCount(5);
    await expect(page.getByTestId('bx-turn-acting')).toHaveCount(1);
    await expect(turns.nth(0)).toHaveAttribute('data-actor', 'hero');
    await expect(turns.nth(1)).toHaveAttribute('data-actor', 'moss_rabbit');
    await expect(turns.nth(2)).toHaveAttribute('data-actor', 'hero');
  });

  /**
   * The one that makes the strip worth having: it has to move. A strip
   * that always says "you" would pass every assertion above and be a
   * picture of a turn order rather than a turn order.
   */
  test('turns over to the creature while the creature is acting', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    const first = page.getByTestId('bx-turn-order').locator('.bx-turn').first();

    // Watch the strip through a whole turn rather than sampling it: the
    // creature's half is a few hundred milliseconds and a poll from the
    // driver would walk straight past it.
    await page.evaluate(() => {
      const w = window as unknown as { __turns: string[] };
      w.__turns = [];
      const strip = document.querySelector('[data-testid="bx-turn-order"]')!;
      const record = () => {
        const who = strip.querySelector('.bx-turn')?.getAttribute('data-actor') ?? '?';
        if (w.__turns[w.__turns.length - 1] !== who) w.__turns.push(who);
      };
      record();
      new MutationObserver(record).observe(strip, {
        subtree: true,
        attributes: true,
        childList: true,
        attributeFilter: ['data-actor', 'class'],
      });
    });

    await page.getByTestId('bp-attack').click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __turns: string[] }).__turns), {
        timeout: 15_000,
      })
      .toContain('moss_rabbit');
    // And it comes back to the player when the turn is over.
    await expect(first).toHaveAttribute('data-actor', 'hero', { timeout: 15_000 });
  });
});

test.describe('the party column', () => {
  test('lists everybody on the player’s side with a resource each', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);

    const party = page.getByTestId('bx-party');
    await expect(party).toBeVisible();
    await expect(party.locator('.bx-member')).toHaveCount(2);

    // His health is the one the fight keeps, and it is readable as a
    // pair of numbers rather than as a bar somebody has to estimate.
    await expect(page.getByTestId('bx-member-hero')).toContainText('あなた');
    await expect(page.getByTestId('bp-player-hp')).toHaveText(/(\d+) \/ \1$/);

    // Hers is the magic, which is what `playerMp` actually is. Before
    // she has reached past what she was doing there is no pool to show,
    // and the card says what she IS doing instead of drawing an empty
    // bar nobody is keeping.
    await expect(page.getByTestId('bx-member-kaos')).toContainText('ケイオス');
    await expect(page.getByTestId('bx-member-kaos')).toContainText('魔法');
  });

  test('is on the right, and the creature’s plate is on the left', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    const view = page.viewportSize()!;
    const party = (await page.getByTestId('bx-party').boundingBox())!;
    const enemy = (await page.getByTestId('bp-enemy-hp').boundingBox())!;
    expect(enemy.x + enemy.width / 2, 'the creature reads on its own side').toBeLessThan(
      view.width / 2,
    );
    expect(party.x + party.width / 2, 'and the party on theirs').toBeGreaterThan(view.width / 2);
  });
});

test.describe('WORLD MEMORY, in a fight', () => {
  test('is in the corner, and says how deep the memory runs', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);

    const panel = page.getByTestId('bx-world-memory');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('WORLD MEMORY');
    await expect(panel).toContainText('記憶の深さ');
    // A real percentage, whatever it is. A new world has collected
    // nothing, so the rows are the ones it can still fill.
    await expect(page.getByTestId('bx-memory-depth')).toHaveText(/\d+%$/);
    await expect(panel.locator('.bx-memory-list li')).toHaveCount(4);
  });

  test('does not stand in front of anybody on the field', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    const panel = (await page.getByTestId('bx-world-memory').boundingBox())!;
    for (const who of ['.bp-enemy', '.bp-hero', '.bp-kaos']) {
      const body = (await page.locator(who).boundingBox())!;
      const overlaps =
        panel.y < body.y + body.height &&
        body.y < panel.y + panel.height &&
        panel.x < body.x + body.width &&
        body.x < panel.x + panel.width;
      expect(overlaps, `WORLD MEMORY does not cover ${who}`).toBe(false);
    }
  });
});

test.describe('the three commands the overhaul added', () => {
  test('アイテム opens, is honest about being empty, and closes', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    const tray = page.getByTestId('bp-item-tray');
    await expect(tray).toHaveCount(0);
    await page.getByTestId('bp-item').click();
    await expect(tray).toBeVisible();
    await expect(tray).toContainText('持ち物はまだない。');
    await page.getByTestId('bp-item').click();
    await expect(tray).toHaveCount(0);
  });

  test('防御 is a turn, taken from the command row', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    // A guard is a turn: the creature answers it, so the log moves.
    const message = page.getByTestId('bp-message');
    const before = await message.textContent();
    await page.getByTestId('bp-defend').click();
    await expect(message).not.toHaveText(before ?? '', { timeout: 10_000 });
  });

  /**
   * 逃走. Running away is neither winning nor losing: the player is put
   * back where they came from, and nothing about the creature is
   * written down — no victory, no name, no life decided about.
   */
  test('逃走 leaves the fight and puts the player back on the path', async ({ page }) => {
    test.setTimeout(120_000);
    await freshWorld(page);
    await armForestFight(page);
    // What the world remembers BEFORE the fight — read after the world
    // itself is set up, so the number is this fight's starting point and
    // not an empty world's. The claim being checked is that running away
    // writes nothing, which is a DIFFERENCE rather than a number this
    // test had to know.
    const memories = page.getByTestId('home-memory-count');
    const before = await memories.textContent();
    await walkIntoAFight(page);
    await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 10_000 });

    const escape = page.getByTestId('bp-escape');
    await expect(escape).toBeVisible();
    await expect(escape).toContainText('逃走');
    await escape.click();

    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('battle-prototype')).toHaveCount(0);
    // Nobody was asked about a life. Running from a creature is not one
    // of the four answers and must never turn into one.
    await expect(page.getByTestId('bp-mugen-choice')).toHaveCount(0);
    await expect(page.getByTestId('life-choice-screen')).toHaveCount(0);

    // And WORLD MEMORY did not grow. This is the sensor that can be
    // read from outside DEV: a creature met and decided about writes a
    // row, and running away must not. What it does NOT prove on its own
    // is the defeat tally, which no screen outside GOD VIEW shows — the
    // guard for that is that `onEscape` in App.tsx never touches it.
    // Out of the trees, back to the map, and home to the panel.
    await page.getByTestId('leave-forest').click();
    await page.getByRole('button', { name: 'もどる' }).click();
    await expect(page.getByTestId('home-memory')).toBeVisible({ timeout: 20_000 });
    await expect(memories).toHaveText(before ?? '');
  });

  test('逃走 is not on the command row, where a thumb goes for 攻撃', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    const attack = (await page.getByTestId('bp-attack').boundingBox())!;
    const escape = (await page.getByTestId('bp-escape').boundingBox())!;
    const overlaps =
      escape.x < attack.x + attack.width &&
      attack.x < escape.x + escape.width &&
      escape.y < attack.y + attack.height &&
      attack.y < escape.y + escape.height;
    expect(overlaps, 'nothing about leaving is under the attack thumb').toBe(false);
    expect(escape.x, 'it is off in the corner with AUTO').toBeGreaterThan(
      attack.x + attack.width,
    );
  });
});

/**
 * AND THE ONE THING THAT WAS REMOVED. The brief takes the MUGEN ZERO
 * logo out of the battle screen's top left, because a brand mark in the
 * corner of a fight is the one thing there that tells the player
 * nothing — and the corner it was in is now the turn order's.
 */
test('no brand mark stands in the corner of a fight', async ({ page }) => {
  await freshWorld(page);
  await openPreview(page);
  await expect(page.locator('.bp-screen .home-crest-name')).toHaveCount(0);
  await expect(page.locator('.bp-screen .title-logo')).toHaveCount(0);
  await expect(page.getByTestId('battle-prototype')).not.toContainText('MUGEN ZERO');
});

test.describe('the corners fit the phone', () => {
  for (const phone of PHONES) {
    test(`nothing is cut off on a ${phone.name} phone`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      await freshWorld(page);
      await openPreview(page);
      const view = page.viewportSize()!;
      for (const id of [
        'bx-turn-order',
        'bp-enemy-hp',
        'bx-party',
        'bx-world-memory',
        'bp-commands',
        'bp-modes',
        'bp-message',
      ]) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box.x, `${id} is not off the left`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${id} is not off the right`).toBeLessThanOrEqual(
          view.width + 1,
        );
        expect(box.y, `${id} is not off the top`).toBeGreaterThanOrEqual(-1);
        expect(box.y + box.height, `${id} is not off the bottom`).toBeLessThanOrEqual(
          view.height + 1,
        );
      }
      const scrolls = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      }));
      expect(scrolls.x, 'no sideways scroll').toBe(false);
      expect(scrolls.y, 'no vertical scroll').toBe(false);
    });
  }
});

import { test, expect, type Page } from './fixtures';
import { enterDevAdmin } from './helpers';

/**
 * ARCANA — the book, and the way a life fills it in.
 *
 * The rules being held to here are the ones a player would notice if
 * they broke: a page nobody has met stays shut, the same fight fought
 * again teaches nothing, the completion moment happens once, a reload
 * keeps everything, and a reset takes it all with the rest of the
 * world.
 */

const RING_SPOTS: readonly [number, number][] = [
  [180, 118], [138, 166], [224, 158], [120, 250],
  [172, 232], [238, 258], [206, 322], [134, 330],
];

async function wipe(page: Page) {
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
}

async function freshWorld(page: Page) {
  await page.goto('/');
  await wipe(page);
  await page.reload();
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function dev(page: Page, body: (page: Page) => Promise<void>) {
  await enterDevAdmin(page);
  await body(page);
  await page.getByTestId('dev-admin-back').click();
}

/** Puts the page into a state worth looking at, without a dozen fights. */
async function setArcana(page: Page, label: string) {
  await dev(page, async () => {
    await page.getByTestId(`arcana-set-${label}`).click();
  });
}

async function openBook(page: Page) {
  await page.getByTestId('arcana-button').click();
  await expect(page.getByTestId('arcana-list')).toBeVisible();
}

/** Reads the percentage off the list card. */
async function listedPercent(page: Page): Promise<number> {
  const text = (await page.getByTestId('arcana-pct-moss_rabbit').textContent()) ?? '';
  return Number(text.replace('%', '').trim());
}

/**
 * Sets the forest up for a fight that can be finished in one blow.
 *
 * Two things to know about DEV ADMIN, both of which bit this file
 * before it was written this way: the scenario preset RESETS the world
 * (arcana included, which is correct), so anything the test wants
 * remembered has to be set AFTER it; and 「決着可能から開始」 is a
 * toggle, so pressing it twice turns it back off.
 */
async function armBattle(page: Page, options: { story: 'on' | 'off'; chaos?: string }) {
  await dev(page, async () => {
    await page.getByTestId('preset-SPARE_3Y').click();
    await page.getByTestId('force-encounter-BATTLE').click();
    await page.getByTestId(options.story === 'on' ? 'force-story-on' : 'force-story-off').click();
    const finishable = page.getByTestId('battle-start-finishable');
    if ((await finishable.textContent())?.includes('OFF')) await finishable.click();
    await expect(finishable).toContainText('ON');
    await page.getByTestId(`force-chaos-${options.chaos ?? 'NONE'}`).click();
    await page.getByTestId('force-enemy-ATTACK').click();
  });
}

async function walkIntoFight(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2200);
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  const fighting = () =>
    page
      .getByTestId('battle-prototype')
      .or(page.getByTestId('battle-screen'))
      .isVisible()
      .catch(() => false);
  for (let pass = 0; pass < 2; pass++) {
    for (const [x, y] of RING_SPOTS) {
      await page.mouse.click(box.x + box.width * (x / 360), box.y + box.height * (y / 520));
      for (let i = 0; i < 16; i++) {
        await page.waitForTimeout(180);
        if (await fighting()) return;
      }
    }
  }
}

test.describe('the ARCANA book', () => {
  test('is on the way home from everywhere, and starts shut', async ({ page }) => {
    await freshWorld(page);
    await openBook(page);
    // The book exists before anything is in it: there is a page there,
    // and it does not say what.
    await expect(page.getByTestId('arcana-count')).toContainText('0 / 1');
    const card = page.getByTestId('arcana-card-moss_rabbit');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-found', 'no');
    await expect(card).toContainText('ARCANA #???');
    await expect(card).toContainText('？');
    // A page nobody has met cannot be opened, and gives nothing away.
    await expect(card).toBeDisabled();
    await expect(card).not.toContainText('モスラビット');
    await expect(page.getByTestId('arcana-pct-moss_rabbit')).toHaveCount(0);

    await page.getByTestId('arcana-back').click();
    await expect(page.getByTestId('explore-button')).toBeVisible();
  });

  test('opens the page the first time the creature is actually met', async ({ page }) => {
    await freshWorld(page);
    await setArcana(page, '低');
    await openBook(page);
    await expect(page.getByTestId('arcana-count')).toContainText('1 / 1');
    const card = page.getByTestId('arcana-card-moss_rabbit');
    await expect(card).toHaveAttribute('data-found', 'yes');
    await expect(card).toContainText('ARCANA #001');
    await expect(card).toContainText('モスラビット');
    expect(await listedPercent(page)).toBe(10);

    await card.click();
    const detail = page.getByTestId('arcana-detail-moss_rabbit');
    await expect(detail).toBeVisible();
    await expect(page.getByTestId('arcana-detail-pct')).toContainText('10%');
    // Something is legible from the very first percent — a discovered
    // page that says nothing at all would be worse than no page.
    await expect(page.getByTestId('arcana-fragment-form')).toBeVisible();
    await expect(page.getByTestId('arcana-complete-line')).toHaveCount(0);
  });

  test('says more as the memory fills in', async ({ page }) => {
    await freshWorld(page);
    await setArcana(page, '低');
    await openBook(page);
    await page.getByTestId('arcana-card-moss_rabbit').click();
    const early = await page.getByTestId('arcana-known').locator('dt').count();

    await page.getByTestId('arcana-detail-back').click();
    await page.getByTestId('arcana-back').click();
    await setArcana(page, '高');
    await openBook(page);
    await page.getByTestId('arcana-card-moss_rabbit').click();
    const later = await page.getByTestId('arcana-known').locator('dt').count();
    expect(later).toBeGreaterThan(early);
    // The last thing to open is the one that points at what comes next.
    await expect(page.getByTestId('arcana-fragment-sign')).toBeVisible();
  });

  test('tells the player what is missing without handing them a checklist', async ({ page }) => {
    await freshWorld(page);
    await setArcana(page, '中');
    await openBook(page);
    await page.getByTestId('arcana-card-moss_rabbit').click();
    const hints = page.getByTestId('arcana-hints');
    await expect(hints).toBeVisible();
    const text = (await hints.textContent()) ?? '';
    // No numbers, no percentages, and none of the four answers named:
    // the point of the whole design is that the book does not tell you
    // to spend a life for it.
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(/%/);
    expect(text).not.toMatch(/KILL|SPARE|HELP|CAPTURE|とどめ|見逃|捕ら/);
    // And nothing is hinted at that cannot be reached yet.
    expect(text).not.toContain('未実装');
  });
});

test.describe('what a life writes into the book', () => {
  test('a fight teaches something, and the same fight again teaches nothing', async ({ page }) => {
    await freshWorld(page);
    await armBattle(page, { story: 'off' });
    await walkIntoFight(page);
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await page.getByTestId('bp-attack').click();
    await expect(page.getByTestId('bp-normal-end')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('bp-normal-end').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // A small word about it, and no more than that.
    const toast = page.getByTestId('arcana-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute('data-complete', 'no');
    await expect(toast).toContainText('モスラビット');
    // The world is not covered by it: the forest is still on screen.
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible();
    await toast.click();
    await expect(toast).toHaveCount(0);

    await page.getByTestId('leave-forest').click();
    await page.getByRole('button', { name: 'もどる' }).click();
    await openBook(page);
    const first = await listedPercent(page);
    expect(first).toBeGreaterThan(0);
    await page.getByTestId('arcana-back').click();

    // Now fight the same fight again. Nothing new happened, so nothing
    // is learned — this is the rule that stops the book being farmed.
    // No preset this time: it would reset the world and take the book
    // with it, which is exactly what this test must not do.
    await walkIntoFight(page);
    await page.getByTestId('bp-attack').click();
    await expect(page.getByTestId('bp-normal-end')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('bp-normal-end').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('arcana-toast')).toHaveCount(0);

    await page.getByTestId('leave-forest').click();
    await page.getByRole('button', { name: 'もどる' }).click();
    await openBook(page);
    expect(await listedPercent(page)).toBe(first);
  });

  test('deciding about a creature is worth the same whichever answer it is', async ({ page }) => {
    await freshWorld(page);
    await armBattle(page, { story: 'on' });
    await walkIntoFight(page);
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await page.getByTestId('bp-attack').click();
    await expect(page.getByTestId('bp-mugen-choice')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('bp-mugen-SPARE').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('leave-forest').click();
    await page.getByRole('button', { name: 'もどる' }).click();
    await openBook(page);
    // Meeting somebody and answering for them: both counted, and the
    // page is well on its way without a single life having been taken.
    expect(await listedPercent(page)).toBeGreaterThanOrEqual(60);
  });

  test('time only teaches you about something you have already met', async ({ page }) => {
    await freshWorld(page);
    // Nothing has been met: a time shift must not open the book.
    await page.getByTestId('time-shift-button').click();
    await page.getByTestId('time-shift-go').click();
    await expect(page.getByTestId('arcana-toast')).toHaveCount(0);
    await page.getByTestId('time-shift-return').click();
    await openBook(page);
    await expect(page.getByTestId('arcana-count')).toContainText('0 / 1');
    await expect(page.getByTestId('arcana-card-moss_rabbit')).toHaveAttribute('data-found', 'no');
    await page.getByTestId('arcana-back').click();

    // Once it is known, the same three years are worth something.
    await setArcana(page, '低');
    await page.getByTestId('time-shift-button').click();
    await page.getByTestId('time-shift-go').click();
    const toast = page.getByTestId('arcana-toast');
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast).toContainText('10%');
    await expect(toast).toContainText('25%');
  });
});

test.describe('a memory that becomes complete', () => {
  test('says so once, and never again', async ({ page }) => {
    await freshWorld(page);
    await setArcana(page, 'あと一歩');
    await page.getByTestId('time-shift-button').click();
    await page.getByTestId('time-shift-go').click();

    const toast = page.getByTestId('arcana-toast');
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast).toHaveAttribute('data-complete', 'yes');
    await expect(toast).toContainText('ARCANA COMPLETE');
    await expect(toast).toContainText('この記憶は、もう失われない。');
    // It is a card, not a screen: the page underneath is untouched and
    // nothing white is laid over it.
    await expect(page.getByTestId('time-shift-done')).toBeVisible();
    await toast.click();
    await expect(toast).toHaveCount(0);

    // Reload. The memory is still complete and the moment does not play
    // a second time.
    await page.reload();
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('arcana-toast')).toHaveCount(0);
    await openBook(page);
    expect(await listedPercent(page)).toBe(100);
    await expect(page.getByTestId('arcana-complete-chip-moss_rabbit')).toBeVisible();
    await page.getByTestId('arcana-card-moss_rabbit').click();
    await expect(page.getByTestId('arcana-complete-line')).toContainText('ARCANA COMPLETE');
    // Nothing is left to want.
    await expect(page.getByTestId('arcana-hints')).toHaveCount(0);
  });

  test('never goes past 100, whatever else the player does', async ({ page }) => {
    await freshWorld(page);
    // The preset first: it resets the world, so the book has to be
    // filled in after it rather than before.
    await armBattle(page, { story: 'on', chaos: 'CHAOS_BLESSING' });
    await setArcana(page, 'COMPLETE');
    await openBook(page);
    expect(await listedPercent(page)).toBe(100);
    await page.getByTestId('arcana-back').click();

    // Go and learn more things anyway.
    await walkIntoFight(page);
    await page.getByTestId('bp-chaos-card').click();
    await page.getByTestId('bp-attack').click();
    await expect(page.getByTestId('bp-mugen-choice')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('bp-mugen-HELP').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('leave-forest').click();
    await page.getByRole('button', { name: 'もどる' }).click();
    await openBook(page);
    expect(await listedPercent(page)).toBe(100);
  });
});

test.describe('the book and the rest of the world', () => {
  test('survives a reload and is taken by a reset, along with everything else', async ({ page }) => {
    await freshWorld(page);
    await setArcana(page, '高');
    await openBook(page);
    const before = await listedPercent(page);
    expect(before).toBeGreaterThan(0);

    await page.reload();
    await page.getByTestId('continue-button').click();
    await openBook(page);
    expect(await listedPercent(page)).toBe(before);
    await page.getByTestId('arcana-back').click();

    // RESET WORLD from the title. WORLD MEMORY going and the book
    // staying would be a save that disagrees with itself.
    await dev(page, async () => {
      await page.getByTestId('preset-SPARE_3Y').click();
    });
    await page.reload();
    await page.getByTestId('reset-button').click();
    await page.getByTestId('confirm-reset-button').click();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();
    await openBook(page);
    await expect(page.getByTestId('arcana-count')).toContainText('0 / 1');
    await expect(page.getByTestId('arcana-card-moss_rabbit')).toHaveAttribute('data-found', 'no');
  });

  test('is a different thing from WORLD MEMORY, and does not write to it', async ({ page }) => {
    await freshWorld(page);
    await setArcana(page, 'COMPLETE');
    // Knowing everything about moss rabbits is not a fact of history.
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
    expect(kinds).toEqual([]);
    await page.getByTestId('world-memory-button').click();
    await expect(page.getByTestId('world-memory-list')).toContainText('まだ、世界に刻まれた記憶はありません');
  });
});

for (const width of [360, 390, 412]) {
  test(`the book fits a ${width}px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await freshWorld(page);
    await setArcana(page, '高');

    // The way in has to still be reachable with five things on the rail.
    const rail = (await page.getByTestId('arcana-button').boundingBox())!;
    expect(rail.height, 'the way into the book is thumb-sized').toBeGreaterThanOrEqual(44);
    expect(rail.x).toBeGreaterThanOrEqual(0);
    expect(rail.x + rail.width).toBeLessThanOrEqual(width);

    await openBook(page);
    const card = (await page.getByTestId('arcana-card-moss_rabbit').boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(width);

    await page.getByTestId('arcana-card-moss_rabbit').click();
    await expect(page.getByTestId('arcana-detail-moss_rabbit')).toBeVisible();
    const scrolls = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    }));
    expect(scrolls.x, 'no sideways scroll').toBe(false);
    expect(scrolls.y, 'no page scroll: the page itself scrolls').toBe(false);

    // The drawing is on screen and is not squashed.
    const art = (await page.locator('.arcana-art').boundingBox())!;
    expect(art.width).toBeGreaterThan(60);
    expect(art.x).toBeGreaterThanOrEqual(0);
    expect(art.x + art.width).toBeLessThanOrEqual(width);
    const back = (await page.getByTestId('arcana-detail-back').boundingBox())!;
    expect(back.y + back.height).toBeLessThanOrEqual(844);
  });
}

import { test, expect, type Page } from './fixtures';
import { enterDevAdmin } from './helpers';

/**
 * A BROWSER THAT WILL NOT KEEP ANYTHING.
 *
 * Private mode, a strict site-data setting, an embedded webview, a
 * full disk — all of them end at the same place: `indexedDB.open`
 * fails. Before this round that was an error screen and no game.
 *
 * The decision is "playable without saving", and the whole of it is
 * testable in one question: with IndexedDB broken, can somebody get
 * from the title into the forest — and are they told, plainly, that
 * none of it is being kept?
 */

/** Breaks IndexedDB before a single line of the app has run. */
async function withoutIndexedDb(page: Page) {
  await page.addInitScript(() => {
    const boom = () => {
      throw new DOMException('The user denied permission to access the database.', 'SecurityError');
    };
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      get: () => ({ open: boom, deleteDatabase: boom, databases: boom, cmp: boom }),
    });
  });
}

test.describe('with no database at all', () => {
  test('the game still starts, and says what it cannot do', async ({ page }) => {
    await withoutIndexedDb(page);
    await page.goto('/');

    // NOT the error screen. That is the whole change.
    await expect(page.getByTestId('init-error')).toHaveCount(0);
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 20_000 });

    // Said where the promise to keep a world is actually made...
    await expect(page.getByTestId('title-no-save')).toBeVisible();
    // ...and said continuously, because a warning given once at the
    // title is given at the moment nobody can care about it.
    await expect(page.getByTestId('no-save-warning')).toBeVisible();
  });

  test('plays: prologue, village, map, forest', async ({ page }) => {
    test.setTimeout(240_000);
    await withoutIndexedDb(page);
    await page.goto('/');
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();
    await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('explore-button').click();
    await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
    await page.getByTestId('location-GREENWOOD_FOREST').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // Still saying it, three screens in.
    await expect(page.getByTestId('no-save-warning')).toBeVisible();
  });

  test('the world works for as long as the tab does', async ({ page }) => {
    test.setTimeout(240_000);
    await withoutIndexedDb(page);
    await page.goto('/');
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();
    const clock = page.getByTestId('world-clock');
    await expect(clock).toBeVisible({ timeout: 20_000 });

    // A day passes and is remembered, because in this session the
    // world in memory IS the save.
    const before = await clock.textContent();
    await page.getByTestId('rest-button').click();
    await expect(clock).not.toHaveText(before ?? '');
  });

  /**
   * AND THEN IT IS GONE, which is the honest half of the bargain. A
   * reload is a new session: no world, no 「つづきから」, and the
   * warning still up.
   */
  test('and none of it survives a reload', async ({ page }) => {
    test.setTimeout(240_000);
    await withoutIndexedDb(page);
    await page.goto('/');
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();
    await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('rest-button').click();

    await page.reload();
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByTestId('continue-button'),
      'nothing is offered back, because there is nothing',
    ).toHaveCount(0);
    await expect(page.getByTestId('no-save-warning')).toBeVisible();
  });

  test('the warning never swallows a tap', async ({ page }) => {
    await withoutIndexedDb(page);
    await page.goto('/');
    const mark = page.getByTestId('no-save-warning');
    await expect(mark).toBeVisible();
    expect(
      await mark.evaluate((el) => getComputedStyle(el).pointerEvents),
      'it is a statement, not a dialogue',
    ).toBe('none');
    // And it does not push the layout sideways on the smallest phone.
    await page.setViewportSize({ width: 800, height: 360 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      ),
    ).toBe(false);
  });
});

test('a healthy save says so in the developer panel, and shows no damage', async ({ page }) => {
  test.setTimeout(240_000);
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

  await enterDevAdmin(page);
  await expect(page.getByTestId('dev-save-verdict')).toContainText('問題なし');
  await expect(page.getByTestId('dev-damaged-none')).toBeVisible();
  await expect(page.getByTestId('no-save-warning'), 'nothing to warn about').toHaveCount(0);
});

test('a damaged save shows exactly what could not be read', async ({ page }) => {
  test.setTimeout(240_000);
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
  // Something worth losing, and a clean load afterwards so there is a
  // copy to fall back to.
  await page.getByTestId('rest-button').click();
  await page.waitForTimeout(600);

  const back = async () => {
    await page.reload();
    await page.getByTestId('continue-button').click({ timeout: 20_000 });
    await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });
  };
  await back();

  // The kind of damage a write cut off halfway leaves behind.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('world_state', 'readwrite');
          tx.objectStore('world_state').put({ key: 'lumi', value: 'gone' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await back();

  await enterDevAdmin(page);
  await expect(page.getByTestId('dev-save-verdict')).toContainText('バックアップから復旧');
  await expect(page.getByTestId('dev-damaged-when')).toContainText('lumi');
  // The actual broken value, as it was stored. That is the whole
  // point: a tidied version of it would answer a different question.
  await expect(page.getByTestId('dev-damaged-row-lumi')).toContainText('gone');

  // And it can be put down once somebody has looked, so the same fault
  // is not reported for ever.
  await page.getByTestId('dev-damaged-clear').click();
  await expect(page.getByTestId('dev-damaged-none')).toBeVisible();
});

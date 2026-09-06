import { test, expect, type Page } from './fixtures';
import { enterDevAdmin, PHONES, viewportOf } from './helpers';

/**
 * A landscape stage is under 400px tall, and several screens hold far
 * more than that. Two things have to be true of every one of them:
 *
 *  - nothing falls off the bottom into a clipped nowhere. A screen with
 *    more than it can show scrolls; a screen that cannot scroll and has
 *    more than it can show is a bug, not a slightly cropped page;
 *  - the way out does not scroll away. 「もどる」 that has to be hunted
 *    for at the end of seventeen hundred pixels is 「もどる」 nobody
 *    finds.
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

/** Nothing on this screen is out of reach. */
async function nothingIsClipped(page: Page, where: string) {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('.screen').forEach((n) => {
      const el = n as HTMLElement;
      // More content than room, and no way to move: content in a void.
      const over = el.scrollHeight - el.clientHeight;
      if (
        over > 1 &&
        getComputedStyle(el).overflowY !== 'auto' &&
        el.scrollHeight > el.clientHeight
      ) {
        // It is only a bug if nothing INSIDE it scrolls either.
        const scroller = Array.from(el.querySelectorAll('*')).some((c) => {
          const s = getComputedStyle(c as HTMLElement);
          return (
            (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
            (c as HTMLElement).scrollHeight > (c as HTMLElement).clientHeight
          );
        });
        if (!scroller) out.push(`screen overflows by ${over}px with nothing to scroll`);
      }
    });
    return out;
  });
  expect(bad, `${where}: content must be reachable`).toEqual([]);
}

/** The way out is on screen without scrolling for it. */
async function wayOutIsVisible(page: Page, testId: string, phoneHeight: number) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  expect(box, `${testId} should be laid out`).not.toBeNull();
  expect(box.y, `${testId} is on screen`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, `${testId} is not below the fold`).toBeLessThanOrEqual(
    phoneHeight + 1,
  );
  expect(box.height, `${testId} is thumb-sized`).toBeGreaterThanOrEqual(40);
}

for (const phone of PHONES) {
  test(`every page screen is reachable end to end on a ${phone.name} phone`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewportOf(phone));
    await newWorld(page);

    await page.getByTestId('explore-button').click();
    await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
    await nothingIsClipped(page, 'EXPLORE');
    await page.locator('.screen-footer .btn').first().click();

    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('settings-screen')).toBeVisible();
    await nothingIsClipped(page, 'SETTINGS');
    await wayOutIsVisible(page, 'settings-back', phone.height);
    // The last row of the settings list can be reached.
    await page.getByTestId('motion-toggle').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('motion-toggle')).toBeInViewport();
    await page.getByTestId('settings-back').click();

    await page.getByTestId('arcana-button').click();
    await expect(page.getByTestId('arcana-list')).toBeVisible();
    await nothingIsClipped(page, 'ARCANA');
    await wayOutIsVisible(page, 'arcana-back', phone.height);
    await page.getByTestId('arcana-back').click();

    await page.getByTestId('world-memory-button').click();
    await expect(page.getByTestId('world-memory-list')).toBeVisible();
    await nothingIsClipped(page, 'WORLD MEMORY');
    await page.locator('.screen-footer .btn').first().click();

    await page.getByTestId('archive-button').click();
    await nothingIsClipped(page, 'ARCHIVE');
    await page.locator('.screen-footer .btn').first().click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
  });
}

test('DEV ADMIN scrolls, and its way out never scrolls away', async ({ page }) => {
  test.setTimeout(120_000);
  await newWorld(page);
  await enterDevAdmin(page);

  // The panel is well over a landscape screen tall …
  const room = await page.evaluate(() => {
    const el = document.querySelector('.screen-scroll') as HTMLElement;
    return { scroll: el.scrollHeight, client: el.clientHeight };
  });
  expect(room.scroll, 'the panel really is longer than the screen').toBeGreaterThan(room.client);

  // … and 「もどる」 is on screen before anybody scrolls anywhere.
  await wayOutIsVisible(page, 'dev-admin-back', 390);
  await nothingIsClipped(page, 'DEV ADMIN');

  // The far end of it can actually be reached.
  const last = page.getByTestId('moss-rabbit-progress');
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  // And the way out has not moved while that happened.
  await wayOutIsVisible(page, 'dev-admin-back', 390);
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

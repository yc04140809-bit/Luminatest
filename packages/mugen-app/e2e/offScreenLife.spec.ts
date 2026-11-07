import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { placeButton } from './village';

/**
 * OFF-SCREEN LIFE — THE BAKERY ROUTE, IN THE APP (PoC, 作者 2026-10-17;
 * docs/OFF_SCREEN_LIFE_SYSTEM.md, packages/mugen-core/content/events/offScreenLife.ts).
 *
 * The player bandaged the bandit. They sleep at the inn — the LIFE TICK —
 * and while they sleep, he stands in front of リナ at the forest edge and
 * リゼル binds his wounds. None of it is seen. WORLD MEMORY does not list it
 * until somebody tells them: リナ, at the bakery, the next day. Later, a man
 * is carrying flour at the back of the bakery — seen, and known only as
 * that — and the village talks.
 *
 * The answer and the end of the look ahead are given to the world through
 * the DEV handle (`__mugenWorld`), as futureCg.spec does: the fight and the
 * four answers are gald.spec's. Everything after — the nights, the bakery,
 * the screens — is the player's own path.
 */

type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  markExperienceSeen(id: string): Promise<void>;
  advanceSekiryugaArc(stage: string): Promise<boolean>;
  markRead(ids: string[]): Promise<boolean>;
  getEvents(): { type: string }[];
  getKnownEvents(): { type: string }[];
  knows(id: string): boolean;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;
const truth = (page: Page) => world<string[]>(page, `(w) => w.getEvents().map((e) => e.type)`);
const known = (page: Page) => world<string[]>(page, `(w) => w.getKnownEvents().map((e) => e.type)`);

const SHOTS = process.env.SHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}-${page.viewportSize()!.width}.png` });
};

async function freshVillage(page: Page) {
  await page.goto('/');
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
  await page.reload();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** HELP, the look ahead behind them, セキリュウガ's part over: the everyday. Lina's ordinary scenes read. */
async function helpedAndSettled(page: Page) {
  await world(page, `async (w) => {
    await w.recordGaldLifeChoice('HELP');
    await w.markExperienceSeen('evt_kaos_future_vision');
    await w.advanceSekiryugaArc('SETTLED');
    await w.markRead(['talk:DAILY_LINA_BURNT_BREAD', 'talk:DAILY_KAOS_DETOUR', 'talk:DAILY_FUUMIMI_AFTER_HELP']);
  }`);
}

/** A night at the inn: the LIFE TICK. */
async function rest(page: Page) {
  const button = await placeButton(page, 'rest-button');
  const day = await page.getByTestId('world-clock').textContent();
  await button.click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect(button).toBeEnabled({ timeout: 10_000 });
}

/** Reads the bakery's talk to its end; returns the lines. */
async function talkAtBakery(page: Page, shotName?: string): Promise<string[]> {
  await page.getByTestId('bakery-talk').click();
  const seen: string[] = [];
  for (let i = 0; i < 14; i++) {
    seen.push((await page.getByTestId('bakery-line').textContent()) ?? '');
    const next = page.getByTestId('bakery-next');
    const done = (await next.textContent()) === 'もどる';
    if (i === 4 && shotName) await shot(page, shotName);
    await next.click();
    if (done) break;
  }
  return seen;
}

async function backToVillage(page: Page) {
  await page.getByTestId('bakery-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

test('helped, he lives on where the player is not — and they hear of it afterwards, from リナ', async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 844, height: 390 });
  await freshVillage(page);
  await helpedAndSettled(page);
  // Her first talk at the bakery, out of the way (she meets them once).
  await (await placeButton(page, 'bakery-button')).click();
  await talkAtBakery(page);
  await backToVillage(page);

  // No night yet: nothing has happened.
  expect(await truth(page)).toEqual(['PLAYER_HELPED_GALD']);

  // One night at the inn. While they sleep, it happens.
  await rest(page);
  expect(await truth(page)).toEqual(expect.arrayContaining(['GALD_SAVES_LINA', 'RIZEL_TENDS_GALD']));
  // WORLD TRUTH, but not PLAYER KNOWLEDGE: WORLD MEMORY does not list it.
  expect(await known(page)).toEqual(['PLAYER_HELPED_GALD']);
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-PLAYER_HELPED_GALD')).toBeVisible();
  await expect(page.getByTestId('memory-GALD_SAVES_LINA')).toHaveCount(0);
  await page.getByTestId('memory-back').click();

  // At the bakery, リナ tells them — with a bandage on her arm.
  await (await placeButton(page, 'bakery-button')).click();
  await expect(page.getByTestId('bakery-talk-new')).toBeVisible();
  const said = await talkAtBakery(page, 'poc-02-lina-tells');
  expect(said.join('')).toContain('知らない男の人が前に立ってくれたの');
  expect(said.join('')).not.toMatch(/ガルド|バルド/);
  await backToVillage(page);

  // Told: now it is something they know.
  expect(await world<boolean>(page, `(w) => w.knows('GALD_SAVED_LINA')`)).toBe(true);
  expect(await known(page)).toEqual(['PLAYER_HELPED_GALD', 'GALD_SAVES_LINA']);
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-label-GALD_SAVES_LINA')).toHaveText('森の入口で、あの男がリナを庇った');
  // リゼル's part they have not been told yet.
  await expect(page.getByTestId('memory-RIZEL_TENDS_GALD')).toHaveCount(0);
  await shot(page, 'poc-03-memory');
  await page.getByTestId('memory-back').click();

  // And his life record has the chapter — with more still unknown.
  await page.getByTestId('archive-button').click();
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('chapter-GALD_CH_SAVED_LINA')).toContainText('森の入口で');
  await expect(page.getByTestId('archive-unknown')).toBeVisible();
  // No chapter's words run past its row.
  const overflow = await page.locator('.memory-row').evaluateAll((rows) =>
    rows.filter((r) => [...r.children].some((c) => c.scrollWidth > c.clientWidth + 1)).length,
  );
  expect(overflow).toBe(0);
  await shot(page, 'poc-04-archive');
  await page.setViewportSize({ width: 640, height: 300 });
  await shot(page, 'poc-04b-archive');
  const back = (await page.getByTestId('archive-detail-back').boundingBox())!;
  expect(back.y + back.height).toBeLessThanOrEqual(300);
});

test('days later: a man at the back of the bakery (seen, not who), the village talking, and the baker telling why', async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 844, height: 390 });
  await freshVillage(page);
  await helpedAndSettled(page);
  for (let n = 0; n < 6; n++) await rest(page);
  expect(await truth(page)).toEqual(
    expect.arrayContaining([
      'GALD_TELLS_OF_ELNA',
      'RIZEL_OFFERS_TO_SEE_ELNA',
      'VILLAGE_HEARS_OF_GALD',
      'RIZEL_SPEAKS_FOR_GALD',
      'BAKER_OFFERS_WORK',
      'GALD_TAKES_BAKERY_WORK',
      'LINA_WRITES_TO_ELNA',
    ]),
  );
  expect(await truth(page)).not.toContain('GALD_WALKS_THE_ROAD');

  // Seen, at the bakery: a big man carrying flour. Known as that, and listed nowhere.
  await (await placeButton(page, 'bakery-button')).click();
  await expect(page.getByTestId('bakery-new-hand')).toHaveText('店の奥で、見慣れない大柄な男が黙々と粉袋を運んでいる。');
  await shot(page, 'poc-05-bakery-seen');
  await expect.poll(() => world<boolean>(page, `(w) => w.knows('NEW_HAND_AT_BAKERY')`)).toBe(true);
  expect(await known(page)).toEqual(['PLAYER_HELPED_GALD']);

  // The baker tells them the rest (his talk, in place of his ordinary line).
  await page.getByTestId('bakery-who-owner').click();
  const said = await talkAtBakery(page, 'poc-05b-owner-tells');
  expect(said.join('')).toContain('エルナ');
  expect(said.join('')).toContain('「やる」とだけ言った');
  await backToVillage(page);
  expect(await known(page)).toEqual(['PLAYER_HELPED_GALD', 'GALD_TELLS_OF_ELNA', 'GALD_TAKES_BAKERY_WORK']);

  // The village talks: リゼル and the guard, at the bakery's door.
  await page.getByTestId('rumor-button').click();
  const row = page.getByTestId('rumor-RIZEL_AND_THE_GUARD');
  await expect(row).toBeVisible();
  await row.click();
  await expect(row).toContainText('あのリゼルが、元盗賊の肩を持ったんだと');
  await shot(page, 'poc-06-rumor');
  await expect.poll(() => world<boolean>(page, `(w) => w.knows('RIZEL_SPOKE_FOR_GALD')`)).toBe(true);
  await page.getByTestId('rumor-leave').click();

  await page.getByTestId('memory-button').click();
  // Four entries and more: もどる stays on screen; the list scrolls inside the panel.
  const back = (await page.getByTestId('memory-back').boundingBox())!;
  expect(back.y + back.height).toBeLessThanOrEqual(390);
  await shot(page, 'poc-07-memory-later');
  await page.getByTestId('memory-label-RIZEL_SPEAKS_FOR_GALD').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('memory-label-RIZEL_SPEAKS_FOR_GALD')).toHaveText('リゼルが、見張り番の前で男のことを話した');
  await shot(page, 'poc-07b-memory-scrolled');
});

for (const size of [
  { width: 844, height: 390 },
  { width: 640, height: 300 },
]) {
  test(`${size.width}×${size.height}: the bakery with the man at the back — every word and door on screen`, async ({ page }) => {
    test.slow();
    await page.setViewportSize(size);
    await freshVillage(page);
    await helpedAndSettled(page);
    // He takes the work on the fourth night (TIGS2027 STEP ①: offered first).
    for (let n = 0; n < 4; n++) await rest(page);
    await (await placeButton(page, 'bakery-button')).click();
    const sight = page.getByTestId('bakery-new-hand');
    await expect(sight).toBeVisible();
    for (const id of ['bakery-description', 'bakery-new-hand', 'bakery-talk', 'bakery-leave']) {
      const box = (await page.getByTestId(id).boundingBox())!;
      expect(box.y + box.height, id).toBeLessThanOrEqual(size.height + 0.5);
      expect(box.x + box.width, id).toBeLessThanOrEqual(size.width + 0.5);
    }
    // Words not cut: the line fits its own box.
    const fits = await sight.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(fits).toBe(true);
    await shot(page, 'poc-08-bakery-size');
  });
}

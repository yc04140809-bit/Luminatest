import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { goTo, settled, things } from './roam';

/**
 * グレイヴの表情差分 (作者指示 2026-10-12): while he speaks in the tavern —
 * a line of his, his small menu, his handwork — he is drawn with the face the
 * line names (NORMAL when none), in place of his standing figure; back to the
 * standing figure when he is not speaking.
 *
 * (Helpers from the pre-raid days spec — its note follows.) 襲撃前の日々 (作者指示 2026-10-11): 待たされ感・探索動機・噂導線 —
 *
 *   ✉ アルデン通信   an unread rumour brought to the square on coming back (or
 *                   waking), NEW; 読む opens it there; reading moves nothing.
 *   ケイオスの誘い    when nothing else is said on coming back, now and then one
 *                   word from her (DEV: only when `__mugenNudgeRoll` says so),
 *                   once a day at most, no NEW.
 *   再出現           the forest's herbs, nuts and iron grow back two days on.
 *   簡単な加工        Grave's three handworks at the tavern; the charm once, +1.
 *
 * And ハイタッチ (作者指示 2026-10-11): a first thing got, a golden find first
 * seen, a first handwork — the two of them high-five over the screen for a
 * moment, then gone.
 */

type DevWorld = {
  addItem(id: string, n?: number): Promise<number>;
  getItemCount(id: string): number;
  isRead(id: string): boolean;
  markRead(ids: string[]): Promise<boolean>;
  getIncidentPoint(): number;
  getPartyStats(): { attackMin: number; attackMax: number };
  isPickupTaken(id: string): boolean;
  advanceDays(n: number): Promise<unknown>;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;
const celebrated = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mugenCelebrations?: { kind: string; title: string; subtitle: string }[] }).__mugenCelebrations ?? []);

async function freshVillage(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await Promise.all(
      ((await indexedDB.databases?.()) ?? []).map(
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

/** Out to the map and straight back in: a coming back. */
async function outAndBack(page: Page) {
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Every rumour read in 噂話 (so no news is waiting). */
async function readAllRumours(page: Page) {
  await page.getByTestId('rumor-button').click();
  for (let i = 0; i < 40; i++) {
    const row = page.locator('[data-testid^="rumor-"][data-new="yes"]').first();
    if ((await row.count()) === 0) break;
    await row.click();
  }
  await page.getByTestId('rumor-leave').click();
}


test.describe.configure({ timeout: 120_000 });

const master = (page: Page) => page.getByTestId('tavern-master');

for (const size of [
  { width: 844, height: 390 },
  { width: 640, height: 300 },
]) {
  test(`グレイヴの表情 at ${size.width}×${size.height}: NORMAL when a line names none; LAUGH on a handwork made; his standing figure when he is not speaking`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await freshVillage(page);
    await world(page, `(w) => w.markRead(['talk:GRAVE_MEETING'])`);
    await world(page, `(w) => w.addItem('IRON_ORE', 3)`);
    await page.getByTestId('tavern-button').click();
    // Not speaking: the standing figure.
    await expect(master(page)).toHaveAttribute('data-face', '');
    await expect(master(page)).toHaveAttribute('src', /tavern-master-standing/);
    // His menu: 「どうした。」 — NORMAL.
    await page.getByTestId('tavern-talk').click();
    await expect(master(page)).toHaveAttribute('data-face', 'NORMAL');
    await expect(master(page)).toHaveAttribute('src', /grave-face-normal/);
    // A line of his naming no face: NORMAL.
    await page.getByTestId('tavern-master-listen').click();
    await expect(page.getByTestId('tavern-line')).toHaveText('「また来たな。そこ空いてるぞ。」');
    await expect(master(page)).toHaveAttribute('data-face', 'NORMAL');
    while (await page.getByTestId('tavern-next').isVisible().catch(() => false)) await page.getByTestId('tavern-next').click();
    await expect(master(page)).toHaveAttribute('data-face', '');
    // His handwork: made — a laugh; asked again — a grin.
    await page.getByTestId('tavern-talk').click();
    await page.getByTestId('tavern-craft-open').click();
    await page.getByTestId('craft-CRAFT_IRON_CHARM-do').click();
    await expect(master(page)).toHaveAttribute('data-face', 'LAUGH');
    await expect(master(page)).toHaveAttribute('src', /grave-face-laugh/);
    // The picture whole on the screen, its own shape.
    const box = (await master(page).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
    await page.getByTestId('tavern-panel-close').click();
    await expect(master(page)).toHaveAttribute('data-face', '');
  });
}

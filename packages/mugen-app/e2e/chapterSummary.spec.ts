import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 第1章の終わり (段階5, 作者 2026-11-07 — the trial played to the chapter's end):
 *   the departure (the memo once more — C2) → CHAPTER 1 END → 「あなたの第1章」: seven rows on the navy plate (E9)
 *   → 「画像で残す」: a 1200×630 picture drawn in the game (C1); 「つづきから」 comes straight back to the summary.
 */
type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceFinaleStage(s: string): Promise<boolean>;
  getFinaleStage(): string;
  markRead(ids: string[]): Promise<unknown>;
  isRead(id: string): boolean;
  getClock(): { worldYear: number; worldDay: number };
  getLifeArchive(): { chapters: unknown[] }[];
  getEvents(): unknown[];
  getKnownEvents(): unknown[];
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

/** A world that has answered him (HELP) and seen ahead, two rumours read — and the village rebuilt: the departure next. */
async function beforeTheDeparture(page: Page) {
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
  await world(page, `(w) => w.recordGaldLifeChoice('HELP')`);
  await page.reload();
  await page.getByTestId('continue-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await world(page, `(w) => w.markRead(['rumor:SUMMARY_A', 'rumor:SUMMARY_B'])`);
  await world(page, `(w) => w.advanceFinaleStage('REBUILDING')`);
  await page.reload();
  await page.getByTestId('continue-button').click();
}

async function throughTheDeparture(page: Page): Promise<string[]> {
  const scene = page.getByTestId('finale-scene');
  await expect(scene).toHaveAttribute('data-scene', 'DEPARTURE');
  const words: string[] = [];
  for (let i = 0; i < 30 && (await scene.isVisible().catch(() => false)); i++) {
    await expect(page.getByTestId('finale-next')).toBeEnabled();
    words.push((await page.getByTestId('finale-line').textContent()) ?? '');
    await page.getByTestId('finale-next').click();
    await page.waitForTimeout(120);
  }
  return words;
}

test('the departure, the memo once more; CHAPTER 1 END; 「あなたの第1章」 — seven rows read off the world; つづきから comes back to it', async ({ page }) => {
  test.setTimeout(120_000);
  await beforeTheDeparture(page);
  const words = await throughTheDeparture(page);
  expect(words.some((w) => /^.+は、あのメモを取り出した。「エルナへ」――まだ会ったことのない名前だった。$/.test(w))).toBe(true);
  await expect(page.getByTestId('chapter-end')).toBeVisible();
  await expect.poll(() => world<string>(page, `(w) => w.getFinaleStage()`)).toBe('ENDED');
  await page.getByTestId('chapter-end-next').click();

  const summary = page.getByTestId('chapter-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('あなたの第1章');
  const days = await world<number>(page, `(w) => (w.getClock().worldYear - 1) * 365 + w.getClock().worldDay`);
  const records = await world<number>(page, `(w) => w.getLifeArchive().reduce((n, e) => n + e.chapters.length, 0)`);
  const unknown = await world<number>(page, `(w) => w.getEvents().length - w.getKnownEvents().length`);
  await expect(page.getByTestId('chapter-summary-row').locator('dt')).toHaveText([
    '過ごした日数',
    'ガルドへの答え',
    'フウミミへの答え',
    '出会った人',
    '聞いた噂話',
    '人生の記録',
    'まだ知らない出来事',
  ]);
  await expect(page.getByTestId('chapter-summary-row').locator('dd')).toHaveText([
    `${days}日`,
    '傷を治療した',
    'まだ出会っていない',
    // Him (answered), Grave (heard at the departure), Aria and Levi.
    '4人',
    '2件',
    `${records}件`,
    `${unknown}件`,
  ]);
  expect(await world<boolean>(page, `(w) => w.isRead('met:grave')`)).toBe(true);

  // Back at the title and in again: the summary, at once (not the end card again, not the village).
  await page.getByTestId('chapter-summary-title').click();
  await page.getByTestId('continue-button').click();
  await expect(summary).toBeVisible();
  await expect(page.getByTestId('chapter-end')).toHaveCount(0);
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
});

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`${size.width}×${size.height}: the summary whole on screen; 「画像で残す」 draws a 1200×630 picture to keep`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(size);
    await beforeTheDeparture(page);
    await world(page, `(w) => w.advanceFinaleStage('ENDED')`);
    await page.reload();
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('chapter-summary')).toBeVisible();
    const plate = (await page.getByTestId('chapter-summary-plate').boundingBox())!;
    expect(plate.y).toBeGreaterThanOrEqual(0);
    expect(plate.y + plate.height).toBeLessThanOrEqual(size.height);
    expect(plate.x + plate.width).toBeLessThanOrEqual(size.width);
    for (const row of await page.getByTestId('chapter-summary-row').all()) {
      const b = (await row.boundingBox())!;
      expect(b.y + b.height).toBeLessThanOrEqual(size.height);
      // Label and value whole on the row.
      const dd = (await row.locator('dd').boundingBox())!;
      expect(dd.x + dd.width).toBeLessThanOrEqual(b.x + b.width + 1);
    }
    for (const id of ['chapter-summary-keep', 'chapter-summary-title']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y + b.height, id).toBeLessThanOrEqual(size.height);
    }

    await page.getByTestId('chapter-summary-keep').click();
    const img = page.getByTestId('chapter-share-image');
    await expect(img).toBeVisible();
    expect(await img.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight])).toEqual([1200, 630]);
    await expect(page.getByTestId('chapter-share-save')).toHaveAttribute('download', 'mugen-zero-chapter1.png');
    // His picture on the left (not the bare night), the plate's navy on the right.
    const [left, right] = await img.evaluate((i: HTMLImageElement) => {
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 630;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(i, 0, 0);
      const spread = (x0: number, y0: number, w: number, h: number) => {
        const d = ctx.getImageData(x0, y0, w, h).data;
        let min = 255;
        let max = 0;
        for (let k = 0; k < d.length; k += 4) {
          const v = (d[k] + d[k + 1] + d[k + 2]) / 3;
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
        return max - min;
      };
      return [spread(80, 100, 260, 420), spread(1050, 60, 50, 20)];
    });
    expect(left).toBeGreaterThan(60);
    expect(right).toBeLessThan(20);
    const close = page.getByTestId('chapter-share-close');
    const cb = (await close.boundingBox())!;
    expect(cb.y + cb.height).toBeLessThanOrEqual(size.height);
    await close.click();
    await expect(img).toHaveCount(0);
    await expect(page.getByTestId('chapter-summary')).toBeVisible();
  });
}

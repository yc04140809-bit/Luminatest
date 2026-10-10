import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { settled } from './roam';

/**
 * セキリュウガ戦後・遺跡再訪 (実装メイン⑥, 2026-10-08): the first time back
 * at the ruins after it was brought to a stop, it is still there — not
 * coming at them, looking deeper in — once in a world; every time after,
 * only that. Never a fight. A night in the village after the first time
 * back, and Alden has heard of a small cry from the ruins (噂話, NEW until
 * read).
 *
 * The route up to SETTLED is walked for real in sekiryuga.spec; here it is
 * put in place through the development handle on the world.
 *
 * Set REVISIT_SHOTS=<dir> to keep screenshots of the first time back.
 */

type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
  getSekiryugaStage(): string;
  isRead(id: string): boolean;
  markRead(ids: string[]): Promise<boolean>;
  getKnownEvents(): { id: string }[];
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

const SHOTS = process.env.REVISIT_SHOTS;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

const REVISIT = 'event:SEKIRYUGA_REVISIT';
const CRY = 'event:RUINS_CRY';

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

/** Past Gald and the one look ahead, back in the village, the route at `stage`. */
async function atStage(page: Page, stage: 'TOLD' | 'BEATEN' | 'SETTLED') {
  await freshVillage(page);
  await world(page, `(w) => w.recordGaldLifeChoice('SPARE')`);
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('future-vision')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  for (const s of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED'] as const) {
    await world(page, `(w) => w.advanceSekiryugaArc('${s}')`);
    if (s === stage) break;
  }
  expect(await world<string>(page, `(w) => w.getSekiryugaStage()`)).toBe(stage);
}

async function toTheRuins(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('ruins-button').click();
}

async function inTheWalk(page: Page) {
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await settled(page);
}

/** Reads the first time back to its end; returns each line, and what was seen as it was said. */
async function readRevisit(page: Page) {
  const seen: { line: string; facing: string | null; glance: boolean }[] = [];
  for (let i = 0; i < 30; i++) {
    const next = page.getByTestId('seal-next');
    await expect(next).toBeVisible({ timeout: 5000 });
    seen.push({
      line: (await page.getByTestId('seal-line').textContent()) ?? '',
      facing: await page.getByTestId('seal-figure').getAttribute('data-facing'),
      glance: (await page.getByTestId('seal-revisit').getAttribute('data-glance')) === 'yes',
    });
    // Never a fight: nothing to attack with, no 「戦う」.
    await expect(page.getByTestId('boss-fight')).toHaveCount(0);
    await expect(page.getByTestId('bp-attack')).toHaveCount(0);
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  return seen;
}

test.describe.configure({ timeout: 180_000 });

test('before it is brought to a stop, and before what came after is seen: no revisit', async ({ page }) => {
  await atStage(page, 'TOLD');
  await toTheRuins(page);
  await inTheWalk(page);
  await expect(page.getByTestId('seal-revisit')).toHaveCount(0);
  // The way in, as before.
  await page.getByTestId('deep-button').click();
  await expect(page.getByTestId('seal-approach')).toBeVisible();

  await atStage(page, 'BEATEN');
  await toTheRuins(page);
  await inTheWalk(page);
  await expect(page.getByTestId('seal-revisit')).toHaveCount(0);
  await page.getByTestId('deep-button').click();
  await expect(page.getByTestId('seal-aftermath')).toBeVisible();
  expect(await world<boolean>(page, `(w) => w.isRead('${REVISIT}')`)).toBe(false);
});

test('the first time back: still there, not coming at them, looking deeper — once, kept across a restart; then only that', async ({
  page,
}) => {
  await atStage(page, 'SETTLED');
  const memoryBefore = await world<string[]>(page, `(w) => w.getKnownEvents().map((e) => e.id)`);
  await toTheRuins(page);
  await expect(page.getByTestId('seal-revisit')).toBeVisible();
  const seen = await readRevisit(page);
  const lines = seen.map((s) => s.line);
  expect(lines[0]).toContain('……いた。');
  expect(lines).toEqual(
    expect.arrayContaining(['「いるね。」', '「襲ってこないな。」', '「さあ？」', '「便利でしょ♪」', '「便利な言葉として使うな。」']),
  );
  // It looks at them once, and back deeper.
  expect(seen.find((s) => s.line.includes('一度だけこちらを見た'))?.facing).toBe('party');
  expect(seen.find((s) => s.line.includes('奥ばっかり'))?.facing).toBe('away');
  // Last, Kaos alone, silent — held a moment before the way back is offered.
  const last = seen[seen.length - 1];
  expect(last).toMatchObject({ line: '「…………。」', glance: true });
  expect(lines.join('')).not.toMatch(/この遺跡は昔|守って|幼体|卵|AI|古代兵器|ロストテクノロジー|WORLD MEMORY/);
  // Back to the walk, and kept.
  await inTheWalk(page);
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('${REVISIT}')`)).toBe(true);
  expect(await world<string[]>(page, `(w) => w.getKnownEvents().map((e) => e.id)`)).toEqual(memoryBefore);

  // Out to the map and back in: no revisit — it is where it stays, deeper in.
  await page.getByTestId('leave-ruins').click();
  await page.getByTestId('ruins-button').click();
  await inTheWalk(page);
  await expect(page.getByTestId('seal-revisit')).toHaveCount(0);
  await expect(page.getByTestId('deep-new')).toHaveCount(0);
  await page.getByTestId('deep-button').click();
  await expect(page.getByTestId('seal-still')).toBeVisible();
  await expect(page.getByTestId('seal-line')).toHaveText('セキリュウガは、遺跡の奥を見ている。');
  await expect(page.getByTestId('seal-figure')).toHaveAttribute('data-facing', 'away');
  await expect(page.getByTestId('boss-fight')).toHaveCount(0);
  // Looked at: a word, no more.
  await page.getByTestId('still-look').click();
  await expect(page.getByTestId('seal-line')).toHaveText('「……まだ、ここにいる。」');
  await page.getByTestId('still-look').click();
  await expect(page.getByTestId('seal-line')).toHaveText('「相変わらず奥を見てるな。」');
  await page.getByTestId('still-leave').click();
  await inTheWalk(page);

  // After a restart: still seen.
  await page.reload();
  await page.getByTestId('continue-button').click();
  // つづきから opens where they were: the map.
  await page.getByTestId('ruins-button').click();
  await inTheWalk(page);
  await expect(page.getByTestId('seal-revisit')).toHaveCount(0);
});

test('the cry from the ruins: heard of after a night in the village following the first time back — NEW until read', async ({
  page,
}) => {
  await atStage(page, 'SETTLED');
  const everyRumorRead = async () => {
    await page.getByTestId('rumor-button').click();
    const ids = await page
      .getByTestId('rumor-list')
      .locator('[data-testid^="rumor-"][data-new]')
      .evaluateAll((els) => els.map((e) => `rumor:${e.getAttribute('data-testid')!.slice('rumor-'.length)}`));
    await world(page, `(w) => w.markRead(${JSON.stringify(ids)})`);
    await page.getByTestId('rumor-leave').click();
    await expect(page.getByTestId('rumor-new')).toHaveCount(0);
  };
  await everyRumorRead();

  // A night before the first time back: nothing new.
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('rest-button')).toBeEnabled();
  await expect(page.getByTestId('rumor-new')).toHaveCount(0);
  expect(await world<boolean>(page, `(w) => w.isRead('${CRY}')`)).toBe(false);

  // The first time back…
  await toTheRuins(page);
  await readRevisit(page);
  await inTheWalk(page);
  await page.getByTestId('leave-ruins').click();
  await page.getByTestId('back-to-village').click();
  // …home, and not yet: it is talked about after a night.
  await expect(page.getByTestId('rumor-new')).toHaveCount(0);
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('rumor-new')).toBeVisible();
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('${CRY}')`)).toBe(true);

  // NEW: not cleared by opening the list, only by reading it.
  await page.getByTestId('rumor-button').click();
  const cry = page.getByTestId('rumor-RUINS_CRY');
  await expect(cry).toHaveAttribute('data-new', 'yes');
  await page.getByTestId('rumor-leave').click();
  await expect(page.getByTestId('rumor-new')).toBeVisible();
  await page.getByTestId('rumor-button').click();
  await cry.click();
  await expect(page.getByTestId('rumor-RUINS_CRY-text')).toContainText('遺跡の近くを通った旅人が、奥から小さな鳴き声を聞いたらしい。');
  await expect(cry).toHaveAttribute('data-new', 'no');
  // What else is new can only be ALDEN INCIDENT's first signs (2026-10-10):
  // the ruins walked, the walk finished and the night slept are its first
  // three steps — phase 1. Nothing but those.
  const stillNew = await page
    .getByTestId('rumor-list')
    .locator('[data-testid^="rumor-"][data-new="yes"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!));
  expect(stillNew.every((id) => id.startsWith('rumor-INC_'))).toBe(true);
  expect(await world<number>(page, `(w) => w.getIncidentPhase()`)).toBe(stillNew.length > 0 ? 1 : 0);
  await page.getByTestId('rumor-leave').click();
  if (stillNew.length === 0) await expect(page.getByTestId('rumor-new')).toHaveCount(0);

  // Kept across a restart, and only once.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await page.getByTestId('rumor-button').click();
  await expect(page.getByTestId('rumor-RUINS_CRY')).toHaveAttribute('data-new', 'no');
});

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    test('the first time back keeps its words, its button and her on the screen', async ({ page }) => {
      await atStage(page, 'SETTLED');
      await toTheRuins(page);
      await expect(page.getByTestId('seal-revisit')).toBeVisible();
      for (let i = 0; i < 40; i++) {
        const next = page.getByTestId('seal-next');
        await expect(next).toBeVisible({ timeout: 5000 });
        for (const el of [next, page.getByTestId('seal-line')]) {
          const b = (await el.boundingBox())!;
          expect(b.y + b.height).toBeLessThanOrEqual(size.height + 1);
          expect(b.x + b.width).toBeLessThanOrEqual(size.width + 1);
        }
        if (i === 0 || i === 5) await shot(page, `revisit-${size.width}x${size.height}-${i}`);
        if ((await next.textContent()) === 'もどる') {
          const kaos = page.getByTestId('revisit-kaos');
          await expect(kaos).toBeVisible();
          await shot(page, `revisit-${size.width}x${size.height}-glance`);
          await expect.poll(() => kaos.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
          break;
        }
        await next.click();
      }
    });
  });
}

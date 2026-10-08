import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro, watchTheIntro } from './opening';

/**
 * 第0話 — THE WAY INTO ALDEN (2026-10-08): after the name, a moment of dark,
 * the road, a girl he has never met, the village, his name in her mouth,
 * one moment she is not smiling — and the card 「MUGEN ZERO / ALDEN
 * VILLAGE」 before the village. SKIP from the first moment, asked first,
 * with the note line; skipped or seen, the world is left exactly the same.
 * Seen again from 人生の記録 → 回想, changing nothing.
 */

async function fresh(page: Page) {
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
}

async function named(page: Page, name: string) {
  await page.getByTestId('naming-input').fill(name);
  await page.getByTestId('naming-confirm').click();
}

/** Every row of the save, as stored. */
async function savedRows(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const req = indexedDB.open('mugen-zero-app');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const all = req.result.transaction('world_state', 'readonly').objectStore('world_state').getAll();
          all.onsuccess = () => {
            const out: Record<string, unknown> = {};
            for (const row of all.result as { key: string; value: unknown }[]) out[row.key] = row.value;
            req.result.close();
            resolve(out);
          };
          all.onerror = () => reject(all.error);
        };
      }),
  );
}

test.describe.configure({ timeout: 120_000 });

test('after the name: the dark, the road, a stranger, her name, his — then the card, then the village', async ({ page }) => {
  await fresh(page);
  await named(page, 'レイ');
  // Not the village yet: the dark first, with SKIP already there.
  await expect(page.getByTestId('intro')).toHaveAttribute('data-phase', 'dark');
  await expect(page.getByTestId('intro-skip')).toBeVisible();
  await expect(page.getByTestId('world-clock')).toHaveCount(0);

  // The road: a voice before a face.
  await expect(page.getByTestId('intro-line')).toHaveText('「……この先が、アルデン村か。」');
  await expect(page.getByTestId('stage-figure')).toHaveCount(0);
  await page.getByTestId('intro-next').click();
  await expect(page.locator('.stage-speaker')).toHaveText('？？？');
  await expect(page.getByTestId('intro-line')).toHaveText('「うん。もうすぐだよ♪」');

  const seen: { line: string; speaker: string; figure: boolean; skip: boolean }[] = [];
  const next = page.getByTestId('intro-next');
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('intro-arrival').isVisible()) break;
    await expect(next).toHaveCSS('visibility', 'visible', { timeout: 5000 });
    seen.push(
      await page.evaluate(() => ({
        line: document.querySelector('[data-testid="intro-line"]')?.textContent ?? '',
        speaker: document.querySelector('.stage-speaker')?.textContent ?? '',
        figure: !!document.querySelector('[data-testid="stage-figure"]'),
        skip: !!document.querySelector('[data-testid="intro-skip"]'),
      })),
    );
    await next.click();
  }
  const lines = seen.map((s) => s.line);
  // SKIP the whole way.
  expect(seen.every((s) => s.skip)).toBe(true);
  // She is seen from 「…………誰？」 on.
  const who = lines.indexOf('「…………誰？」');
  expect(who).toBeGreaterThan(0);
  expect(seen.slice(0, who + 1).some((s) => s.figure)).toBe(false);
  expect(seen[who + 2].figure).toBe(true);
  // He wonders, in his head: the wings.
  expect(lines).toContain('（右が天使の翼で、左が悪魔の翼？）');
  // A stranger until she says her name; then ケイオス — and his, which he never told her.
  const name = lines.indexOf('「ケイオス。」');
  expect(seen.slice(0, name).filter((s) => s.speaker === 'ケイオス')).toHaveLength(0);
  expect(seen[name].speaker).toBe('ケイオス');
  expect(lines).toEqual(
    expect.arrayContaining(['「理由が軽いな！？」', '「よろしくね、レイ♪」', '「なんで俺の名前知ってる？」', '「勘。」', '「絶対ない。」']),
  );
  // Nothing about who she is, or the world before.
  expect(lines.join('')).not.toMatch(/ルシファー|AI|戦争|女神|正体/);

  // The card, then the village.
  await expect(page.getByTestId('intro-arrival')).toContainText('MUGEN ZERO');
  await expect(page.getByTestId('intro-arrival')).toContainText('ALDEN VILLAGE');
  await expect(page.getByTestId('intro-skip')).toHaveCount(0);
  await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 6000 });

  // Once: after a restart, つづきから goes straight to the village.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('intro')).toHaveCount(0);
});

test('her one moment: not lit, and held — the way on comes only after it', async ({ page }) => {
  await fresh(page);
  await named(page, 'レイ');
  const next = page.getByTestId('intro-next');
  await expect(next).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 60; i++) {
    if ((await page.getByTestId('intro-line').textContent()) === '「絶対ない。」') break;
    await next.click();
  }
  await next.click();
  await expect(page.locator('.intro-still')).toHaveCount(1);
  await expect(page.getByTestId('intro-line')).toHaveText('……');
  await expect(next).toHaveCSS('visibility', 'hidden');
  await expect(next).toHaveCSS('visibility', 'visible', { timeout: 3000 });
  await next.click();
  // And she is herself again.
  await expect(page.locator('.intro-still')).toHaveCount(0);
  await expect(page.getByTestId('intro-line')).toHaveText('「ほら、行こ♪」');
});

test('SKIP asks first, with the note line; 戻る goes on where it was; スキップする arrives', async ({ page }) => {
  await fresh(page);
  await named(page, 'レイ');
  const next = page.getByTestId('intro-next');
  await expect(next).toBeVisible({ timeout: 5000 });
  await next.click();
  await next.click();
  const at = await page.getByTestId('intro-line').textContent();

  await page.getByTestId('intro-skip').click();
  const dialog = page.getByTestId('intro-skip-dialog');
  await expect(dialog).toContainText('導入ストーリーをスキップしますか？');
  await expect(page.getByTestId('intro-skip-note')).toHaveText('この物語はnote版『MUGEN ZERO』でも読むことができます。');
  // No address in the game yet: no link to follow.
  await expect(page.getByTestId('intro-note-link')).toHaveCount(0);
  await page.getByTestId('intro-skip-no').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('intro-line')).toHaveText(at!);

  await page.getByTestId('intro-skip').click();
  await page.getByTestId('intro-skip-yes').click();
  await expect(page.getByTestId('intro-arrival')).toBeVisible();
  await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 6000 });
});

test('skipped or seen, the world is left exactly the same', async ({ page }) => {
  await fresh(page);
  await named(page, 'レイ');
  await watchTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
  const seen = await savedRows(page);

  await fresh(page);
  await named(page, 'レイ');
  // Skipped from the very first moment, in the dark.
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
  const skipped = await savedRows(page);

  expect(skipped).toEqual(seen);
  expect(seen.heroName ?? seen.hero_name ?? JSON.stringify(seen)).toContain('レイ');
  expect(JSON.stringify(seen.readMarks)).toContain('event:OPENING_INTRO');
});

test('人生の記録 → 回想: seen again, skippable straight back, changing nothing', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
  const before = await savedRows(page);

  await page.getByTestId('archive-button').click();
  await page.getByTestId('recall-OPENING_INTRO').click();
  await expect(page.getByTestId('intro-line')).toHaveText('「……この先が、アルデン村か。」', { timeout: 5000 });
  await page.getByTestId('intro-skip').click();
  await page.getByTestId('intro-skip-yes').click();
  // Straight back: no card, no village.
  await expect(page.getByTestId('archive-screen')).toBeVisible();
  await expect(page.getByTestId('intro-arrival')).toHaveCount(0);

  // Seen to the end, it comes back here too.
  await page.getByTestId('recall-OPENING_INTRO').click();
  await expect(page.getByTestId('intro-next')).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('archive-screen').isVisible()) break;
    await expect(page.getByTestId('intro-next')).toHaveCSS('visibility', 'visible', { timeout: 5000 });
    await page.getByTestId('intro-next').click();
  }
  await expect(page.getByTestId('archive-screen')).toBeVisible();
  expect(await savedRows(page)).toEqual(before);
});

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    test('SKIP, the words, the button and the question all on the screen', async ({ page }) => {
      await fresh(page);
      await named(page, 'レイ');
      await expect(page.getByTestId('intro-next')).toBeVisible({ timeout: 5000 });
      const inside = async (id: string) => {
        const b = (await page.getByTestId(id).boundingBox())!;
        expect(b.x, id).toBeGreaterThanOrEqual(0);
        expect(b.y, id).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, id).toBeLessThanOrEqual(size.width + 1);
        expect(b.y + b.height, id).toBeLessThanOrEqual(size.height + 1);
      };
      for (let i = 0; i < 6; i++) {
        for (const id of ['intro-skip', 'intro-line', 'intro-next']) await inside(id);
        await page.getByTestId('intro-next').click();
      }
      await page.getByTestId('intro-skip').click();
      for (const id of ['intro-skip-yes', 'intro-skip-no', 'intro-skip-note']) await inside(id);
    });
  });
}

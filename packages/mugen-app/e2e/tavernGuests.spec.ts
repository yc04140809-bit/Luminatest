import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 酒場の客 — SILHOUETTE STRANGERS (2026-10-09).
 *
 *   酒場 →「客と話す」→ 今夜の客のシルエット＋短い会話 → もどる → マスター
 *
 * Tonight's stranger turns with the day (content/talk/tavernGuests): the
 * silhouette as delivered (transparent, 1024×1536, not stretched) in the
 * master's own box while they speak, one figure at a time; their label over
 * their words; nothing recorded — and the master's own talk as it was.
 */

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

async function readGuest(page: Page): Promise<{ speaker: string; lines: string[] }> {
  const lines: string[] = [];
  const speaker = (await page.locator('.tavern-words .speaker').textContent()) ?? '';
  for (let i = 0; i < 6; i++) {
    lines.push((await page.getByTestId('tavern-line').textContent()) ?? '');
    const next = page.getByTestId('tavern-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  return { speaker, lines };
}

/** The night passes, and the tavern again. */
async function nextNight(page: Page) {
  await page.getByTestId('tavern-leave').click();
  const day = await page.getByTestId('world-clock').textContent();
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect(page.getByTestId('rest-button')).toBeEnabled();
  await page.getByTestId('tavern-button').click();
}

test('tonight’s stranger: their silhouette in the master’s place, their label, a few lines — then the master back, and nothing recorded', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshVillage(page);
  await page.getByTestId('tavern-button').click();
  await expect(page.getByTestId('tavern-master')).toBeVisible();
  const masterBox = (await page.getByTestId('tavern-master').boundingBox())!;
  await page.waitForTimeout(300);
  const before = await savedRows(page);

  // Day 1: a traveller (the man's silhouette).
  await expect(page.getByTestId('tavern-guest-talk')).toHaveAttribute('data-guest', 'tavern_guest_male');
  await page.getByTestId('tavern-guest-talk').click();
  const figure = page.getByTestId('tavern-guest');
  await expect(figure).toBeVisible();
  await expect(figure).toHaveAttribute('data-guest', 'tavern_guest_male');
  await expect(page.getByTestId('tavern-master')).toHaveCount(0);
  // As delivered: the file, its own shape, on a transparent ground, in the master's box.
  const seen = await figure.evaluate((i: HTMLImageElement) => ({
    src: decodeURIComponent(i.currentSrc || i.src),
    natural: [i.naturalWidth, i.naturalHeight],
    fit: getComputedStyle(i).objectFit,
  }));
  expect(seen.src).toContain('tavern-guest-male');
  expect(seen.natural).toEqual([1024, 1536]);
  expect(seen.fit).toBe('contain');
  expect(await figure.boundingBox()).toEqual(masterBox);

  expect(await readGuest(page)).toEqual({
    speaker: '旅人',
    lines: ['「グリーンウッドの森は、奥へ行くほど静かになる。」', '「静かすぎるのも、それはそれで落ち着かねぇ。」'],
  });
  // The master is back, and his own first talk is still owed (a stranger meets nobody).
  await expect(page.getByTestId('tavern-guest')).toHaveCount(0);
  await expect(page.getByTestId('tavern-master')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await savedRows(page)).toEqual(before);
  await page.getByTestId('tavern-talk').click();
  const meeting: string[] = [];
  for (let i = 0; i < 30; i++) {
    meeting.push((await page.getByTestId('tavern-line').textContent()) ?? '');
    const next = page.getByTestId('tavern-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  expect(meeting).toEqual(expect.arrayContaining(['カウンターの奥に、大柄な男が立っている。']));
  expect(errors).toEqual([]);
});

test('本日の客: a different stranger each night — the woman, the warrior, the bard — and, one night in seven, the hooded one', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await freshVillage(page);
  await page.getByTestId('tavern-button').click();
  const nights: { guest: string | null; speaker: string; first: string }[] = [];
  for (let day = 1; day <= 7; day++) {
    if (day > 1) await nextNight(page);
    const guest = await page.getByTestId('tavern-guest-talk').getAttribute('data-guest');
    await page.getByTestId('tavern-guest-talk').click();
    await expect(page.getByTestId('tavern-guest')).toHaveAttribute('data-guest', guest!);
    const said = await readGuest(page);
    nights.push({ guest, speaker: said.speaker, first: said.lines[0] });
  }
  expect(nights.map((n) => n.guest)).toEqual([
    'tavern_guest_male',
    'tavern_guest_female',
    'tavern_guest_warrior',
    'tavern_guest_bard',
    'tavern_guest_male',
    'tavern_guest_female',
    'tavern_guest_hooded',
  ]);
  expect(nights.map((n) => n.speaker)).toEqual(['旅人', '旅人', '戦士', '吟遊詩人', '客', '客', '怪しい客']);
  // The same silhouette, another person: the man on night 5 is not night 1's traveller.
  expect(nights[4].first).not.toBe(nights[0].first);
  expect(nights[6].first).toBe('「……珍しいものを集めている。」');
});

for (const [w, h] of [
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: the three choices on screen; the stranger whole, on the floor, clear of the words`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    await page.getByTestId('tavern-button').click();
    for (const id of ['tavern-talk', 'tavern-guest-talk', 'tavern-leave']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y + b.height, id).toBeLessThanOrEqual(h);
      expect(b.x + b.width, id).toBeLessThanOrEqual(w);
    }
    // Each of the five, through a week of nights.
    const met = new Set<string>();
    for (let day = 1; day <= 7; day++) {
      if (day > 1) await nextNight(page);
      await page.getByTestId('tavern-guest-talk').click();
      const figure = page.getByTestId('tavern-guest');
      await expect(figure).toBeVisible();
      await expect.poll(() => figure.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
      met.add((await figure.getAttribute('data-guest'))!);
      const b = (await figure.boundingBox())!;
      const words = (await page.getByTestId('tavern-words').boundingBox())!;
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height).toBeLessThanOrEqual(h);
      expect(b.x + b.width).toBeLessThanOrEqual(w);
      // The box stands clear of the words.
      expect(words.x + words.width).toBeLessThanOrEqual(b.x + b.width * 0.25);
      while ((await page.getByTestId('tavern-next').textContent()) !== 'もどる') await page.getByTestId('tavern-next').click();
      await page.getByTestId('tavern-next').click();
    }
    expect(met.size).toBe(5);
  });
}

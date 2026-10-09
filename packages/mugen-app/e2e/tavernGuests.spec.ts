import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 酒場の客 — SILHOUETTE STRANGERS, AND WHAT THEY OFFER (2026-10-09).
 *
 *   酒場 →「客と話す」→ 今夜の客のシルエット＋短い会話
 *        → 交換（物々交換）／怪しい客のレア交換／吟遊詩人の MUSIC ARCHIVE
 *        → もどる → マスター
 *
 * Tonight's stranger turns with the day (content/talk/tavernGuests): the
 * silhouette as delivered in the master's own box while they are up, one
 * figure at a time. A swap is once while they are in, kept across a
 * restart. The archive lists only the pieces heard, plays one in the
 * tavern, and the room's music is back on walking out; a piece set for the
 * village plays in its ordinary places only, and is kept.
 */

type DevWorld = {
  addItem(id: string, n?: number): Promise<number>;
  getItemCount(id: string): number;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

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

async function restart(page: Page) {
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  for (let i = 0; i < 30; i++) {
    if (await page.getByTestId('world-clock').isVisible().catch(() => false)) break;
    const back = page.getByTestId('back-to-village');
    if (await back.isVisible().catch(() => false)) await back.click().catch(() => {});
    await page.waitForTimeout(200);
  }
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

async function music(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const a = (window as unknown as { __mugenAudio?: { bgmState(): { current: string | null } } }).__mugenAudio;
    return a?.bgmState().current ?? null;
  });
}

/** The stranger's words to their end; what was said, and under whose name. */
async function readGuest(page: Page): Promise<{ speakers: string[]; lines: string[] }> {
  const lines: string[] = [];
  const speakers: string[] = [];
  for (let i = 0; i < 8; i++) {
    speakers.push((await page.locator('.tavern-words .speaker').textContent()) ?? '');
    lines.push((await page.getByTestId('tavern-line').textContent()) ?? '');
    const next = page.getByTestId('tavern-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  return { speakers, lines };
}

/** Whatever they offer after their words, closed. */
async function closePanel(page: Page) {
  const close = page.getByTestId('tavern-panel-close');
  if (await close.isVisible().catch(() => false)) await close.click();
  await expect(page.getByTestId('tavern-master')).toBeVisible();
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

async function toNight(page: Page, day: number) {
  await page.getByTestId('tavern-button').click();
  for (let d = 1; d < day; d++) await nextNight(page);
}

test('tonight’s stranger: their silhouette in the master’s place, their label, a few lines, their offer — then the master back, and nothing recorded', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshVillage(page);
  await page.getByTestId('tavern-button').click();
  await expect(page.getByTestId('tavern-master')).toBeVisible();
  await expect(page.getByTestId('tavern-talk')).toHaveText('マスターと話す');
  await expect(page.getByTestId('tavern-tonight')).toHaveText('今夜の客：旅人');
  const masterBox = (await page.getByTestId('tavern-master').boundingBox())!;
  await page.waitForTimeout(500);
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
    speakers: ['旅人', '旅人'],
    lines: ['「森の奥で、妙に光る木の実を見たよ。」', '「……食えるかどうかは、知らねぇけどな。」'],
  });
  // Then his offer, with him still up: 【交換】.
  await expect(page.getByTestId('tavern-trade')).toBeVisible();
  await expect(page.getByTestId('tavern-trade-say')).toHaveText('「交換してくれないか？」');
  await expect(figure).toBeVisible();
  // やめる: the master is back, and his own first talk is still owed (a stranger meets nobody).
  await page.getByTestId('tavern-panel-close').click();
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

test('本日の客: a different stranger each night, each with their part — and, one night in seven, the hooded one', async ({ page }) => {
  test.setTimeout(150_000);
  await freshVillage(page);
  await page.getByTestId('tavern-button').click();
  const nights: { guest: string | null; speaker: string; first: string; offer: string }[] = [];
  for (let day = 1; day <= 7; day++) {
    if (day > 1) await nextNight(page);
    const guest = await page.getByTestId('tavern-guest-talk').getAttribute('data-guest');
    await page.getByTestId('tavern-guest-talk').click();
    await expect(page.getByTestId('tavern-guest')).toHaveAttribute('data-guest', guest!);
    const said = await readGuest(page);
    const offer = (await page.getByTestId('tavern-trade').isVisible())
      ? 'TRADE'
      : (await page.getByTestId('tavern-archive').isVisible())
        ? 'ARCHIVE'
        : 'TALK';
    nights.push({ guest, speaker: said.speakers[0], first: said.lines[0], offer });
    await closePanel(page);
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
  expect(nights.map((n) => n.offer)).toEqual(['TRADE', 'TALK', 'TRADE', 'ARCHIVE', 'TALK', 'TRADE', 'TRADE']);
  // The same silhouette, another person: the man on night 5 is not night 1's traveller.
  expect(nights[4].first).toBe('「この村のパン、うまいな。」');
  expect(nights[6].first).toBe('「……珍しいものを集めている。」');
});

test('a swap: too little says so and changes nothing; enough — given and taken; once while they are in, and so after a restart', async ({
  page,
}) => {
  await freshVillage(page);
  await world(page, `(w) => w.addItem('IRON_ORE', 1)`);
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-guest-talk').click();
  await readGuest(page);
  await expect(page.getByTestId('tavern-trade-give')).toHaveText('渡す：鉄鉱石 ×2（所持 1）');
  await expect(page.getByTestId('tavern-trade-get')).toHaveText('受け取る：古びた硬貨 ×1');

  // One ore: not enough.
  await page.getByTestId('tavern-trade-do').click();
  await expect(page.getByTestId('tavern-trade-say')).toHaveText('素材が足りない。');
  expect(await world<number>(page, `(w) => w.getItemCount('IRON_ORE')`)).toBe(1);
  expect(await world<number>(page, `(w) => w.getItemCount('OLD_COIN')`)).toBe(0);

  // Two: the swap.
  await world(page, `(w) => w.addItem('IRON_ORE', 1)`);
  await page.getByTestId('tavern-trade-do').click();
  await expect(page.getByTestId('tavern-trade-say')).toHaveText('「助かるよ。」');
  expect(await world<number>(page, `(w) => w.getItemCount('IRON_ORE')`)).toBe(0);
  expect(await world<number>(page, `(w) => w.getItemCount('OLD_COIN')`)).toBe(1);
  // And not again tonight.
  await expect(page.getByTestId('tavern-trade-do')).toHaveText('交換済み');
  await expect(page.getByTestId('tavern-trade-do')).toBeDisabled();
  await world(page, `(w) => w.addItem('IRON_ORE', 2)`);
  await page.getByTestId('tavern-panel-close').click();
  await page.getByTestId('tavern-guest-talk').click();
  await readGuest(page);
  await expect(page.getByTestId('tavern-trade-do')).toBeDisabled();

  // After a restart, the same night: still made, and the bag as it was.
  await restart(page);
  const rows = await savedRows(page);
  expect(rows.tavernTrades).toEqual({ day: 1, done: ['TRADE_ORE_FOR_COIN'] });
  expect(await world<number>(page, `(w) => w.getItemCount('OLD_COIN')`)).toBe(1);
  expect(await world<number>(page, `(w) => w.getItemCount('IRON_ORE')`)).toBe(2);
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-guest-talk').click();
  await readGuest(page);
  await expect(page.getByTestId('tavern-trade-do')).toBeDisabled();
});

test('the hooded guest, one night in seven: a rarer swap, said a little differently, and nothing about who they are', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await freshVillage(page);
  await world(page, `(w) => w.addItem('OLD_ARROWHEAD', 1)`);
  await world(page, `(w) => w.addItem('BROKEN_CLASP', 1)`);
  await toNight(page, 7);
  await expect(page.getByTestId('tavern-tonight')).toHaveText('今夜は、見慣れない客がいる。');
  await page.getByTestId('tavern-guest-talk').click();
  const said = await readGuest(page);
  expect(said.speakers.every((s) => s === '怪しい客')).toBe(true);
  await expect(page.getByTestId('tavern-trade')).toHaveAttribute('data-rare', 'yes');
  await expect(page.getByTestId('tavern-trade-say')).toHaveText('「……交換する気はあるか？」');
  await expect(page.getByTestId('tavern-trade-give')).toContainText('古い矢じり ×1');
  await expect(page.getByTestId('tavern-trade-give')).toContainText('割れた留め金 ×1');
  await expect(page.getByTestId('tavern-trade-get')).toHaveText('受け取る：魔力の欠片 ×1');
  await page.getByTestId('tavern-trade-do').click();
  await expect(page.getByTestId('tavern-trade-say')).toHaveText('「悪くない。」');
  expect(await world<number>(page, `(w) => w.getItemCount('MANA_SHARD')`)).toBe(1);
  expect(await world<number>(page, `(w) => w.getItemCount('OLD_ARROWHEAD')`)).toBe(0);
  await expect(page.getByTestId('tavern-screen')).not.toContainText(/正体|組織|ギルド|名前は/);
});

test('the bard’s MUSIC ARCHIVE: only what has been heard; a piece plays in the tavern; walking out, the room’s music is back', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await freshVillage(page);
  await toNight(page, 4);
  await expect(page.getByTestId('tavern-tonight')).toHaveText('今夜は、吟遊詩人が来ている。');
  await page.getByTestId('tavern-guest-talk').click();
  await readGuest(page);
  await expect(page.getByTestId('tavern-archive')).toBeVisible();
  await expect(page.getByTestId('tavern-archive-say')).toHaveText('「聞きたい曲はあるかい？」');
  // Heard so far: the title, the opening, Kaos, the village, the tavern — and nothing else.
  const listed = await page.getByTestId('tavern-archive-list').locator('li').evaluateAll((rows) =>
    rows.map((r) => r.getAttribute('data-testid')),
  );
  expect(listed).toEqual([
    'tavern-piece-TITLE_MAIN',
    'tavern-piece-OPENING',
    'tavern-piece-KAOS_EVENT',
    'tavern-piece-ALDEN_VILLAGE',
    'tavern-piece-TAVERN',
  ]);
  for (const id of ['GREENWOOD_FOREST', 'NORMAL_BATTLE', 'BOSS_BATTLE']) await expect(page.getByTestId(`tavern-piece-${id}`)).toHaveCount(0);

  await expect.poll(() => music(page)).toBe('TAVERN');
  await page.getByTestId('tavern-play-OPENING').click();
  await expect(page.getByTestId('tavern-archive-say')).toHaveText('「それじゃあ、一曲。」');
  await expect.poll(() => music(page)).toBe('OPENING');
  await expect(page.getByTestId('tavern-piece-OPENING')).toHaveAttribute('data-playing', 'yes');
  // Back to the master: still the bard's piece, while in the tavern.
  await page.getByTestId('tavern-panel-close').click();
  expect(await music(page)).toBe('OPENING');
  // Out: the village's own.
  await page.getByTestId('tavern-leave').click();
  await expect.poll(() => music(page)).toBe('ALDEN_VILLAGE');
  // In again: the tavern's own.
  await page.getByTestId('tavern-button').click();
  await expect.poll(() => music(page)).toBe('TAVERN');

  // The forest, once: then it is in the archive.
  await page.getByTestId('tavern-leave').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect.poll(() => music(page)).toBe('GREENWOOD_FOREST');
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-guest-talk').click();
  await readGuest(page);
  await expect(page.getByTestId('tavern-piece-GREENWOOD_FOREST')).toBeVisible();
  // Recorded as each was played: the forest after the tavern.
  const kept = (await savedRows(page)).musicUnlocks as string[];
  expect(kept.slice(-2)).toEqual(['TAVERN', 'GREENWOOD_FOREST']);
  expect(kept).not.toContain('NORMAL_BATTLE');
});

test('a piece for the village: Alden’s ordinary places play it, kept across a restart — the forest and a fight keep their own; 元に戻す', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await freshVillage(page);
  await toNight(page, 4);
  await page.getByTestId('tavern-guest-talk').click();
  await readGuest(page);
  await expect(page.getByTestId('tavern-village-bgm')).toHaveText('村のBGM：いつもの曲');
  await expect(page.getByTestId('tavern-set-village')).toHaveCount(0);
  await page.getByTestId('tavern-play-KAOS_EVENT').click();
  await page.getByTestId('tavern-set-village').click();
  await expect(page.getByTestId('tavern-village-bgm')).toHaveText('村のBGM：KAOS');
  await expect(page.getByTestId('tavern-set-village')).toHaveCount(0);
  await page.getByTestId('tavern-panel-close').click();
  await page.getByTestId('tavern-leave').click();
  // The village, and the bakery in it.
  await expect.poll(() => music(page)).toBe('KAOS_EVENT');
  await page.getByTestId('bakery-button').click();
  expect(await music(page)).toBe('KAOS_EVENT');
  await page.getByTestId('bakery-leave').click();

  await restart(page);
  expect((await savedRows(page)).villageBgm).toBe('KAOS_EVENT');
  await expect.poll(() => music(page)).toBe('KAOS_EVENT');
  // The forest and its fight are their own.
  await page.getByTestId('explore-button').click();
  expect(await music(page)).toBe('KAOS_EVENT');
  await page.getByTestId('forest-button').click();
  await expect.poll(() => music(page)).toBe('GREENWOOD_FOREST');
  await page.getByTestId('encounter-button').click();
  await expect.poll(() => music(page)).toBe('NORMAL_BATTLE');
});

test('元に戻す: the village’s own piece again', async ({ page }) => {
  test.setTimeout(120_000);
  await freshVillage(page);
  await toNight(page, 4);
  await page.getByTestId('tavern-guest-talk').click();
  await readGuest(page);
  await page.getByTestId('tavern-play-OPENING').click();
  await page.getByTestId('tavern-set-village').click();
  await expect(page.getByTestId('tavern-village-bgm')).toHaveText('村のBGM：OPENING');
  await page.getByTestId('tavern-reset-village').click();
  await expect(page.getByTestId('tavern-village-bgm')).toHaveText('村のBGM：いつもの曲');
  await page.getByTestId('tavern-panel-close').click();
  await page.getByTestId('tavern-leave').click();
  await expect.poll(() => music(page)).toBe('ALDEN_VILLAGE');
  expect((await savedRows(page)).villageBgm ?? null).toBeNull();
});

for (const [w, h] of [
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: the three choices on screen; the stranger whole, clear of the words; the swap and the archive within reach`, async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    await page.getByTestId('tavern-button').click();
    const onScreen = async (id: string) => {
      const el = page.getByTestId(id).first();
      await el.scrollIntoViewIfNeeded();
      const b = (await el.boundingBox())!;
      expect(b.y, id).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, id).toBeLessThanOrEqual(h + 0.5);
      expect(b.x + b.width, id).toBeLessThanOrEqual(w + 0.5);
    };
    for (const id of ['tavern-talk', 'tavern-guest-talk', 'tavern-leave']) await onScreen(id);
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
      await readGuest(page);
      if (await page.getByTestId('tavern-trade').isVisible()) {
        for (const id of ['tavern-trade-give', 'tavern-trade-get', 'tavern-trade-do', 'tavern-panel-close']) await onScreen(id);
      }
      if (await page.getByTestId('tavern-archive').isVisible()) {
        for (const id of ['tavern-play-TITLE_MAIN', 'tavern-play-TAVERN', 'tavern-panel-close']) await onScreen(id);
        await page.getByTestId('tavern-play-TAVERN').click();
        await onScreen('tavern-panel-close');
      }
      await closePanel(page);
    }
    expect(met.size).toBe(5);
  });
}

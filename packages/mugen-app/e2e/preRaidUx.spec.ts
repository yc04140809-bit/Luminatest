import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { goTo, settled, things } from './roam';

/**
 * 襲撃前の体験改善 ①〜⑤ (作者指示 2026-10-11) — in this file:
 *
 *   ① 酒場: three doors at the top; 「加工を頼む」 inside Grave's own menu.
 *   ③ ステータス: the full-length picture, large, opened and closed three ways.
 *   ④ 主人公×ケイオス: words for how they are — as they set out and come back.
 *   ⑤ リザルト: the winnings' own piece, and back to the forest's after.
 *
 * (② Gald's line and the rename to 鉄の腕輪 are pinned by unit tests and the
 * Artifact's e2e.) The helpers below are the pre-raid days spec's.
 *
 * Original note of the helpers' file — 襲撃前の日々 (作者指示 2026-10-11): 待たされ感・探索動機・噂導線 —
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


test.describe.configure({ timeout: 180_000 });

type Cond = { hp: number; mp: number };
const setCondition = (page: Page, c: Cond) =>
  page.evaluate((v) => (window as unknown as { __mugenWorld: { setBattleCondition(c: Cond): Promise<void> } }).__mugenWorld.setBattleCondition(v), c);
const nudgeRoll = (page: Page, r: number) =>
  page.evaluate((v) => ((window as unknown as { __mugenNudgeRoll?: number }).__mugenNudgeRoll = v), r);

async function readNudge(page: Page): Promise<string[]> {
  const said: string[] = [];
  for (let i = 0; i < 8; i++) {
    if (!(await page.getByTestId('kaos-nudge').isVisible().catch(() => false))) break;
    said.push(((await page.getByTestId('kaos-nudge-line').textContent()) ?? '').trim());
    await page.getByTestId('kaos-nudge-next').click();
  }
  return said;
}

async function onScreen(page: Page, id: string) {
  const box = (await page.getByTestId(id).boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x, id).toBeGreaterThanOrEqual(0);
  expect(box.y, id).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, id).toBeLessThanOrEqual(vp.width + 1);
  expect(box.y + box.height, id).toBeLessThanOrEqual(vp.height + 1);
}

// ---------------- ① 酒場 ----------------

test('① the tavern at 640×300: three doors at the top; Grave\'s menu — 話を聞く / 加工を頼む / やめる; before he is met, straight into his meeting', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 300 });
  await freshVillage(page);
  // Not met yet: 「マスターと話す」 is his meeting, as always — no menu.
  await page.getByTestId('tavern-button').click();
  await expect(page.getByTestId('tavern-craft-open')).toHaveCount(0);
  await page.getByTestId('tavern-talk').click();
  await expect(page.getByTestId('tavern-line')).toBeVisible();
  await expect(page.getByTestId('tavern-master-menu')).toHaveCount(0);
  while (await page.getByTestId('tavern-next').isVisible().catch(() => false)) await page.getByTestId('tavern-next').click();

  // Met: the top is three doors at most — no 加工 there.
  await expect(page.getByTestId('tavern-talk')).toBeVisible();
  await expect(page.getByTestId('tavern-craft-open')).toHaveCount(0);
  for (const id of ['tavern-talk', 'tavern-leave']) await onScreen(page, id);
  // His menu.
  await page.getByTestId('tavern-talk').click();
  await expect(page.getByTestId('tavern-master-menu')).toBeVisible();
  for (const id of ['tavern-master-listen', 'tavern-craft-open', 'tavern-master-back']) await onScreen(page, id);
  await expect(page.getByTestId('tavern-master-listen')).toHaveText(/^話を聞く/);
  await expect(page.getByTestId('tavern-craft-open')).toHaveText('加工を頼む');
  await expect(page.getByTestId('tavern-master-back')).toHaveText('やめる');
  // やめる: back to the three doors.
  await page.getByTestId('tavern-master-back').click();
  await expect(page.getByTestId('tavern-master-menu')).toHaveCount(0);
  await expect(page.getByTestId('tavern-leave')).toBeVisible();
  // 加工を頼む: his handwork, as before.
  await page.getByTestId('tavern-talk').click();
  await page.getByTestId('tavern-craft-open').click();
  await expect(page.getByTestId('tavern-craft')).toBeVisible();
  await expect(page.getByTestId('craft-CRAFT_IRON_CHARM')).toContainText('鉄の腕輪');
  await page.getByTestId('tavern-panel-close').click();
  // 話を聞く: his greeting.
  await page.getByTestId('tavern-talk').click();
  await page.getByTestId('tavern-master-listen').click();
  await expect(page.getByTestId('tavern-line')).toBeVisible();
});

// ---------------- ③ ステータス ----------------

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`③ the full-length picture at ${size.width}×${size.height}: the magnifier, for both of them; large and whole; closed by ×, the dark, or the picture`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await freshVillage(page);
    await page.getByTestId('status-button').click();
    await expect(page.getByTestId('status-screen')).toBeVisible();
    for (const who of ['hero', 'kaos']) {
      if (who === 'kaos') await page.getByTestId('status-tab-kaos').click();
      await expect(page.getByTestId(`status-portrait-${who}`)).toBeVisible();
      await expect(page.getByTestId('status-zoom')).toBeVisible();
      await onScreen(page, 'status-zoom');
      // By ×.
      await page.getByTestId('status-zoom').click();
      await expect(page.getByTestId('portrait-zoom')).toBeVisible();
      await expect(page.getByTestId('portrait-zoom-img')).toBeVisible();
      await page.waitForTimeout(250);
      const img = (await page.getByTestId('portrait-zoom-img').boundingBox())!;
      expect(img.y).toBeGreaterThanOrEqual(-1);
      expect(img.y + img.height).toBeLessThanOrEqual(size.height + 1);
      expect(img.x).toBeGreaterThanOrEqual(-1);
      expect(img.x + img.width).toBeLessThanOrEqual(size.width + 1);
      // Large: nearly the whole height of the screen.
      expect(img.height).toBeGreaterThan(size.height * 0.9);
      // Its own shape: as wide for its height as the file.
      const ratio = await page.getByTestId('portrait-zoom-img').evaluate((el) => {
        const i = el as HTMLImageElement;
        return { file: i.naturalWidth / i.naturalHeight, shown: i.getBoundingClientRect().width / i.getBoundingClientRect().height };
      });
      expect(Math.abs(ratio.file - ratio.shown)).toBeLessThan(0.02);
      await onScreen(page, 'portrait-zoom-close');
      await page.getByTestId('portrait-zoom-close').click();
      await expect(page.getByTestId('portrait-zoom')).toHaveCount(0);
      // By the dark around it.
      await page.getByTestId('status-zoom').click();
      await page.mouse.click(6, size.height - 6);
      await expect(page.getByTestId('portrait-zoom')).toHaveCount(0);
      // By the picture itself.
      await page.getByTestId('status-zoom').click();
      await page.getByTestId('portrait-zoom-img').click();
      await expect(page.getByTestId('portrait-zoom')).toHaveCount(0);
    }
    // The screen itself as it was: the numbers, and the way back.
    await expect(page.getByTestId('status-defense')).toBeVisible();
    await page.getByTestId('status-back').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
  });
}

// ---------------- ④ 主人公×ケイオス ----------------

test('④ setting out hurt: 「その傷で行くつもり？」 — once a day; and healthy, nothing of the kind', async ({ page }) => {
  await freshVillage(page);
  await nudgeRoll(page, 0);
  // Whole and rested, the first 「どっち行く？」 not had yet: nothing said as they set out.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await expect(page.getByTestId('kaos-nudge')).toHaveCount(0);
  await page.getByTestId('back-to-village').click();
  while (await page.getByTestId('kaos-nudge').isVisible().catch(() => false)) await page.getByTestId('kaos-nudge-next').click();

  // Hurt.
  await setCondition(page, { hp: 20, mp: 48 });
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('kaos-nudge')).toHaveAttribute('data-nudge', 'HURT_1');
  await expect(page.getByTestId('talk-stage')).toBeVisible();
  const said = await readNudge(page);
  expect(said).toEqual(['「ちょっと待って。」', '「？」', '「その傷で行くつもり？」', '「まだ動ける。」', '「そういう問題じゃないの。」']);
  // The way on all there.
  await expect(page.getByTestId('forest-button')).toBeEnabled();
  // Once a day.
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await expect(page.locator('[data-testid="kaos-nudge"][data-nudge^="HURT"]')).toHaveCount(0);
});

test('④ her magic low as they set out: 「今日は魔法、控えめにな。」; a word left half-read goes with the screen', async ({ page }) => {
  await freshVillage(page);
  await nudgeRoll(page, 0);
  await setCondition(page, { hp: 100, mp: 5 });
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('kaos-nudge')).toHaveAttribute('data-nudge', 'LOW_MP_1');
  await expect(page.getByTestId('kaos-nudge-line')).toHaveText('「今日は魔法、控えめにな。」');
  // Leaving the map with it half-read: nothing of it on the next screen.
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.locator('[data-testid="kaos-nudge"][data-nudge="LOW_MP_1"]')).toHaveCount(0);
});

test('④ coming back: a light purse first; the same day, nothing more; the next day with money, a day with nothing in it; the third time back, 「もう暗いよ。」', async ({
  page,
}) => {
  await freshVillage(page);
  await readAllRumours(page);
  await nudgeRoll(page, 0);
  await outAndBack(page);
  await expect(page.getByTestId('kaos-nudge')).toHaveAttribute('data-nudge', 'POOR_1');
  expect(await readNudge(page)).toEqual(['「ねぇ。」', '「なんだ。」', '「……財布、軽くない？」', '「気のせいだ。」', '「絶対気のせいじゃない。」']);
  // Once a day.
  await outAndBack(page);
  await expect(page.getByTestId('kaos-nudge')).toHaveCount(0);

  // The next day, money in the purse: nothing true — her nothing-in-particular.
  await world(page, `(w) => w.advanceDays(1)`);
  await world(page, `(w) => w.addLumi(100)`);
  await outAndBack(page);
  await expect(page.getByTestId('kaos-nudge')).toHaveAttribute('data-nudge', 'IDLE_1');
  expect((await readNudge(page)).at(-1)).toBe('「たぶん。」');

  // Another day: twice back with nothing said, the third time — late.
  await world(page, `(w) => w.advanceDays(1)`);
  await nudgeRoll(page, 1);
  await outAndBack(page);
  await outAndBack(page);
  await nudgeRoll(page, 0);
  await outAndBack(page);
  await expect(page.getByTestId('kaos-nudge')).toHaveAttribute('data-nudge', 'LATE_1');
  expect(await readNudge(page)).toEqual(['「もう暗いよ。」', '「もう少しだけ。」', '「キミ、そう言って長いんだから。」']);
});

// ---------------- ⑤ リザルトBGM ----------------

test('⑤ the winnings to their own piece (Victory\'s Clear Dawn) — one piece at a time — and the forest\'s again after', async ({ page }) => {
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
  await expect(page.getByTestId('start-button')).toBeVisible();
  // The first touch, so music may sound.
  await page.mouse.click(4, 4);
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();

  type St = { current: string | null; live: number; file: string };
  const audio = () =>
    page.evaluate((): St => {
      const a = (window as unknown as {
        __mugenAudio: { bgmState(): { current: string | null }; bgm?: HTMLAudioElement | null; bgmOut?: HTMLAudioElement | null };
      }).__mugenAudio;
      const els = [a.bgm, a.bgmOut].filter((e): e is HTMLAudioElement => !!e);
      return {
        current: a.bgmState().current,
        live: els.filter((e) => !e.paused && e.volume > 0.001).length,
        file: decodeURIComponent(a.bgm?.src ?? '').split('/').pop() ?? '',
      };
    });
  const playing = async (id: string) => {
    await expect.poll(async () => (await audio()).current, { timeout: 8000 }).toBe(id);
    await expect.poll(async () => (await audio()).live, { timeout: 4000 }).toBe(1);
  };

  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await playing('GREENWOOD_FOREST');
  await page.getByTestId('encounter-button').click();
  await playing('NORMAL_BATTLE');
  const { fightToResult } = await import('./battle');
  await fightToResult(page);
  await playing('RESULT_NORMAL');
  expect((await audio()).file).toMatch(/^result-victory.*\.mp3/);
  await page.getByTestId('result-done').click();
  await playing('GREENWOOD_FOREST');
  // And nothing of the winnings' piece left over.
  await page.waitForTimeout(800);
  expect((await audio()).live).toBe(1);
  expect((await audio()).current).toBe('GREENWOOD_FOREST');
});

import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { command, fightUntil, readyToAct } from './battle';
import { settled } from './roam';

/**
 * セキリュウガ戦後＋序盤UX (2026-10-07):
 *
 *   P0  the tavern on a first visit: his meeting, then the story, with a turn between
 *   P1  《瞬断》 · AUTO after Gald · a boss's great move with its cut-in · the tavern after セキリュウガ
 *   P2  a new destination glows and says so · 噂話 · NEW cleared only by looking
 *
 * Gald's answer is given through the development handle on the world, as
 * sekiryuga.spec does; the screens after it are the real ones.
 */

type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
  getSekiryugaStage(): string;
  isRead(id: string): boolean;
  applyBattleReward(id: string, r: { exp: number; lumi: number; items: unknown[] }): Promise<unknown>;
  claimRareFind(place: string, id: string): Promise<boolean>;
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
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function pastGald(page: Page) {
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
}

async function readTavern(page: Page): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 150; i++) {
    seen.push((await page.getByTestId('tavern-line').textContent()) ?? '');
    const next = page.getByTestId('tavern-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  await expect(page.getByTestId('tavern-talk')).toBeVisible();
  return seen;
}

async function hearTheShopRumor(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-keeper-line')).toBeVisible();
  await page.getByTestId('shop-leave').click();
  await page.getByTestId('back-to-village').click();
}

/**
 * Taps every NEW row until none is left. A tap's read mark is written a
 * moment later, so the row counted may already be read by the time it is
 * clicked: each click is short and allowed to miss, and the count is
 * asked again after it.
 */
async function tapAllNew(page: Page, rows: ReturnType<Page['locator']>) {
  for (let i = 0; i < 40 && (await rows.count()) > 0; i++) {
    await rows.first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(100);
  }
  await expect(rows).toHaveCount(0);
}

test.describe.configure({ timeout: 180_000 });

// ---------------- P0 ----------------

test('P0: the first visit with a rumour heard — his meeting, then 「そういや……」, then the story', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  await hearTheShopRumor(page);
  // Never in the tavern this session: the door opens on his introduction.
  await page.getByTestId('tavern-button').click();
  const lines = await readTavern(page);
  const at = (t: string) => lines.findIndex((l) => l.includes(t));
  expect(lines[0]).toBe('扉を押すと、煮込みと安い酒の匂いがした。');
  expect(at('グレイヴだ。ここの主人をやってる。')).toBeGreaterThan(0);
  expect(at('そういや……お前ら、遺跡の話は聞いたか？')).toBeGreaterThan(at('グレイヴだ。ここの主人をやってる。'));
  expect(at('グラスを拭いていたグレイヴの手が、止まった。')).toBeGreaterThan(at('そういや……お前ら、遺跡の話は聞いたか？'));
  expect(lines[lines.length - 1]).toBe('古代遺跡へ行けるようになった。');
  await expect.poll(() => world<string>(page, `(w) => w.getSekiryugaStage()`)).toBe('TOLD');
  // Met now: his ordinary greeting next, no second introduction.
  await page.getByTestId('tavern-talk').click();
  await expect(page.getByTestId('tavern-line')).toHaveText('「また来たな。そこ空いてるぞ。」');
});

test('P0: met him first this session — the story alone, no bridge', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-talk').click();
  // His meeting (ending on his rumour) and the story straight after.
  const lines = await readTavern(page);
  expect(lines.join('')).not.toContain('お前ら、遺跡の話は聞いたか');
  expect(lines).toContain('グラスを拭いていたグレイヴの手が、止まった。');
});

// ---------------- P1: the tavern after セキリュウガ ----------------

test('P1: after セキリュウガ, the master — once; and nothing verdict-like', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  await world(page, `(w) => w.advanceSekiryugaArc('SETTLED')`);
  await page.getByTestId('tavern-button').click();
  const lines = await readTavern(page);
  expect(lines).toEqual(
    expect.arrayContaining([
      '「あいつ、まだあそこにいたか。」',
      '「倒した……って顔じゃねぇな。」',
      '「お前らが見たもんは、お前らが覚えてりゃいい。」',
    ]),
  );
  // His meeting came first (a new session), the bridge between.
  expect(lines.indexOf('「……で。遺跡、行ってきたんだろ。」')).toBeGreaterThan(0);
  expect(lines.join('')).not.toMatch(/ありがとう|悪い奴|退治|死/);
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('talk:GRAVE_AFTER_SEKIRYUGA')`)).toBe(true);
  // Out and in again: nothing starts by itself.
  await page.getByTestId('tavern-leave').click();
  await page.getByTestId('tavern-button').click();
  await expect(page.getByTestId('tavern-description')).toBeVisible();
});

// ---------------- P1: 《瞬断》 ----------------

test('P1: 《瞬断》 from the first fight — twice a swing, its own trail, every third turn, NEW until used', async ({ page }) => {
  await freshVillage(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('bp-skill-new')).toBeVisible();
  await page.getByTestId('bp-skill').click();
  await expect(page.getByTestId('skill-shundan')).toContainText('《瞬断》');
  await expect(page.getByTestId('skill-shundan-ready')).toHaveText('使える');
  await expect(page.getByTestId('skill-shundan-new')).toBeVisible();
  // A slash with the skill's own cross-cut.
  const crossed = page.waitForSelector('[data-testid="sword-slash"][data-skill="yes"]', { state: 'attached', timeout: 15_000 });
  await page.getByTestId('skill-shundan').click();
  await crossed;
  await readyToAct(page, 20_000);
  await expect(page.getByTestId('bp-skill-new')).toHaveCount(0);
  await page.getByTestId('bp-skill').click();
  await expect(page.getByTestId('skill-shundan-ready')).toHaveText('あと2ターン');
  await expect(page.getByTestId('skill-shundan')).toBeDisabled();
  await page.getByTestId('bp-skill-close').click();
  await command(page, 'bp-attack');
  await command(page, 'bp-attack');
  await readyToAct(page, 20_000);
  await page.getByTestId('bp-skill').click();
  await expect(page.getByTestId('skill-shundan-ready')).toHaveText('使える');
});

// ---------------- P1: AUTO ----------------

test('P1: AUTO — not before Gald nor in his fight; said once at the end of his part, before TIME SHIFT; then in every fight', async ({ page }) => {
  await freshVillage(page);
  // Strong enough that his fight is short; the fight itself is gald.spec's.
  await world(page, `(w) => w.applyBattleReward('e2e-levels', { exp: 2000, lumi: 0, items: [] })`);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  // An ordinary fight before Gald: no AUTO.
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('bp-auto')).toHaveCount(0);
  await page.getByTestId('bp-escape').click();
  await settled(page);
  // His fight: no AUTO in it either.
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await readyToAct(page);
  await expect(page.getByTestId('bp-auto')).toHaveCount(0);
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), { maxTurns: 200 });
  await expect(page.getByTestId('auto-notice')).toHaveCount(0);
  // The four answers, then what the answer left behind — and with its last line, the notice.
  await page.getByTestId('choice-SPARE').click();
  await expect(page.getByTestId('choice-result')).toBeVisible();
  for (let i = 0; i < 12 && (await page.getByTestId('choice-result-next').textContent()) !== '村へもどる'; i++) {
    await expect(page.getByTestId('auto-notice')).toHaveCount(0);
    await page.getByTestId('choice-result-next').click();
  }
  await expect(page.getByTestId('auto-notice')).toHaveText('AUTO戦闘が使用可能になりました。');
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('note:auto_battle')`)).toBe(true);
  // Then the look ahead, with no notice of its own, and the village with none either.
  await page.getByTestId('choice-result-next').click();
  await expect(page.getByTestId('future-vision')).toBeVisible();
  await expect(page.getByTestId('auto-notice')).toHaveCount(0);
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByTestId('auto-notice')).toHaveCount(0);
  // From now on: AUTO in an ordinary fight, and it fights by itself.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await page.getByTestId('bp-auto').click();
  await expect(page.getByTestId('result-exp')).toBeVisible({ timeout: 90_000 });
});

test('P1: AUTO is open without the look ahead — a world that closes the game before TIME SHIFT has it', async ({ page }) => {
  await freshVillage(page);
  // His answer recorded, the look ahead not yet seen (still owed).
  await world(page, `(w) => w.recordGaldLifeChoice('HELP')`);
  // A save from before this build that is past his answer: the notice, once, in the village.
  await expect(page.getByTestId('auto-notice')).toHaveText('AUTO戦闘が使用可能になりました。');
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('bp-auto')).toBeVisible();
});

// ---------------- P1: the boss's great move ----------------

test('P1: 《氷晶咆哮》 — its own cut-in, once, when セキリュウガ is down to half', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __cutIns: string[] };
    w.__cutIns = [];
    new MutationObserver(() => {
      const name = document.querySelector('[data-testid="cut-in"][data-theme="boss"] [data-testid="cut-in-name"]');
      if (name && w.__cutIns[w.__cutIns.length - 1] !== name.textContent) w.__cutIns.push(name.textContent ?? '');
    }).observe(document, { subtree: true, childList: true });
  });
  await freshVillage(page);
  await pastGald(page);
  await world(page, `(w) => w.advanceSekiryugaArc('TOLD')`);
  await world(page, `(w) => w.applyBattleReward('e2e-levels', { exp: 400, lumi: 0, items: [] })`);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('ruins-button').click();
  await settled(page);
  await page.getByTestId('deep-button').click();
  for (let i = 0; i < 12 && (await page.getByTestId('seal-next').isVisible().catch(() => false)); i++) {
    await page.getByTestId('seal-next').click();
  }
  await expect(page.getByTestId('boss-fight')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('boss-fight').click();
  await readyToAct(page);
  await fightUntil(page, () => page.getByTestId('seal-aftermath').isVisible().catch(() => false), { maxTurns: 60 });
  const cutIns = await page.evaluate(() => (window as unknown as { __cutIns: string[] }).__cutIns);
  expect(cutIns).toEqual(['《氷晶咆哮》']);
});

// ---------------- P2: destinations ----------------

test('P2: a destination just added glows a few times, says so once, and is NEW until touched', async ({ page }) => {
  // The glow is motion: seen as a player with motion on sees it.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await freshVillage(page);
  await pastGald(page);
  await world(page, `(w) => w.advanceSekiryugaArc('TOLD')`);
  await expect(page.getByTestId('explore-new')).toBeVisible();
  await page.getByTestId('explore-button').click();
  const door = page.getByTestId('ruins-button');
  await expect(door).toHaveAttribute('data-new', 'yes');
  await expect(door).toHaveClass(/pulse-new/);
  await expect(page.getByTestId('destination-notice')).toHaveText('新しい目的地が追加されました');
  // Only a few pulses: an animation with an iteration count, never infinite.
  const iterations = await door.evaluate((el) => getComputedStyle(el).animationIterationCount);
  expect(iterations).toBe('3');
  await door.click();
  await settled(page);
  const deep = page.getByTestId('deep-button');
  await expect(deep).toHaveAttribute('data-new', 'yes');
  await expect(deep).toHaveClass(/pulse-new/);
  await page.getByTestId('leave-ruins').click();
  // Touched: no longer new, no glow.
  await expect(door).toHaveAttribute('data-new', 'no');
  await expect(door).not.toHaveClass(/pulse-new/);
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('explore-new')).toHaveCount(0);
});

// ---------------- P2: 噂話 and NEW ----------------

test('P2: 噂話 — NEW stays through opening the menu, and goes as each rumour is read', async ({ page }) => {
  await freshVillage(page);
  await expect(page.getByTestId('rumor-new')).toBeVisible();
  await page.getByTestId('rumor-button').click();
  await expect(page.getByTestId('rumor-screen')).toBeVisible();
  // The categories, the author's examples among them, all NEW, all closed.
  for (const c of ['PERSON', 'PLACE', 'MONSTER', 'ITEM', 'EVENT', 'TRIVIA']) await expect(page.getByTestId(`rumor-group-${c}`)).toBeVisible();
  await expect(page.getByTestId('rumor-LINA_WINDOW')).toHaveAttribute('data-new', 'yes');
  await expect(page.getByTestId('rumor-LINA_WINDOW-text')).toHaveCount(0);
  // Out and back without reading: still NEW.
  await page.getByTestId('rumor-leave').click();
  await expect(page.getByTestId('rumor-new')).toBeVisible();
  await page.getByTestId('rumor-button').click();
  await expect(page.getByTestId('rumor-LINA_WINDOW')).toHaveAttribute('data-new', 'yes');
  // Read one.
  await page.getByTestId('rumor-LINA_WINDOW').click();
  await expect(page.getByTestId('rumor-LINA_WINDOW-text')).toContainText('パン屋の娘、最近よく店の外を見てるらしい。');
  await expect(page.getByTestId('rumor-LINA_WINDOW')).toHaveAttribute('data-new', 'no');
  await expect(page.getByTestId('rumor-SHOPKEEPER_FISH')).toHaveAttribute('data-new', 'yes');
  // Read them all: the village's NEW goes.
  const rows = page.locator('[data-testid^="rumor-"][data-new="yes"]');
  await tapAllNew(page, rows);
  await page.getByTestId('rumor-leave').click();
  await expect(page.getByTestId('rumor-new')).toHaveCount(0);
  // After Gald, new ones arrive — and the NEW with them.
  await pastGald(page);
  await expect(page.getByTestId('rumor-new')).toBeVisible();
});

test('P2: WORLD MEMORY — NEW on the menu and each entry until the entry itself is tapped', async ({ page }) => {
  await freshVillage(page);
  await expect(page.getByTestId('memory-new')).toHaveCount(0);
  await pastGald(page);
  await expect(page.getByTestId('memory-new')).toBeVisible();
  await page.getByTestId('memory-button').click();
  const row = page.locator('[data-testid^="memory-"][data-new="yes"]').first();
  await expect(row).toBeVisible();
  await page.getByTestId('memory-back').click();
  await expect(page.getByTestId('memory-new')).toBeVisible();
  await page.getByTestId('memory-button').click();
  const rows = page.locator('li[data-new="yes"]');
  await tapAllNew(page, rows);
  await page.getByTestId('memory-back').click();
  await expect(page.getByTestId('memory-new')).toHaveCount(0);
});

test('P2: a found sword — NEW on ステータス and 装備 until its list is opened', async ({ page }) => {
  await freshVillage(page);
  await expect(page.getByTestId('status-new')).toHaveCount(0);
  await world(page, `(w) => w.claimRareFind('ANCIENT_RUINS', 'weapon/star_crest_relic_sword')`);
  await expect(page.getByTestId('status-new')).toBeVisible();
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-equipment-new')).toBeVisible();
  await page.getByTestId('status-to-equipment').click();
  await expect(page.getByTestId('equip-slot-new')).toBeVisible();
  await page.getByTestId('equip-slot-WEAPON').click();
  await expect(page.getByTestId('equip-new-weapon/star_crest_relic_sword')).toBeVisible();
  await page.getByTestId('equip-slot-WEAPON').click();
  await expect(page.getByTestId('equip-slot-new')).toHaveCount(0);
  await page.getByTestId('equip-back').click();
  await expect(page.getByTestId('status-new')).toHaveCount(0);
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: 噂話 — the list scrolls, もどる always on screen; the village keeps 噂話 reachable`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    const rumorDoor = (await page.getByTestId('rumor-button').boundingBox())!;
    expect(rumorDoor.y + rumorDoor.height).toBeLessThanOrEqual(h + 1);
    await page.getByTestId('rumor-button').click();
    const back = (await page.getByTestId('rumor-leave').boundingBox())!;
    expect(back.y + back.height).toBeLessThanOrEqual(h + 1);
    await page.getByTestId('rumor-NAPPING_CAT').scrollIntoViewIfNeeded();
    await page.getByTestId('rumor-NAPPING_CAT').click();
    await expect(page.getByTestId('rumor-NAPPING_CAT-text')).toBeVisible();
  });
}

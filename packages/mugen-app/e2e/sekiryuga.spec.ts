import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { command, fightUntil, readyToAct } from './battle';
import { goTo, hero, openFloor, scale, settled, touch } from './roam';

/**
 * THE FIRST BOSS ROUTE —
 *
 *   ガルド四択 → TIME SHIFT → 現在 → アルデン村 → 噂 → 酒場マスター
 *   → 古代遺跡 → 封印地点 → セキリュウガ → 戦闘後
 *
 * Gald's answer is given through the development handle on the world
 * (`__mugenWorld`, DEV builds only), as futureCg.spec does: the fight to
 * the four answers is gald.spec's and regression.spec's. Everything after
 * it — the look ahead, the village, the rumours, the tavern, the map, the
 * ruins, the way in, the fight, what comes after — is walked here through
 * the real screens and a real IndexedDB.
 *
 * Set SEKI_SHOTS=<dir> to keep the brief's screenshots ①–⑦.
 */

type Route = 'KILL' | 'SPARE' | 'HELP' | 'CAPTURE';
type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  getSekiryugaStage(): string;
  isSekiryugaArcOpen(): boolean;
  getKnownEvents(): { id: string; type: string }[];
  applyBattleReward(id: string, r: { exp: number; lumi: number; items: unknown[] }): Promise<unknown>;
  getLevel(id: string): number;
};

const world = <T,>(page: Page, f: (w: DevWorld) => T | Promise<T>) =>
  page.evaluate(
    (src) => new Function('w', `return (${src})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    f.toString(),
  ) as Promise<T>;
const stage = (page: Page) => world(page, (w) => w.getSekiryugaStage());

const SHOTS = process.env.SEKI_SHOTS;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function freshVillage(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __played: string[] };
    w.__played = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.__played.push(decodeURIComponent(this.currentSrc || this.src));
      return play.call(this).catch(() => undefined);
    };
  });
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

const heard = async (page: Page, name: string) =>
  (await page.evaluate(() => (window as unknown as { __played: string[] }).__played)).some((s) => s.includes(`/${name}`));

async function music(page: Page) {
  return page.evaluate(() => {
    const a = (window as unknown as { __mugenAudio?: { bgmState(): { current: string | null } } }).__mugenAudio;
    return a?.bgmState().current ?? null;
  });
}

/** Gald's answer given, then つづきから: the owed look ahead, walked to its end, and back in the village. */
async function pastGald(page: Page, choice: Route = 'SPARE') {
  await page.evaluate(async (c) => {
    await (window as unknown as { __mugenWorld: DevWorld }).__mugenWorld.recordGaldLifeChoice(c);
  }, choice);
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

/** Reads a talk in the tavern to its end; returns every line shown. */
async function readTavern(page: Page): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 120; i++) {
    seen.push((await page.getByTestId('tavern-line').textContent()) ?? '');
    const next = page.getByTestId('tavern-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  await expect(page.getByTestId('tavern-talk')).toBeVisible();
  return seen;
}

async function readSeal(page: Page): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 40; i++) {
    if (!(await page.getByTestId('seal-next').isVisible().catch(() => false))) break;
    seen.push((await page.getByTestId('seal-line').textContent()) ?? '');
    await page.getByTestId('seal-next').click();
  }
  return seen;
}

async function hearTheShopRumor(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-keeper-line')).toContainText('地面が揺れた');
  await expect.poll(() => stage(page)).toBe('RUMOR');
  await page.getByTestId('shop-leave').click();
  await page.getByTestId('back-to-village').click();
}

async function hearTheMaster(page: Page) {
  await page.getByTestId('tavern-button').click();
  // It starts as the door opens — his first meeting in this save, then the story (uxRound.spec).
  await expect(page.getByTestId('tavern-line')).toHaveText('扉を押すと、煮込みと安い酒の匂いがした。');
  const lines = await readTavern(page);
  expect(lines).toContain('グラスを拭いていたグレイヴの手が、止まった。');
  await expect.poll(() => stage(page)).toBe('TOLD');
  await page.getByTestId('tavern-leave').click();
  return lines;
}

async function intoTheRuins(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('ruins-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-mode', 'roam');
  await settled(page);
}

async function toTheEntrance(page: Page) {
  await page.getByTestId('deep-button').click();
  await expect(page.getByTestId('seal-approach')).toBeVisible();
  const lines = await readSeal(page);
  await expect(page.getByTestId('seal-quiet')).toBeVisible();
  await expect(page.getByTestId('seal-entrance')).toBeVisible({ timeout: 10_000 });
  return lines;
}

test.describe.configure({ timeout: 180_000 });

for (const choice of ['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const) {
  test(`after ${choice}: the look ahead brings them home to the village, and the rumours begin`, async ({ page }) => {
    await freshVillage(page);
    await pastGald(page, choice);
    // ① アルデン村帰還 — the village as it is, no quest pressed on anybody.
    if (choice === 'SPARE') await shot(page, '1-village');
    await expect(page.getByTestId('explore-button')).toBeVisible();
    expect(await world(page, (w) => w.isSekiryugaArcOpen())).toBe(true);
    expect(await stage(page)).toBe('NONE');
    // Not yet on the map.
    await page.getByTestId('explore-button').click();
    await expect(page.getByTestId('ruins-button')).toHaveCount(0);
    await page.getByTestId('back-to-village').click();
    // The bakery's owner, after the usual lines: his one rumour. Nothing about Lina or Gald.
    await page.getByTestId('bakery-button').click();
    await page.getByTestId('bakery-talk').click();
    const said: string[] = [];
    for (let i = 0; i < 10; i++) {
      said.push((await page.getByTestId('bakery-line').textContent()) ?? '');
      const next = page.getByTestId('bakery-next');
      const done = (await next.textContent()) === 'もどる';
      await next.click();
      if (done) break;
    }
    expect(said[said.length - 1]).toBe(
      '「この頃、遺跡の方で妙な音を聞いたって人がいるんだ。昔も、あの辺りで何かあったらしいけど……。」',
    );
    expect(said.join('')).not.toMatch(/セキリュウガ|封印/);
    await expect.poll(() => stage(page)).toBe('RUMOR');
  });
}

test('before Gald: no rumour anywhere, the master as he always was, and no ruins on the map', async ({ page }) => {
  await freshVillage(page);
  await page.getByTestId('bakery-button').click();
  await page.getByTestId('bakery-talk').click();
  for (let i = 0; i < 10; i++) {
    expect(await page.getByTestId('bakery-line').textContent()).not.toContain('遺跡');
    const next = page.getByTestId('bakery-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  await page.getByTestId('bakery-leave').click();
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-talk').click();
  const lines = await readTavern(page);
  expect(lines.join('')).not.toContain('遺跡');
  await page.getByTestId('tavern-leave').click();
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('ruins-button')).toHaveCount(0);
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-keeper-line')).toHaveCount(0);
  expect(await stage(page)).toBe('NONE');
});

test('a rumour heard at the shop: walking into the tavern starts the master’s story, and the ruins open', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  await hearTheShopRumor(page);
  await page.getByTestId('tavern-button').click();
  // It starts by itself: his first meeting in this save, then the story.
  await expect(page.getByTestId('tavern-line')).toHaveText('扉を押すと、煮込みと安い酒の匂いがした。');
  // The room, the master and the box are where they always are.
  for (const id of ['tavern-room', 'tavern-master', 'tavern-words']) await expect(page.getByTestId(id)).toBeVisible();
  // ② 酒場マスターイベント — on into the story, to his name for it.
  for (let i = 0; i < 40 && (await page.getByTestId('tavern-line').textContent()) !== '「セキリュウガ。」'; i++) {
    await page.getByTestId('tavern-next').click();
  }
  await expect(page.getByTestId('tavern-line')).toHaveText('「セキリュウガ。」');
  await shot(page, '2-tavern');
  const rest = await readTavern(page);
  expect(rest).toContain('「完全に解けりゃ、この村だって無事じゃ済まねぇ。」');
  expect(rest).toContain('「当時の仲間は、もう全員ここにはいねぇ。」');
  expect(rest[rest.length - 1]).toBe('古代遺跡へ行けるようになった。');
  // The hero speaks under the name they were given.
  expect(rest.join('')).not.toContain('{HERO}');
  await expect.poll(() => stage(page)).toBe('TOLD');
  // Told once: the next talk is his greeting, ending on a word of caution.
  await page.getByTestId('tavern-talk').click();
  const again = await readTavern(page);
  expect(again.join('')).not.toContain('セキリュウガ');
  expect(again.join('')).not.toContain('めぼしい話は入ってきてねぇ');
  await page.getByTestId('tavern-leave').click();
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('ruins-button')).toContainText('古代遺跡');
});

test('the first rumour from the master himself: his story follows straight on, no walking out and in', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-talk').click();
  const seen: string[] = [];
  for (let i = 0; i < 20; i++) {
    const line = (await page.getByTestId('tavern-line').textContent()) ?? '';
    seen.push(line);
    await page.getByTestId('tavern-next').click();
    if (line.includes('昔話で済めばいいんだがな')) break;
  }
  expect(seen[seen.length - 1]).toBe('「……遺跡の噂か。昔話で済めばいいんだがな。」');
  await expect.poll(() => stage(page)).toBe('RUMOR');
  // Straight into his story.
  await expect(page.getByTestId('tavern-line')).toHaveText('グラスを拭いていたグレイヴの手が、止まった。');
  await readTavern(page);
  await expect.poll(() => stage(page)).toBe('TOLD');
});

test('the ruins from the map: the walk as the debug door has it — and the way deeper', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  await hearTheShopRumor(page);
  await hearTheMaster(page);
  await intoTheRuins(page);
  await expect(page.locator('.walk-title')).toHaveText('古代遺跡');
  // A floor tap walks them; further back is smaller.
  const near = await openFloor(page, 0.64);
  await touch(page, near);
  const s1 = await scale(page);
  const far = await openFloor(page, 0.5);
  await touch(page, far);
  expect(await scale(page)).toBeLessThan(s1);
  expect((await hero(page)).y).toBeLessThan(near.y);
  // A place's own thing: looked at, and its 「！」 gone.
  await goTo(page, 'STONE_ARCH');
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-caption')).toHaveText('欠けた石のアーチが、遠い山々を切り取っている。');
  await expect(page.getByTestId('walk-marker-STONE_ARCH')).toHaveCount(0);
  await expect(page.getByTestId('deep-button')).toBeVisible();
  // ③ 古代遺跡通常探索
  await shot(page, '3-ruins');
  // Visits are this world's now, and kept.
  await page.getByTestId('leave-ruins').click();
  await expect(page.getByTestId('ruins-button')).toBeVisible();
});

test('the way in, セキリュウガ, and after: not killed — and not looking at them', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  const memoryBefore = await world(page, (w) => w.getKnownEvents().map((e) => e.id));
  await hearTheShopRumor(page);
  await hearTheMaster(page);
  // Strong enough that swinging alone always wins (the fight's balance is unit-tested).
  await world(page, (w) => w.applyBattleReward('e2e-levels', { exp: 400, lumi: 0, items: [] }));
  await intoTheRuins(page);
  await expect.poll(() => music(page)).toBe('GREENWOOD_FOREST');

  // The way in: the signs, then she stops them — and the music goes.
  await page.getByTestId('deep-button').click();
  await expect(page.getByTestId('seal-line')).toHaveText('空気が少し重い。');
  const signs: string[] = [];
  for (let i = 0; i < 4; i++) {
    signs.push((await page.getByTestId('seal-line').textContent()) ?? '');
    await page.getByTestId('seal-next').click();
  }
  expect(signs).toEqual(['空気が少し重い。', '地面が、小さく震えた。', '奥から、何かが擦れる音がする。', '爪痕が石床に残っている。']);
  await expect(page.getByTestId('seal-line')).toHaveText('「……止まって。」');
  await expect.poll(() => music(page)).toBe(null);
  // ④ 封印地点直前
  await shot(page, '4-before-seal');
  const kaos = await readSeal(page);
  expect(kaos[kaos.length - 1]).toBe('「たぶん。」');
  // A few seconds of quiet, and the low rumble…
  await expect(page.getByTestId('seal-quiet')).toBeVisible();
  await expect.poll(() => heard(page, 'battle_magic_earth')).toBe(true);
  // …and it is there: its name, its drawing (as delivered, whole, turned to them), the heavy entrance.
  await expect(page.getByTestId('seal-entrance')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('seal-boss-name')).toContainText('セキリュウガ');
  const figure = page.getByTestId('seal-figure');
  await expect(figure).toHaveAttribute('data-facing', 'party');
  await expect.poll(() => figure.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  const art = await figure.evaluate((i: HTMLImageElement) => ({
    src: decodeURIComponent(i.currentSrc || i.src),
    natural: [i.naturalWidth, i.naturalHeight],
    fit: getComputedStyle(i).objectFit,
  }));
  expect(art.src).toContain('sekiryuga.png');
  expect(art.natural).toEqual([1122, 1402]);
  expect(art.fit).toBe('contain');
  await expect.poll(() => heard(page, 'battle_boss_emerge')).toBe(true);
  // ⑤ セキリュウガ登場
  await page.waitForTimeout(1500);
  await shot(page, '5-entrance');

  // The fight: BOSS on its plate, the boss music, its own name.
  await page.getByTestId('boss-fight').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible();
  await readyToAct(page);
  await expect(page.getByTestId('bp-boss-tag')).toHaveText('BOSS');
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('セキリュウガ');
  await expect(page.getByTestId('bp-enemy-read')).toContainText('170');
  await expect.poll(() => music(page)).toBe('BOSS_BATTLE');
  await expect(page.getByTestId('bx-place')).toContainText('古代遺跡');
  // ⑥ BOSS戦 — a few turns in.
  await command(page, 'bp-attack');
  await command(page, 'bp-attack');
  await readyToAct(page);
  await shot(page, '6-battle');
  await fightUntil(page, () => page.getByTestId('seal-aftermath').isVisible().catch(() => false), { maxTurns: 60 });

  // After: no result screen, no experience — what is seen when it stops.
  await expect(page.getByTestId('result-exp')).toHaveCount(0);
  await expect.poll(() => stage(page)).toBe('BEATEN');
  await expect(page.getByTestId('seal-line')).toHaveText('セキリュウガは膝をつき、動きを止めた。');
  await expect.poll(() => music(page)).toBe(null);
  const after: string[] = [];
  for (let i = 0; i < 30; i++) {
    after.push((await page.getByTestId('seal-line').textContent()) ?? '');
    if (after[after.length - 1].includes('こちらを見ていない')) {
      await expect(page.getByTestId('seal-figure')).toHaveAttribute('data-facing', 'away');
    }
    if (after[after.length - 1].includes('あっちを見てる')) {
      // ⑦ 戦闘後イベント
      await shot(page, '7-after');
    }
    const next = page.getByTestId('seal-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  expect(after).toEqual(expect.arrayContaining(['「この子。」', '「私たちを見てない。」', '「奥。」']));
  // By then it had turned away — looking deeper in, not at them.
  expect(after.join('')).not.toMatch(/死|幼体|守/);
  await expect.poll(() => stage(page)).toBe('SETTLED');
  // Back in the ruins, the way deeper closed for now.
  await expect(page.getByTestId('walk-scene')).toBeVisible();
  await expect(page.getByTestId('deep-button')).toHaveCount(0);

  // WORLD MEMORY untouched by all of it; and all of it survives a restart.
  expect(await world(page, (w) => w.getKnownEvents().map((e) => e.id))).toEqual(memoryBefore);
  await page.reload();
  await page.getByTestId('continue-button').click();
  expect(await stage(page)).toBe('SETTLED');
  await expect(page.getByTestId('ruins-button')).toBeVisible();
});

test('「無理なら逃げろ」: fleeing セキリュウガ puts them back in the ruins where they stood', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  await hearTheShopRumor(page);
  await hearTheMaster(page);
  await intoTheRuins(page);
  const near = await openFloor(page, 0.62);
  await touch(page, near);
  const stood = await hero(page);
  await toTheEntrance(page);
  await page.getByTestId('boss-fight').click();
  await readyToAct(page);
  await page.getByTestId('bp-escape').click();
  await expect(page.getByTestId('walk-scene')).toBeVisible();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-walking', 'no');
  expect(await hero(page)).toEqual(stood);
  expect(await stage(page)).toBe('TOLD');
  await expect(page.getByTestId('deep-button')).toBeVisible();
  // And 引き返す at the entrance does the same, without a fight.
  await toTheEntrance(page);
  await page.getByTestId('boss-retreat').click();
  await expect(page.getByTestId('walk-scene')).toBeVisible();
  expect(await hero(page)).toEqual(stood);
});

test('the roar is told before the blow: a red 「！」 over it until it lets go', async ({ page }) => {
  await page.goto('/?preview=battle&debug=0&enemy=sekiryuga&answer=SKILL');
  await readyToAct(page);
  await expect(page.getByTestId('bp-boss-tag')).toHaveText('BOSS');
  for (let i = 0; i < 3; i++) await command(page, 'bp-attack');
  await readyToAct(page);
  // Its third turn: the roar. The warning stays up while the player chooses.
  await expect(page.getByTestId('bp-enemy-tell')).toBeVisible();
  await expect(page.getByTestId('bp-message')).toContainText('咆哮');
  await command(page, 'bp-defend');
  await readyToAct(page);
  await expect(page.getByTestId('bp-message')).toContainText('渾身の裂牙');
  // Braced: halved — at most 7 (the top of its roll) × 0.5 × 2.2, rounded up.
  const figure = Number(((await page.getByTestId('bp-message-figure').textContent()) ?? '').replace(/\D/g, ''));
  expect(figure).toBeGreaterThan(0);
  expect(figure).toBeLessThanOrEqual(Math.ceil(7 * 0.5 * 2.2));
  await expect(page.getByTestId('bp-enemy-tell')).toHaveCount(0);
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: the way in, the entrance and the tavern’s story keep their words and buttons on screen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    await pastGald(page);
    await hearTheShopRumor(page);
    await page.getByTestId('tavern-button').click();
    const inside = async (id: string) => {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.x, id).toBeGreaterThanOrEqual(0);
      expect(b.y, id).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, id).toBeLessThanOrEqual(w + 1);
      expect(b.y + b.height, id).toBeLessThanOrEqual(h + 1);
    };
    // The longest of his lines, on screen with its button.
    for (let i = 0; i < 9; i++) await page.getByTestId('tavern-next').click();
    await inside('tavern-line');
    await inside('tavern-next');
    await readTavern(page);
    await page.getByTestId('tavern-leave').click();
    await intoTheRuins(page);
    await inside('deep-button');
    await page.getByTestId('deep-button').click();
    await inside('seal-line');
    await inside('seal-next');
    await readSeal(page);
    await expect(page.getByTestId('seal-entrance')).toBeVisible({ timeout: 10_000 });
    for (const id of ['seal-line', 'boss-fight', 'boss-retreat', 'seal-boss-name']) await inside(id);
  });
}

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: in the fight セキリュウガ is drawn nearer and larger — its shape kept, clear of the panels and the row`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    // Its shape: the drawing's own box, 1113 × 1382.
    const RATIO = 1113 / 1382;
    const boxOf = (id: string) => page.getByTestId(id).boundingBox().then((b) => b!);
    // The moss rabbit's fight, for what an unstaged creature at the same edge looks like.
    await page.goto('/?preview=battle&debug=0');
    await readyToAct(page);
    const rabbit = await boxOf('bp-enemy-art');
    await page.goto('/?preview=battle&debug=0&enemy=sekiryuga&answer=SKILL');
    await readyToAct(page);
    const boss = await boxOf('bp-enemy-art');
    expect(Math.abs(boss.width / boss.height - RATIO) / RATIO).toBeLessThan(0.02);
    // Further in from the edge than a creature's slot, and its feet further down the field.
    expect(boss.x).toBeGreaterThan(rabbit.x - 1);
    expect(boss.y + boss.height).toBeGreaterThan(rabbit.y + rabbit.height);
    // Still a size the party's: no taller than the hero is drawn.
    const hero = await boxOf('bp-hero-art');
    expect(boss.height).toBeLessThanOrEqual(hero.height * 1.1);
    // Its roar's warning, beside it and clear of the WORLD MEMORY panel.
    for (let i = 0; i < 3; i++) await command(page, 'bp-attack');
    await readyToAct(page);
    const tell = await boxOf('bp-enemy-tell');
    const panel = await page.locator('.bx-tl > *').first().boundingBox();
    const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlaps(tell, panel!)).toBe(false);
    // Its head (the drawing's top right; its top left is empty air above the tail) clear of the panel too.
    const head = { x: boss.x + boss.width * 0.7, y: boss.y, width: boss.width * 0.3, height: boss.height * 0.2 };
    expect(overlaps(head, panel!)).toBe(false);
    // Its plate stays clear of the command row and of the 「アルカナ 準備中」 line above it.
    const plate = await boxOf('bp-enemy-hp');
    const row = await boxOf('bp-commands');
    expect(plate.y + plate.height).toBeLessThanOrEqual(row.y);
    const locked = page.getByTestId('bp-arcana-locked');
    if (await locked.isVisible()) expect(overlaps(plate, (await locked.boundingBox())!)).toBe(false);
    expect(boss.x).toBeGreaterThanOrEqual(0);
  });
}

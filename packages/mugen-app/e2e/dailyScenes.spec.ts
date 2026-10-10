import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 襲撃前の日常 (2026-10-10): small things that happen in the village — not a
 * button, not a list. After セキリュウガ's part is over, at most one a day,
 * each once in a world, wherever the player happens to be: Kaos on the
 * steps as they come back in, Lina's burnt loaf and the owner's kiln in
 * place of their ordinary word, Grave's sword in place of his greeting,
 * Mirei's unsold bundles over the counter. Nothing paid, the incident's
 * point untouched, kept across a restart.
 */

type DevWorld = {
  getIncidentPoint(): number;
  getIncidentPhase(): number;
  addIncident(kind: string, id?: string): Promise<boolean>;
  isRead(id: string): boolean;
  markRead(ids: string[]): Promise<unknown>;
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
  getSekiryugaStage(): string;
  getLumi(): number;
  getInventory(): { itemId: string; quantity: number }[];
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

const KAOS_DETOUR = [
  '石段に、ケイオスが座っていた。',
  '「ねえ。」',
  '「冒険ってさ。」',
  '「たまには何もしないのも、冒険じゃない？」',
  'あなたは、しばらく黙って隣に座っていた。',
  '坂の下で、誰かが洗濯物を取り込んでいる。',
  '「……うん。こういうの。」',
];

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

/** Gald answered, the look ahead walked, the route at `last`. */
async function onTheRoute(page: Page, last: 'TOLD' | 'SETTLED') {
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
  for (const s of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED']) {
    await world(page, `(w) => w.advanceSekiryugaArc('${s}')`);
    if (s === last) break;
  }
  // What the people here would otherwise say first is already said: Lina's
  // first talk, the owner's words on what is carried, Grave after the boss
  // and the incident's word from him — so what follows is the small things alone.
  await world(
    page,
    `(w) => w.markRead(['talk:BAKERY_LINA_FIRST', 'talk:BAKERY_OWNER_NUT', 'talk:BAKERY_OWNER_MAGIC', 'talk:GRAVE_AFTER_SEKIRYUGA', 'talk:INCIDENT_GRAVE_QUIET'])`,
  );
}

async function outAndBack(page: Page) {
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function rest(page: Page) {
  const day = await page.getByTestId('world-clock').textContent();
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect(page.getByTestId('rest-button')).toBeEnabled();
}

/** Reads a box to its end with its own button; returns every line shown. */
async function readThrough(page: Page, line: string, next: string): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 20; i++) {
    if (!(await page.getByTestId(next).isVisible().catch(() => false))) break;
    seen.push(((await page.getByTestId(line).textContent()) ?? '').trim());
    await page.getByTestId(next).click();
  }
  return seen;
}

/** Lina's tab, 話す: what she says, read to its end. */
async function talkTo(page: Page, who: 'lina' | 'owner'): Promise<string[]> {
  await page.getByTestId(`bakery-who-${who}`).click();
  await page.getByTestId('bakery-talk').click();
  return readThrough(page, 'bakery-line', 'bakery-next');
}

const what = (page: Page) =>
  world<{ lumi: number; bag: string; point: number }>(
    page,
    `(w) => ({ lumi: w.getLumi(), bag: JSON.stringify(w.getInventory()), point: w.getIncidentPoint() })`,
  );

test.describe.configure({ timeout: 240_000 });

test('before セキリュウガ’s part is over, nothing: no box on coming back, Lina only her short line', async ({ page }) => {
  await freshVillage(page);
  await onTheRoute(page, 'TOLD');
  await outAndBack(page);
  await expect(page.getByTestId('daily-scene')).toHaveCount(0);
  await page.getByTestId('bakery-button').click();
  const said = await talkTo(page, 'lina');
  expect(said).toHaveLength(1);
  expect(said[0]).not.toContain('焼き損じ');
});

test('after it: Kaos on the steps as they come back — once; one a day; tomorrow Lina’s loaf; nothing paid, nothing moved', async ({ page }) => {
  await freshVillage(page);
  await onTheRoute(page, 'SETTLED');
  // Not on the square as it opens: only on coming back in from outside.
  await expect(page.getByTestId('daily-scene')).toHaveCount(0);
  const before = await what(page);
  await outAndBack(page);
  await expect(page.getByTestId('daily-scene')).toHaveAttribute('data-scene', 'KAOS_DETOUR');
  // Every door on the square still there while it is told.
  for (const id of ['tavern-button', 'bakery-button', 'shop-button', 'rest-button', 'explore-button']) {
    await expect(page.getByTestId(id)).toBeEnabled();
  }
  expect(await readThrough(page, 'daily-line', 'daily-next')).toEqual(KAOS_DETOUR);
  await expect(page.getByTestId('daily-scene')).toHaveCount(0);
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('talk:DAILY_KAOS_DETOUR')`)).toBe(true);
  expect(await what(page)).toEqual(before);

  // One a day: Lina's waits, and out and back again shows nothing.
  await page.getByTestId('bakery-button').click();
  const today = await talkTo(page, 'lina');
  expect(today).toHaveLength(1);
  await page.getByTestId('bakery-leave').click();
  await outAndBack(page);
  await expect(page.getByTestId('daily-scene')).toHaveCount(0);

  // A restart the same day changes nothing.
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock').or(page.getByTestId('back-to-village'))).toBeVisible();
  if (await page.getByTestId('back-to-village').isVisible()) await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await outAndBack(page);
  await expect(page.getByTestId('daily-scene')).toHaveCount(0);

  // Tomorrow: Lina's burnt loaf, in place of her short line — once.
  await rest(page);
  const lumi = await world<number>(page, `(w) => w.getLumi()`);
  const bag = await world<string>(page, `(w) => JSON.stringify(w.getInventory())`);
  await page.getByTestId('bakery-button').click();
  const loaf = await talkTo(page, 'lina');
  expect(loaf[0]).toBe('「あっ、ちょうどいいところに！」');
  expect(loaf).toContain('端が少し焦げている。でも、まだ温かい。');
  expect(loaf.at(-1)).toBe('「えへへ。お父さんには内緒ね。」');
  expect(loaf.some((l) => l === '「褒めてる。」')).toBe(true);
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('talk:DAILY_LINA_BURNT_BREAD')`)).toBe(true);
  expect(await world<number>(page, `(w) => w.getLumi()`)).toBe(lumi);
  expect(await world<string>(page, `(w) => JSON.stringify(w.getInventory())`)).toBe(bag);
  const again = await talkTo(page, 'lina');
  expect(again).toHaveLength(1);
});

test('as the signs go on: Mirei over the counter (her face with it; left half way, there again), the owner’s kiln, Grave’s sword', async ({
  page,
}) => {
  await freshVillage(page);
  await onTheRoute(page, 'SETTLED');
  // Kaos's on the steps seen already, so the others are next.
  await world(page, `(w) => w.markRead(['talk:DAILY_KAOS_DETOUR', 'talk:DAILY_LINA_BURNT_BREAD'])`);
  for (let i = 0; i < 6; i++) await world(page, `(w) => w.addIncident('PLACE', 'P${i}')`);
  expect(await world<number>(page, `(w) => w.getIncidentPhase()`)).toBe(2);
  const point = () => world<number>(page, `(w) => w.getIncidentPoint()`);
  const atShop = await point();

  // The shop: over the counter as the door opens. Left half way…
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-daily')).toHaveAttribute('data-scene', 'MIREI_TRAVELERS');
  await expect(page.getByTestId('shop-daily-line')).toHaveText('棚に、旅支度の包みがいくつも積まれたままになっている。');
  await page.getByTestId('shop-daily-next').click();
  await expect(page.getByTestId('shop-daily-line')).toHaveText('ミレイ「……また余っちゃった。」');
  await expect(page.getByTestId('shop-keeper-touch')).toHaveAttribute('data-expression', 'SAD');
  await page.getByTestId('shop-leave').click();
  // …it is there again, from its start.
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-daily-line')).toHaveText('棚に、旅支度の包みがいくつも積まれたままになっている。');
  const mirei: string[] = [];
  for (let i = 0; i < 10; i++) {
    if (!(await page.getByTestId('shop-daily-next').isVisible().catch(() => false))) break;
    mirei.push(((await page.getByTestId('shop-daily-line').textContent()) ?? '').trim());
    if (mirei.length === 6) await expect(page.getByTestId('shop-keeper-touch')).toHaveAttribute('data-expression', 'SHY');
    await page.getByTestId('shop-daily-next').click();
  }
  expect(mirei.at(-1)).toBe('ミレイ「や、やめてよ。商売よ、商売。」');
  expect(mirei).toContain('ケイオス「……ミレイって、いい人だね。」');
  await expect(page.getByTestId('shop-daily')).toHaveCount(0);
  await expect(page.getByTestId('shop-greeting')).toBeVisible();
  await expect(page.getByTestId('shop-keeper-touch')).toHaveAttribute('data-expression', 'NORMAL');
  await page.getByTestId('shop-leave').click();
  // Small things move nothing.
  expect(await point()).toBe(atShop);

  // The next day, the owner's kiln (in place of his hint).
  await rest(page);
  const atBakery = await point();
  await page.getByTestId('bakery-button').click();
  const kiln = await talkTo(page, 'owner');
  expect(kiln[0]).toBe('夜明け前。パン屋の裏で、主人が窯に火を入れている。');
  expect(kiln.at(-1)).toBe('火が、ゆっくりと赤くなっていく。');
  await page.getByTestId('bakery-leave').click();
  expect(await point()).toBe(atBakery);

  // The next, Grave's sword (in place of his greeting) — word for word, her remark last.
  await rest(page);
  const atTavern = await point();
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-talk').click();
  const sword = await readThrough(page, 'tavern-line', 'tavern-next');
  expect(sword[0]).toBe('壁に、両手剣が一振り掛けてある。');
  expect(sword).toContain('「重いぞ。今の俺じゃ、もう振れねぇ。」');
  expect(sword.at(-1)).toBe('「あの人ね。……訊かれるのを、待ってると思う。」');
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('talk:DAILY_GRAVE_GREATSWORD')`)).toBe(true);
  expect(await point()).toBe(atTavern);
});

for (const [w, h] of [
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: the small box on the square — its つぎへ within reach, the doors still there`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    await onTheRoute(page, 'SETTLED');
    await outAndBack(page);
    await expect(page.getByTestId('daily-scene')).toBeVisible();
    await page.getByTestId('daily-next').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('daily-next')).toBeInViewport();
    await page.getByTestId('explore-button').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('explore-button')).toBeInViewport();
  });
}

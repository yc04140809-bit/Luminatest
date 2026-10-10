import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { settled } from './roam';
import { readyToAct, fightUntil } from './battle';

/**
 * リゼル (FORGE HUM-000001) and フウミミ (FORGE MON-000002 / IND-43452DFD),
 * 作者判断 2026-10-10:
 *
 *   リゼル   two of the village's small things (the wooden sword; first
 *            aid) and one that answers what was done about Gald — from her
 *            own values, never as the right answer.
 *   フウミミ  once, at the forest's edge, after セキリュウガ's part and from
 *            the signs' first phase: the fight, the small one it shielded,
 *            the four answers (into WORLD MEMORY only then), what the answer
 *            leaves now, and the hunter's news a day later.
 */

type DevWorld = {
  getIncidentPhase(): number;
  addIncident(kind: string, id?: string): Promise<boolean>;
  isRead(id: string): boolean;
  markRead(ids: string[]): Promise<unknown>;
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
  getFuumimiAnswer(): { choice: string; day: number } | null;
  getKnownEvents(): { id: string; actors: string[] }[];
  getEnemyIndividual(id: string): { relationship: string } | null;
  getItemCount(id: string): number;
  addItem(id: string, n?: number): Promise<number>;
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

/** Gald answered `choice`, the look ahead walked, セキリュウガ's part over; Kaos's steps already seen. */
async function settledVillage(page: Page, choice = 'SPARE') {
  await freshVillage(page);
  await world(page, `(w) => w.recordGaldLifeChoice('${choice}')`);
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('future-vision')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  for (const s of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED']) await world(page, `(w) => w.advanceSekiryugaArc('${s}')`);
  await world(page, `(w) => w.markRead(['talk:DAILY_KAOS_DETOUR'])`);
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

async function readThrough(page: Page, line: string, next: string): Promise<{ who: string; said: string }[]> {
  const seen: { who: string; said: string }[] = [];
  for (let i = 0; i < 20; i++) {
    if (!(await page.getByTestId(next).isVisible().catch(() => false))) break;
    // The speaker's label, if the line has one (a line of narration has none).
    const who = await page
      .getByTestId(line)
      .evaluate((el) => el.parentElement?.querySelector('.kaos-aside-speaker, .stage-speaker')?.textContent?.trim() ?? '');
    seen.push({ who, said: ((await page.getByTestId(line).textContent()) ?? '').trim() });
    await page.getByTestId(next).click();
  }
  return seen;
}

async function intoTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await settled(page);
}

const toPhase1 = (page: Page) =>
  world(page, `async (w) => { for (const id of ['P0','P1','P2']) await w.addIncident('PLACE', id); }`);

test.describe.configure({ timeout: 240_000 });

test('リゼル: the wooden sword (her name only once she gives it), then her answer to what was done about Gald, then first aid — a day each', async ({
  page,
}) => {
  await settledVillage(page, 'CAPTURE');
  await outAndBack(page);
  await expect(page.getByTestId('daily-scene')).toHaveAttribute('data-scene', 'RIZEL_WOODEN_SWORD');
  const sword = await readThrough(page, 'daily-line', 'daily-next');
  expect(sword.map((l) => l.said)).toContain('「私だって、誰かを守れるくらいにはなりたいの。」');
  expect(sword.findIndex((l) => l.who === 'リゼル')).toBe(sword.findIndex((l) => l.said.includes('リゼル。')));
  expect(sword.at(-1)?.said).toBe('「ううん。なんでもない♪」');

  // The next day: her answer — the one for handing him to the guards, and no other.
  await rest(page);
  await outAndBack(page);
  await expect(page.getByTestId('daily-scene')).toHaveAttribute('data-scene', 'RIZEL_ON_GALD_CAPTURE');
  const gald = (await readThrough(page, 'daily-line', 'daily-next')).map((l) => l.said);
  expect(gald).toContain('「罪は、償うべきだと思う。」');
  expect(gald.join('')).not.toMatch(/正しい|正解|間違/);

  // First aid waits for the signs; then it comes.
  await rest(page);
  await outAndBack(page);
  await expect(page.getByTestId('daily-scene')).toHaveCount(0);
  await toPhase1(page);
  await rest(page);
  await outAndBack(page);
  await expect(page.getByTestId('daily-scene')).toHaveAttribute('data-scene', 'RIZEL_FIRST_AID');
  const aid = (await readThrough(page, 'daily-line', 'daily-next')).map((l) => l.said);
  expect(aid).toContain('「だけ、は余計。」');
});

test('フウミミ: not before the signs; then once at the forest’s edge — flee and it is still there; beaten, the small one, the four answers', async ({
  page,
}) => {
  await settledVillage(page);
  // Phase 0: not there.
  await intoTheForest(page);
  await expect(page.getByTestId('fuumimi-button')).toHaveCount(0);
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await toPhase1(page);
  expect(await world<number>(page, `(w) => w.getIncidentPhase()`)).toBe(1);

  await intoTheForest(page);
  await page.getByTestId('fuumimi-button').click();
  await expect(page.getByTestId('creature-encounter')).toBeVisible();
  const before = (await readThrough(page, 'creature-encounter-line', 'creature-encounter-next')).map((l) => l.said);
  expect(before.at(-1)).toBe('「……気が立ってる。来るよ！」');
  await readyToAct(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('フウミミ');
  await expect(page.getByTestId('bp-escape')).toBeVisible();
  await expect(page.getByTestId('bp-boss-tag')).toHaveCount(0);

  // 逃げる: the forest as it was, and it is still there.
  await page.getByTestId('bp-escape').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await settled(page);
  await expect(page.getByTestId('fuumimi-button')).toBeVisible();
  const events = (await world<{ id: string }[]>(page, `(w) => w.getKnownEvents()`)).length;

  // Beaten.
  await world(page, `(w) => w.addItem('FOREST_HERB', 1)`);
  const herbs = await world<number>(page, `(w) => w.getItemCount('FOREST_HERB')`);
  await page.getByTestId('fuumimi-button').click();
  await readThrough(page, 'creature-encounter-line', 'creature-encounter-next');
  await readyToAct(page);
  await fightUntil(page, () => page.getByTestId('creature-scene').isVisible().catch(() => false), { maxTurns: 80 });
  const why = (await readThrough(page, 'creature-scene-line', 'creature-scene-next')).map((l) => l.said);
  expect(why).toContain('翅の陰で、小さな同じ生き物が震えていた。');
  // Met — but nothing in WORLD MEMORY until it is answered.
  expect(await world<unknown>(page, `(w) => w.getFuumimiAnswer()`)).toBeNull();
  expect((await world<{ id: string }[]>(page, `(w) => w.getKnownEvents()`)).length).toBe(events);
  await expect(page.getByTestId('creature-life-choice-screen')).toBeVisible();
  await expect(page.getByTestId('creature-choice-prompt')).toHaveText('この生き物の人生を、どうしますか？');
  for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) await expect(page.getByTestId(`creature-choice-${id}`)).toBeVisible();

  await page.getByTestId('creature-choice-HELP').click();
  await expect(page.getByTestId('creature-choice-after')).toContainText('逃げようとは、しなかった。');
  const answer = await world<{ choice: string }>(page, `(w) => w.getFuumimiAnswer()`);
  expect(answer.choice).toBe('HELP');
  const memory = await world<{ id: string; actors: string[] }[]>(page, `(w) => w.getKnownEvents()`);
  expect(memory.length).toBe(events + 1);
  expect(memory.at(-1)?.actors).toEqual(['PLAYER', 'IND-43452DFD']);
  expect(await world<string>(page, `(w) => w.getEnemyIndividual('IND-43452DFD').relationship`)).toBe('helped');
  // A herb set down for it.
  expect(await world<number>(page, `(w) => w.getItemCount('FOREST_HERB')`)).toBe(herbs - 1);

  await page.getByTestId('creature-choice-continue').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await settled(page);
  await expect(page.getByTestId('fuumimi-button')).toHaveCount(0);

  // The same day, nothing; the next, the hunter's news for this answer.
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await rest(page);
  await outAndBack(page);
  const scene = await page.getByTestId('daily-scene').getAttribute('data-scene');
  // Rizel's sword may come first (one a day); the hunter's news then the day after.
  if (scene !== 'FUUMIMI_AFTER_HELP') {
    await readThrough(page, 'daily-line', 'daily-next');
    await rest(page);
    await outAndBack(page);
  }
  await expect(page.getByTestId('daily-scene')).toHaveAttribute('data-scene', 'FUUMIMI_AFTER_HELP');
  const news = (await readThrough(page, 'daily-line', 'daily-next')).map((l) => l.said);
  expect(news).toContain('「人を見ても逃げねぇんだと。妙な話だ。」');

  // After a restart: answered, and not offered again.
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock').or(page.getByTestId('back-to-village'))).toBeVisible();
  if (await page.getByTestId('back-to-village').isVisible()) await page.getByTestId('back-to-village').click();
  await intoTheForest(page);
  await expect(page.getByTestId('fuumimi-button')).toHaveCount(0);
});

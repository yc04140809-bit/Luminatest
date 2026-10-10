import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { settled } from './roam';
import { readyToAct } from './battle';

/**
 * ALDEN INCIDENT 予兆フェーズ (2026-10-10):
 *
 *   平常 → 小さな違和感 → 明確な異変 → 襲撃直前（そこで止まる）
 *
 * A hidden point moved by doing things (a walk out, a fight won, a first
 * place, a rest after a day out — each only so often), and its phase, shown
 * only through what is already there: the rumours (and their NEW), a word
 * from Kaos at the foot of the region map, Grave from phase 2. Nothing
 * starts at phase 3. All kept across a restart.
 *
 * 作者判断 2026-10-10: nothing counts until セキリュウガ's part is over
 * (SETTLED), and reading a rumour is never a step — the player acts, the
 * world moves, and the rumours change to show it.
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
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;
const point = (page: Page) => world<number>(page, `(w) => w.getIncidentPoint()`);
const phase = (page: Page) => world<number>(page, `(w) => w.getIncidentPhase()`);

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

/**
 * セキリュウガ'S PART OVER, from wherever the village is: Gald answered, the
 * one look ahead seen, the route moved to SETTLED (walked for real in
 * sekiryuga.spec). Grave's word after it is marked heard, and every rumour
 * there is now marked read — so what turns up NEW after this is the
 * incident's alone.
 */
async function toSettled(page: Page) {
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
  for (const s of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED']) await world(page, `(w) => w.advanceSekiryugaArc('${s}')`);
  expect(await world<string>(page, `(w) => w.getSekiryugaStage()`)).toBe('SETTLED');
  await page.getByTestId('rumor-button').click();
  const ids = await page.locator('[data-testid^="rumor-"]').evaluateAll((els) =>
    els
      .map((e) => e.getAttribute('data-testid')!)
      .filter((id) => !/^rumor-(screen|list|leave|group-.*)$/.test(id) && !/-(text|new)$/.test(id))
      .map((id) => `rumor:${id.slice('rumor-'.length)}`),
  );
  await page.getByTestId('rumor-leave').click();
  await world(page, `(w) => w.markRead(${JSON.stringify([...ids, 'talk:GRAVE_AFTER_SEKIRYUGA'])})`);
  await expect(page.getByTestId('rumor-new')).toHaveCount(0);
}

/** A village where the incident counts: fresh, then セキリュウガ's part over. */
async function settledVillage(page: Page) {
  await freshVillage(page);
  await toSettled(page);
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

async function rest(page: Page) {
  const day = await page.getByTestId('world-clock').textContent();
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect(page.getByTestId('rest-button')).toBeEnabled();
}

/** Out to the forest and back: first time a place, then a walk out finished. */
async function walkTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await page.getByTestId('leave-forest').click();
  await expect(page.getByTestId('back-to-village')).toBeVisible();
}

const incidentRumors = async (page: Page) => {
  await page.getByTestId('rumor-button').click();
  const ids = await page.locator('[data-testid^="rumor-INC_"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-testid')!).filter((id) => !/-(text|new)$/.test(id)),
  );
  await page.getByTestId('rumor-leave').click();
  return ids;
};

test.describe.configure({ timeout: 240_000 });

test('before セキリュウガ’s part is over nothing counts; after it, the point moves with what is done — and not by doing the same again', async ({
  page,
}) => {
  await freshVillage(page);
  expect(await point(page)).toBe(0);
  expect(await incidentRumors(page)).toEqual([]);
  // Before: the forest walked, a rest after it — nothing moves (the signs belong after the peak).
  await walkTheForest(page);
  await page.getByTestId('back-to-village').click();
  await rest(page);
  expect(await point(page)).toBe(0);
  expect(await phase(page)).toBe(0);

  await toSettled(page);
  expect(await point(page)).toBe(0);
  // Resting in the village with nothing done moves nothing.
  await rest(page);
  await rest(page);
  expect(await point(page)).toBe(0);

  // The forest, the first time since (+1 as a place); leaving it, a walk out finished (+1).
  await walkTheForest(page);
  await expect.poll(() => point(page)).toBe(2);
  // Again the same day: neither counts again.
  await page.getByTestId('forest-button').click();
  await settled(page);
  await page.getByTestId('leave-forest').click();
  await expect(page.getByTestId('back-to-village')).toBeVisible();
  expect(await point(page)).toBe(2);
  // No word from Kaos yet: still peace.
  await expect(page.getByTestId('kaos-aside')).toHaveCount(0);
  await page.getByTestId('back-to-village').click();

  // A rest after a day out (+1): phase 1.
  await rest(page);
  await expect.poll(() => point(page)).toBe(3);
  expect(await phase(page)).toBe(1);
  // Only once: resting again moves nothing.
  await rest(page);
  expect(await point(page)).toBe(3);
});

test('phase 1: small signs in the rumours (NEW), and Kaos’s 「……ん？」 at the foot of the map — once', async ({ page }) => {
  await settledVillage(page);
  await world(page, `async (w) => { await w.addIncident('WIN'); await w.addIncident('EXPLORE'); await w.addIncident('PLACE', 'X'); }`);
  expect(await phase(page)).toBe(1);
  await expect(page.getByTestId('rumor-new')).toBeVisible();
  const ids = await incidentRumors(page);
  expect(ids).toEqual(expect.arrayContaining(['rumor-INC_BEASTS_RESTLESS', 'rumor-INC_NO_TRAVELERS']));
  expect(ids).not.toContain('rumor-INC_FLEEING_MERCHANT');
  // Reading them is not a step: every one read, and the point where it was.
  const before = await point(page);
  await page.getByTestId('rumor-button').click();
  for (const id of ids) {
    await page.getByTestId(id).scrollIntoViewIfNeeded();
    await page.getByTestId(id).click();
    await expect(page.getByTestId(`${id}-text`)).toBeVisible();
  }
  await page.getByTestId('rumor-leave').click();
  await expect(page.getByTestId('rumor-new')).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(await point(page)).toBe(before);
  expect(await phase(page)).toBe(1);
  expect(await incidentRumors(page)).not.toContain('rumor-INC_FLEEING_MERCHANT');

  // Kaos, as they set out — the ways out still where they were.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  const aside = page.getByTestId('kaos-aside');
  await expect(aside).toHaveAttribute('data-phase', '1');
  const said: string[] = [];
  for (let i = 0; i < 6; i++) {
    said.push((await page.getByTestId('kaos-aside-line').textContent()) ?? '');
    const done = (await page.getByTestId('kaos-aside-next').textContent()) === 'とじる';
    await page.getByTestId('kaos-aside-next').click();
    if (done) break;
  }
  expect(said).toEqual(['「……ん？」', '「どうした？」', '「ううん。なんでもない♪」']);
  await expect(aside).toHaveCount(0);
  await page.getByTestId('back-to-village').click();
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('kaos-aside')).toHaveCount(0);
  // And after a restart, not again.
  await restart(page);
  expect(await world<boolean>(page, `(w) => w.isRead('talk:INCIDENT_KAOS_1')`)).toBe(true);
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('kaos-aside')).toHaveCount(0);
});

test('phase 2: plain trouble — more rumours, Kaos’s 「……この感じ。」, and Grave once in place of his greeting', async ({ page }) => {
  await settledVillage(page);
  // Grave met first (his meeting is never replaced).
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-talk').click();
  for (let i = 0; i < 30; i++) {
    const next = page.getByTestId('tavern-next');
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
  }
  await page.getByTestId('tavern-leave').click();
  for (const id of ['A', 'B', 'C', 'D', 'E', 'F']) await world(page, `(w) => w.addIncident('PLACE', '${id}')`);
  expect(await phase(page)).toBe(2);
  const ids = await incidentRumors(page);
  expect(ids).toEqual(expect.arrayContaining(['rumor-INC_FLEEING_MERCHANT', 'rumor-INC_METAL_NIGHT', 'rumor-INC_FIGURES']));

  // Kaos: phase 1's word first (one at a time), then phase 2's.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('kaos-aside')).toHaveAttribute('data-phase', '1');
  while ((await page.getByTestId('kaos-aside').count()) > 0) await page.getByTestId('kaos-aside-next').click();
  // One word per setting out: phase 2's does not follow on in the same visit.
  await page.waitForTimeout(400);
  await expect(page.getByTestId('kaos-aside')).toHaveCount(0);
  await page.getByTestId('back-to-village').click();
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('kaos-aside')).toHaveAttribute('data-phase', '2');
  await expect(page.getByTestId('kaos-aside-line')).toHaveText('「……この感じ。」');
  await page.getByTestId('back-to-village').click();

  // Grave: the forest is too quiet — once.
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-talk').click();
  const grave: string[] = [];
  for (let i = 0; i < 6; i++) {
    grave.push((await page.getByTestId('tavern-line').textContent()) ?? '');
    const next = page.getByTestId('tavern-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  expect(grave).toEqual([
    '「最近、森が静かすぎる。」',
    '「静かな方がいいんじゃないのか？」',
    '「森ってのはな。うるせぇくらいが普通なんだよ。」',
  ]);
  await page.getByTestId('tavern-talk').click();
  await expect(page.getByTestId('tavern-line')).not.toHaveText('「最近、森が静かすぎる。」');
});

test('phase 3: “something is close” — and nothing starts; the village, the shops and the way out as they were, after a restart too', async ({
  page,
}) => {
  await settledVillage(page);
  for (let i = 0; i < 10; i++) await world(page, `(w) => w.addIncident('PLACE', 'P${i}')`);
  expect(await phase(page)).toBe(3);
  const ids = await incidentRumors(page);
  expect(ids).toEqual(expect.arrayContaining(['rumor-INC_TAKE_CARE', 'rumor-INC_BAD_FEELING', 'rumor-INC_RUNNING_FROM']));
  // Read one: no rumour says the village will be attacked.
  await page.getByTestId('rumor-button').click();
  await page.getByTestId('rumor-INC_RUNNING_FROM').scrollIntoViewIfNeeded();
  await page.getByTestId('rumor-INC_RUNNING_FROM').click();
  await expect(page.getByTestId('rumor-INC_RUNNING_FROM-text')).toHaveText('「森の奴ら、何かから逃げてるんじゃないか？」');
  await expect(page.getByTestId('rumor-screen')).not.toContainText(/襲われる|襲撃/);
  await page.getByTestId('rumor-leave').click();

  // Nothing starts: the square, its doors, the map, a fight — as ever.
  for (const id of ['tavern-button', 'bakery-button', 'shop-button', 'rest-button', 'explore-button']) {
    await expect(page.getByTestId(id)).toBeEnabled();
  }
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await page.goto('/');
  await restart(page);
  expect(await phase(page)).toBe(3);
  expect(await point(page)).toBeGreaterThanOrEqual(10);
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

for (const [w, h] of [
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: Kaos’s word on the map — the ways out on screen, her box and つぎへ within reach`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await settledVillage(page);
    for (let i = 0; i < 10; i++) await world(page, `(w) => w.addIncident('PLACE', 'P${i}')`);
    await world(page, `(w) => w.markRead(['talk:INCIDENT_KAOS_1', 'talk:INCIDENT_KAOS_2'])`);
    await page.getByTestId('explore-button').click();
    for (const id of ['forest-button', 'back-to-village']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y + b.height, id).toBeLessThanOrEqual(h + 1);
    }
    const aside = page.getByTestId('kaos-aside');
    await expect(aside).toHaveAttribute('data-phase', '3');
    await page.getByTestId('kaos-aside-next').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('kaos-aside-next')).toBeInViewport();
    const lines: string[] = [];
    for (let i = 0; i < 8 && (await aside.count()) > 0; i++) {
      lines.push((await page.getByTestId('kaos-aside-line').textContent()) ?? '');
      await page.getByTestId('kaos-aside-next').click();
    }
    expect(lines).toEqual(['「しばらく、村から遠くへ行かない方がいいかも。」', '「理由は？」', '「勘。」', '「雑だな。」', '「神様の勘を舐めないでよ。」']);
  });
}

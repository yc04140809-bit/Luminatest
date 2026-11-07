import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 時間の使い方 (段階4, 作者 2026-11-03/11-04, content/story/timeGuide.ts):
 *   - the first time back in from outside, Kaos says it — five lines, in her voice (v_ch1_chaos171〜175) — once
 *   - written, to be looked at again from 噂話 and 設定: じっくり派・がっつり派 and the ※
 *   - after セキリュウガ, while the signs have not risen, the objective says 「出かけて、夜は休もう」 under it
 */
// The suite passes her five lines (playwright.config, mugen_dev_time_guide=off): here they are what is tested.
test.use({
  storageState: {
    cookies: [
      { name: 'mugen_dev_theme_intro', value: 'off', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
      { name: 'mugen_dev_time_pass', value: 'off', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
    ],
    origins: [],
  },
});

type DevWorld = {
  isRead(id: string): boolean;
  markRead(ids: string[]): Promise<unknown>;
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
  getIncidentPhase(): number;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

async function listen(page: Page) {
  await page.addInitScript(() => {
    const heard: string[] = [];
    (window as unknown as { __heard: string[] }).__heard = heard;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const file = (this.src.split('/').pop() ?? '').replace(/-[A-Za-z0-9_]{6,}(?=\.mp3)/, '');
      if (this instanceof HTMLAudioElement && /^v_/.test(file)) heard.push(file);
      return play.call(this);
    };
  });
  return () => page.evaluate(() => (window as unknown as { __heard: string[] }).__heard.slice());
}

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

async function outAndBack(page: Page) {
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

const LINES = [
  'ねえねえ、時間の使い方、大事なこと言うね',
  'この村はね、『休息』すると日が進んで、みんなの人生も、物語も動くの',
  'じっくり派は休息ひかえめ。村をたっぷり味わう進み方',
  'がっつり派は、噂のNEWを追って、休息でどんどん進める',
  'どっちが正解でもないよ。あなたの時間は、あなたが決めて',
];

test('the first time back in: her five lines, in her voice, in order — then never again in that world', async ({ page }) => {
  test.setTimeout(120_000);
  const heard = await listen(page);
  await freshVillage(page);
  // Not on the way in: only on coming back from outside.
  await expect(page.getByTestId('kaos-nudge')).toHaveCount(0);
  const before = (await heard()).length;
  await outAndBack(page);
  const guide = page.getByTestId('kaos-nudge');
  await expect(guide).toHaveAttribute('data-nudge', 'TIME_GUIDE');
  const seen: string[] = [];
  for (let i = 0; i < LINES.length; i++) {
    await page.waitForTimeout(250);
    seen.push(((await page.getByTestId('kaos-nudge-line').textContent()) ?? '').replace(/^「|」$/g, ''));
    await page.getByTestId('kaos-nudge-next').click();
  }
  expect(seen).toEqual(LINES);
  await expect(guide).toHaveCount(0);
  await expect
    .poll(async () => (await heard()).slice(before).filter((f) => /^v_ch1_chaos17[1-5]/.test(f)), { timeout: 10_000 })
    .toEqual(['v_ch1_chaos171.mp3', 'v_ch1_chaos172.mp3', 'v_ch1_chaos173.mp3', 'v_ch1_chaos174.mp3', 'v_ch1_chaos175.mp3']);
  // Kept as said (written a moment after it is closed).
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('guide:time')`)).toBe(true);

  // Out and back again, and after a restart: not again.
  await outAndBack(page);
  await expect(page.locator('[data-nudge="TIME_GUIDE"]')).toHaveCount(0);
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await outAndBack(page);
  await expect(page.locator('[data-nudge="TIME_GUIDE"]')).toHaveCount(0);
});

async function expectTheCard(page: Page, size: { width: number; height: number }) {
  const card = page.getByTestId('time-guide');
  await expect(card).toBeVisible();
  await expect(card).toContainText('時間の使い方');
  await expect(page.getByTestId('time-guide-way')).toHaveText([
    'じっくり派休息を控えて、村のみんなと話したり探索したり。ゆっくり味わう進み方',
    'がっつり派噂話のNEWを追って、休息で日を進める。物語がぐんぐん動く進み方',
  ]);
  await expect(page.getByTestId('time-guide-note')).toHaveText('※出かけて過ごした日の夜に休息すると、日が進み、物語と人々の人生が動きます');
  // Whole on screen, とじる within reach.
  const plate = (await page.locator('.time-guide-card').boundingBox())!;
  expect(plate.y).toBeGreaterThanOrEqual(0);
  expect(plate.y + plate.height).toBeLessThanOrEqual(size.height);
  const close = page.getByTestId('time-guide-close');
  await close.scrollIntoViewIfNeeded();
  const b = (await close.boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(size.height);
  await close.click();
  await expect(card).toHaveCount(0);
}

for (const size of [
  { width: 844, height: 390 },
  { width: 640, height: 300 },
]) {
  test(`${size.width}×${size.height}: written, to be looked at again — from 噂話 and from 設定`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(size);
    await freshVillage(page);
    await page.getByTestId('rumor-button').click();
    await page.getByTestId('rumor-time-guide').click();
    await expectTheCard(page, size);
    await expect(page.getByTestId('rumor-screen')).toBeVisible();
    await page.getByTestId('rumor-leave').click();
    await page.getByTestId('settings-button').click();
    await page.getByTestId('settings-time-guide').scrollIntoViewIfNeeded();
    await page.getByTestId('settings-time-guide').click();
    await expectTheCard(page, size);
    // Back where it was opened from.
    await expect(page.getByTestId('settings')).toBeVisible();
  });
}

test('after セキリュウガ, before the signs rise: 「出かけて、夜は休もう」 under the objective — and only then', async ({ page }) => {
  test.setTimeout(120_000);
  await freshVillage(page);
  await expect(page.getByTestId('next-objective-hint')).toHaveCount(0);
  await world(page, `(w) => w.recordGaldLifeChoice('SPARE')`);
  await page.reload();
  await page.getByTestId('continue-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('next-objective-hint')).toHaveCount(0);
  for (const s of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED']) await world(page, `(w) => w.advanceSekiryugaArc('${s}')`);
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('next-objective-text')).toHaveText('アルデン村で日々を過ごそう');
  await expect(page.getByTestId('next-objective-hint')).toHaveText('出かけて、夜は休もう');
  // On a phone held sideways (作者 D8 — the village's top boxes are tight): the objective box still clear of the name's.
  for (const size of [
    { width: 640, height: 300 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(300);
    const objective = (await page.getByTestId('next-objective').boundingBox())!;
    const gear = (await page.getByTestId('settings-button').boundingBox())!;
    const hint = (await page.getByTestId('next-objective-hint').boundingBox())!;
    expect(gear.x + gear.width, `${size.width}`).toBeLessThanOrEqual(objective.x);
    expect(hint.y + hint.height, `${size.width}`).toBeLessThanOrEqual(objective.y + objective.height + 1);
    expect(objective.x + objective.width, `${size.width}`).toBeLessThanOrEqual(size.width);
  }
});

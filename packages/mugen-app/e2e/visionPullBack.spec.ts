import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { fightUntil, readyToAct, throughTheAwakening } from './battle';

/**
 * 引く演出 (作者 2026-11-03 採用 — TIME SHIFT の直後、第1章の中盤の山場, ui/visionPullBack.tsx): his three years'
 * picture held, the music falling away; drawn back into his page of the life record; other pages coming round it —
 * a name, 「？？？」, 「まだ知らない出来事」; 「見ていない間も、人生は続いている。」; then she brings them back.
 * Measures time: one of the TIMED_SPECS (playwright.config). (The helpers below are gald.spec's own.)
 *
 * THE FIRST COMPLETE TURN OF THE GAME'S OWN LOOP.
 *
 *   遭遇 → 戦闘 → LIFE_CHOICE → WORLD MEMORY → 後続状態変化
 *
 * One route (SPARE) is walked here end to end, through a real browser
 * and a real IndexedDB, including the restart. The other three are
 * covered by core unit tests, which is the right split: what differs
 * between the four is what the world records, and that is the core's
 * business, while what this proves is that the App reaches the
 * question at all and does not lose the answer.
 */

async function freshApp(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
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
}

async function intoTheVillage(page: Page) {
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  // Naming sits between the opening and the village now. Taking the
  // default keeps every test in this file about what it was about.
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function toTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('encounter-button')).toBeVisible();
}

/**
 * Through the one look ahead: she asks, she shows, she brings them
 * back. These tests are about the four answers and the awakening, so
 * they walk it and carry on.
 */
async function walkTheVision(page: Page) {
  await expect(page.getByTestId('future-vision')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
}

/** Through his two lines and into the fight. */
async function meetGald(page: Page) {
  await page.getByTestId('gald-button').click();
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
  // A stranger on the path: 「盗賊」, his name not yet given (作者 2026-11-05).
  await expect(page.getByTestId('gald-encounter')).toContainText('盗賊');
  await expect(page.getByTestId('gald-encounter')).not.toContainText('ガルド');
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await expect(page.getByTestId('battle-screen')).toBeVisible();
}

/**
 * Beat him.
 *
 * He has 220 health and hits for 3–5, and the awakening arrives
 * partway through — a scene that has to be tapped past before the
 * commands come back. Swinging until the four answers are on screen is
 * the whole of the strategy; there is no need for a good one.
 */
async function beatGald(page: Page) {
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), {
    maxTurns: 200,
  });
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
}


async function toTheLookAhead(page: Page, choice: 'KILL' | 'HELP') {
  await freshApp(page);
  await intoTheVillage(page);
  await toTheForest(page);
  await meetGald(page);
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), { maxTurns: 200 });
  await page.getByTestId(`choice-${choice}`).click();
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId('future-vision').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }
  await page.getByTestId('future-vision-next').click();
  await expect(page.getByTestId('future-vision-cg')).toBeVisible();
  // Every turn of the music's level, from here on.
  await page.evaluate(() => {
    const w = window as unknown as { __mugenAudio: { duckBgmTo(share: number, ms?: number): void }; __ducks: number[] };
    w.__ducks = [];
    const real = w.__mugenAudio.duckBgmTo.bind(w.__mugenAudio);
    w.__mugenAudio.duckBgmTo = (share: number, ms?: number) => {
      w.__ducks.push(share);
      real(share, ms);
    };
  });
}
const ducks = (page: Page) => page.evaluate(() => (window as unknown as { __ducks: number[] }).__ducks);

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('held, drawn back into his page, the others come, the line — in that order; the music down, then back', async ({ page }) => {
    test.setTimeout(180_000);
    await toTheLookAhead(page, 'KILL');
    await page.getByTestId('future-vision-next').click();
    const pull = page.getByTestId('vision-pull');
    await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'PULL');
    // Each stage seen, in order (read as it goes).
    const seen: string[] = [];
    for (let i = 0; i < 120 && seen.at(-1) !== 'DONE'; i++) {
      const s = (await pull.getAttribute('data-stage')) ?? '';
      if (seen.at(-1) !== s) seen.push(s);
      await page.waitForTimeout(80);
    }
    expect(seen).toEqual(['HOLD', 'SHRINK', 'PAGES', 'WORDS', 'DONE']);
    // The music fell away as it began.
    expect((await ducks(page))[0]).toBeLessThan(0.5);
    // His page, as the record names him; the others: a name and nothing known yet.
    await expect(page.getByTestId('vision-pull-his')).toContainText('盗賊');
    for (const [id, name] of [['lina', 'リナ'], ['rizel', 'リゼル'], ['elna', 'エルナ'], ['baldo', 'バルド']]) {
      const p = page.getByTestId(`vision-pull-page-${id}`);
      await expect(p).toBeVisible();
      await expect(p).toContainText(name);
      await expect(p).toContainText('？？？');
      await expect(p).toContainText('まだ知らない出来事');
    }
    await expect(page.getByTestId('vision-pull-line')).toHaveText('見ていない間も、人生は続いている。');
    // On: her bringing them back, the music with it.
    await page.getByTestId('future-vision-next').click();
    await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'BACK');
    expect((await ducks(page)).at(-1)).toBe(1);
  });

  test('a tap before the end shows the end at once', async ({ page }) => {
    test.setTimeout(180_000);
    await toTheLookAhead(page, 'HELP');
    await page.getByTestId('future-vision-next').click();
    const pull = page.getByTestId('vision-pull');
    await expect(pull).toHaveAttribute('data-stage', 'HOLD');
    await pull.click({ position: { x: 10, y: 10 } });
    await expect(pull).toHaveAttribute('data-stage', 'DONE');
    await expect(page.getByTestId('vision-pull-line')).toHaveText('見ていない間も、人生は続いている。');
    await expect(page.getByTestId('future-vision-next')).toBeVisible();
  });
});

test('less motion asked for: the end from the start — and on a phone held sideways, nothing over anything', async ({ page }) => {
  test.setTimeout(180_000);
  await toTheLookAhead(page, 'KILL');
  await page.getByTestId('future-vision-next').click();
  await expect(page.getByTestId('vision-pull')).toHaveAttribute('data-stage', 'DONE');
  for (const [w, h] of [[844, 390], [640, 300]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(300);
    const ids = ['vision-pull-his', 'vision-pull-page-lina', 'vision-pull-page-rizel', 'vision-pull-page-elna', 'vision-pull-page-baldo', 'vision-pull-line', 'future-vision-next'];
    const boxes = await Promise.all(ids.map(async (id) => [id, (await page.getByTestId(id).boundingBox())!] as const));
    for (const [id, b] of boxes) {
      expect(b.x, `${w} ${id}`).toBeGreaterThanOrEqual(0);
      expect(b.y, `${w} ${id}`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `${w} ${id}`).toBeLessThanOrEqual(w);
      expect(b.y + b.height, `${w} ${id}`).toBeLessThanOrEqual(h);
    }
    // His page and its name, the four pages, the line and つづける: none over another (the line is as wide as the
    // screen, so it is checked only against what is above it).
    const page_ = (id: string) => boxes.find(([i]) => i === id)![1];
    const name = (await page.getByTestId('vision-pull-his').locator('.vp-page-name').boundingBox())!;
    const solid = [...ids.slice(0, 5).map(page_), name];
    for (let i = 0; i < solid.length; i++)
      for (let j = i + 1; j < solid.length; j++) {
        if (i === 0 && j === solid.length - 1) continue; // his name hangs under his own page
        const [a, b] = [solid[i], solid[j]];
        const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(apart, `${w}: ${i} and ${j}`).toBe(true);
      }
    const line = await page.getByTestId('vision-pull-line').evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const b = r.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    });
    for (const b of solid) {
      const apart = line.x + line.width <= b.x || b.x + b.width <= line.x || line.y + line.height <= b.y || b.y + b.height <= line.y;
      expect(apart, `${w}: the line clear`).toBe(true);
    }
    const next = page_('future-vision-next');
    expect(next.y).toBeGreaterThanOrEqual(line.y + line.height - 1);
  }
});

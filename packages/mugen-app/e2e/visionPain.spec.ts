import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { fightUntil, readyToAct, throughTheAwakening } from './battle';

/**
 * 痛みの一文 (作者 2026-11-03 採用, 2026-11-06 置き場所): under each answer's picture of his three years, one line —
 * read before 「――3年後。」 and the list, never under the words beside it; and とどめ's list opens with where the
 * medicine went. (The helpers below are gald.spec's own, for the same walk to the four answers.)
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


const PAIN = {
  KILL: '村に、平穏が戻った。薬は少女に届けられた。だが兄だけが、もういない。',
  SPARE: '男は、街道で人の傷を診るようになった。その後を、知る者はいない。',
  HELP: '男は、パン屋で働くようになった。だが、村の誰もが彼を受け入れたわけではない。',
  CAPTURE: '男は、作業場で働いている。妹と過ごせなかった年月は、戻らない。',
} as const;

for (const choice of ['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const) {
  test(`${choice}: the picture of his three years, its one line under it — on a phone held sideways too`, async ({ page }) => {
    test.setTimeout(180_000);
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
    await expect(page.getByTestId('future-vision-pain')).toHaveText(PAIN[choice]);
    // Read first: before the words beside it, in the page's order.
    const first = await page.evaluate(() => {
      const pain = document.querySelector('[data-testid="future-vision-pain"]')!;
      const years = document.querySelector('[data-testid="future-vision-years"]')!;
      return !!(pain.compareDocumentPosition(years) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(first).toBe(true);
    if (choice === 'KILL') {
      await expect(page.getByTestId('future-vision-list').locator('li').first()).toHaveText('手紙を頼りに、薬が少女のもとへ届けられた');
    } else {
      await expect(page.getByTestId('vision-MEDICINE_DELIVERED')).toHaveCount(0);
    }
    for (const [w, h] of [[844, 390], [640, 300]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(300);
      const cg = (await page.getByTestId('future-vision-cg').boundingBox())!;
      const pain = (await page.getByTestId('future-vision-pain').boundingBox())!;
      const words = (await page.locator('.vision-see .stage-words').boundingBox())!;
      // Under the picture, from its left edge; whole on screen; never under the words beside it.
      expect(pain.y, `${w}`).toBeGreaterThanOrEqual(cg.y + cg.height - 1);
      expect(Math.abs(pain.x - cg.x), `${w}`).toBeLessThanOrEqual(1);
      expect(pain.y + pain.height, `${w}`).toBeLessThanOrEqual(h);
      expect(pain.x + pain.width, `${w}`).toBeLessThanOrEqual(words.x);
      // A little smaller than the words beside it.
      const size = await page.getByTestId('future-vision-pain').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const line = await page.getByTestId('future-vision-years').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size).toBeLessThan(line);
    }
  });
}

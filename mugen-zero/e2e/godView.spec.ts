import { test, expect, type Page } from './fixtures';
import { enterDevAdmin } from './helpers';

// GOD VIEW — the author's window on a world they are growing.
//
// What is under test is not prettiness. It is that the four quiet
// failures a growing world has are visible: a person nobody's life
// touches, somebody the engine grows futures for that the roster cannot
// see, a future nothing can reach, and a region with no line into it.
// Plus the one interaction the screen has: narrowing to one person.

async function newWorld(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function openGodView(page: Page) {
  await enterDevAdmin(page);
  await page.getByTestId('god-view-entry').click();
  await expect(page.getByTestId('god-view')).toBeVisible();
}

test('opens on the tester’s own world and says how little has happened', async ({ page }) => {
  await newWorld(page);
  await openGodView(page);

  // A fresh save is nearly empty, and saying so plainly is correct.
  await expect(page.getByTestId('god-clock')).toContainText('年目');
  await expect(page.getByTestId('god-clock')).toContainText('NPC');

  // It is reached and left without touching the game.
  await page.getByTestId('god-view-back').click();
  await expect(page.getByTestId('dev-admin-screen')).toBeVisible();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('world-clock')).toContainText('1年目');
});

test('日本語がUTF-8で正しく表示される', async ({ page }) => {
  await newWorld(page);
  await openGodView(page);

  // Every kind of Japanese the screen renders: headings, roster names,
  // status words and a full sentence. Mojibake would fail all of them.
  await expect(page.getByTestId('god-block-isolated')).toContainText(
    '孤立NPC（誰とも人生が繋がっていない）',
  );
  await expect(page.getByTestId('god-block-principals')).toContainText('NPC一覧（重要）');
  await expect(page.getByTestId('god-block-outside')).toContainText('他地域接続');
  await expect(page.getByTestId(`god-npc-LINA`)).toContainText('リナ（村娘）');
  await expect(page.getByTestId(`god-npc-GALD`)).toContainText('ガルド（元盗賊）');
  // And no replacement characters anywhere on the screen.
  const text = (await page.getByTestId('god-view').innerText()) ?? '';
  expect(text).not.toContain('�');
  expect(text.length).toBeGreaterThan(200);
});

test('the grown world shows the roster, the lonely, and the town at the end', async ({ page }) => {
  await newWorld(page);
  await openGodView(page);
  await page.getByTestId('god-source-DEMO').click();

  // 重要NPC and 一般NPC, each with what canon knows and what it does not.
  // Lina used to read 「CHARACTER_STATE未登録」 here — the engine was
  // growing four futures for somebody no scene could show. She has a
  // record now, so the line says what canon knows instead.
  await expect(page.getByTestId('god-npc-LINA')).toContainText('生存 14歳');
  await expect(page.getByTestId('god-npc-LINA')).toContainText('SEED:');
  await expect(page.getByTestId('god-npc-BAKERY_OWNER')).toBeVisible();
  await expect(page.getByTestId('god-npc-ALDEN_VILLAGE')).toBeVisible();

  // THE HEADLINE: the woman nobody's life touches, found for the author.
  await expect(page.getByTestId('god-isolated-alden_marta')).toContainText('人物VINE 0本');

  // 他地域接続: the boy in the port, because a line runs to him.
  await expect(page.getByTestId('god-block-outside')).toContainText('NEL');
  await expect(page.getByTestId('god-block-outside')).toContainText('@PORT_TOWN');

  // And the world-level readouts.
  await expect(page.getByTestId('god-crossings')).toContainText('GALD_TAKES_THE_ROAD_TO_THE_PORT');
  await expect(page.getByTestId('god-blocked')).toContainText('GALD_RETURNS_TO_THE_VILLAGE');
  // Nothing is unlisted: every actor in the world has a roster entry.
  await expect(page.getByTestId('god-unlisted')).toHaveCount(0);
});

test('narrowing to one NPC shows only what belongs to them', async ({ page }) => {
  await newWorld(page);
  await openGodView(page);
  await page.getByTestId('god-source-DEMO').click();

  const wholeWorld = await page.getByTestId('god-memory').innerText();
  await page.getByTestId('god-npc-LINA').click();

  const detail = page.getByTestId('god-detail');
  await expect(detail).toContainText('リナ（村娘）');
  await expect(page.getByTestId('god-detail-core')).toContainText('traits=[CURIOUS,GENTLE,TIMID]');
  await expect(page.getByTestId('god-detail-core')).toContainText('MAGIC');

  // SEED with strength and state.
  await expect(page.getByTestId('god-detail-seeds')).toContainText('MAGIC_DREAM');
  await expect(page.getByTestId('god-detail-seeds')).toContainText('強度');

  // VINE, including the line to the man the player once helped.
  await expect(page.getByTestId('god-detail-vines')).toContainText('GALD');

  // BLOOM, met and unmet, with the reason for each.
  await expect(page.getByTestId('god-detail-blooms')).toContainText('LINA_WANDERING_MAGE');
  await expect(page.getByTestId('god-detail-blooms')).toContainText('✓');

  // And the records are hers alone — a genuine narrowing.
  const hers = await page.getByTestId('god-detail-memory').innerText();
  expect(hers.length).toBeLessThan(wholeWorld.length);
  expect(hers).not.toContain('PORT_TOWN');

  // The world-level panels step aside while one person is selected.
  await expect(page.getByTestId('god-memory')).toHaveCount(0);
  await page.getByTestId('god-detail-clear').click();
  await expect(page.getByTestId('god-memory')).toBeVisible();
});

test('tapping a lonely NPC opens them', async ({ page }) => {
  await newWorld(page);
  await openGodView(page);
  await page.getByTestId('god-source-DEMO').click();
  await page.getByTestId('god-isolated-alden_marta').click();
  await expect(page.getByTestId('god-detail-vines')).toContainText('⚠ 孤立');
  // She is in plenty of records and tied to nobody, which is the
  // distinction the whole detector rests on.
  await expect(page.getByTestId('god-detail-memory')).toContainText('SHOW_MAGIC');
});

test.describe('on a phone', () => {
  for (const size of [
    { width: 800, height: 360 },
    { width: 844, height: 390 },
  ]) {
    test(`reads without scrolling sideways at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      await newWorld(page);
      await openGodView(page);
      await page.getByTestId('god-source-DEMO').click();
      await page.getByTestId('god-npc-LINA').click();

      const overflow = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="god-view"]') as HTMLElement | null;
        if (!root) return -1;
        return root.scrollWidth - root.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
      // And the way out is reachable.
      await page.getByTestId('god-view-back').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('god-view-back')).toBeVisible();
    });
  }
});

// WORLD NEWS, from the author's side — the only place the two halves of
// a day's gossip are shown apart.
test('the author can see which of today’s gossip the world earned', async ({ page }) => {
  await newWorld(page);
  await openGodView(page);
  await page.getByTestId('god-source-DEMO').click();

  const today = page.getByTestId('god-news-today');
  await expect(today).toBeVisible();
  // Chickens are labelled as chickens.
  await expect(today).toContainText('[日常]');
  // And the earned lines carry what they came from.
  await expect(today).toContainText('伝播');

  const report = page.getByTestId('god-news-report');
  await expect(report).toContainText('言える');
  await expect(report).toContainText('沈黙');
  await expect(report).toContainText('signal_');
  await expect(report).toContainText('日常の在庫');
});

// ALDEN の正式ビジュアルとCANON登録。
test('the baker and his daughter are registered, with their artwork', async ({ page }) => {
  await newWorld(page);
  await openGodView(page);

  // On THIS save, not the demo: they are initial characters now, so a
  // world one day old already knows them.
  await expect(page.getByTestId('god-npc-LINA')).toContainText('生存 14歳');
  await expect(page.getByTestId('god-npc-LINA')).toContainText('BAKERY_HELPER');
  // And she is not a baker, a mage, or anything else yet.
  await expect(page.getByTestId('god-npc-LINA')).not.toContainText('MAGE');

  // His age is a decision nobody has made, and it says so rather than
  // rendering a null.
  await expect(page.getByTestId('god-npc-BAKERY_OWNER')).toContainText('年齢未定');
  await expect(page.getByTestId('god-npc-BAKERY_OWNER')).not.toContainText('null');

  // The delivered artwork loads for both.
  for (const id of ['LINA', 'BAKERY_OWNER']) {
    await page.getByTestId(`god-npc-${id}`).click();
    await expect(page.getByTestId('god-detail-art')).toBeVisible();
    const art = page.getByTestId(`god-art-${id}`);
    await expect(art).toBeVisible();
    const loaded = await art.evaluate((node) => {
      const el = node as HTMLElement;
      const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
      if (img) return img.complete && img.naturalWidth > 0;
      // Drawn as a background image: having one at all is the check.
      return /url\(/.test(getComputedStyle(el).backgroundImage);
    });
    expect(loaded, `${id} artwork loaded`).toBe(true);
    await page.getByTestId('god-detail-clear').click();
  }

  // The family, read off the one stored fact in both directions.
  await page.getByTestId('god-npc-BAKERY_OWNER').click();
  await expect(page.getByTestId('god-detail-core')).toContainText('リナ（村娘）の親');
  await page.getByTestId('god-detail-clear').click();
  await page.getByTestId('god-npc-LINA').click();
  await expect(page.getByTestId('god-detail-core')).toContainText('パン屋の主人の子');
});

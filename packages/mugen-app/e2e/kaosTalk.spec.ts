import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { placeButton } from './village';

/**
 * 主人公×ケイオス (作者指示 2026-10-11): their short exchanges, under the two
 * of them with NEW, the two of them side by side over the painting (the one
 * speaking in full light, her face as her line names it), each said once.
 * Whether one is said is a roll; the DEV server says none unless a test sets
 * `__mugenBanterRoll` (0: said).
 */

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

const roll = (page: Page, r: number) =>
  page.evaluate((v) => ((window as unknown as { __mugenBanterRoll?: number }).__mugenBanterRoll = v), r);
const isRead = (page: Page, id: string) =>
  page.evaluate((m) => (window as unknown as { __mugenWorld: { isRead(x: string): boolean } }).__mugenWorld.isRead(m), id);

async function readThrough(page: Page) {
  const seen: { said: string; speaking: string; face: string; hero: string }[] = [];
  for (let i = 0; i < 6; i++) {
    if (!(await page.getByTestId('kaos-banter').isVisible().catch(() => false))) break;
    seen.push({
      said: ((await page.getByTestId('kaos-banter-line').textContent()) ?? '').trim(),
      speaking: (await page.getByTestId('talk-stage').getAttribute('data-speaking')) ?? '',
      face: (await page.getByTestId('kaos-banter').getAttribute('data-kaos-face')) ?? '',
      hero: (await page.getByTestId('talk-bust-hero').getAttribute('data-face').catch(() => '')) ?? '',
    });
    await page.getByTestId('kaos-banter-next').click();
  }
  return seen;
}

test('setting out: one of their exchanges under the two of them with NEW, the two side by side — whoever speaks in the light, her face as written; once only', async ({
  page,
}) => {
  await freshVillage(page);
  await roll(page, 0);
  await page.getByTestId('explore-button').click();
  const box = page.getByTestId('kaos-banter');
  await expect(box).toHaveAttribute('data-banter', 'WHICH_WAY');
  await expect(page.getByTestId('kaos-banter-new')).toBeVisible();
  // Under the two of them, on the painting's side (2026-10-11: 「セリフ左下の画像下の方が読みやすい」): left of the page, at the foot of the screen.
  {
    const lineBox = (await box.boundingBox())!;
    const pageBox = (await page.getByTestId('place-page').or(page.getByTestId('village-area')).boundingBox())!;
    const vh = page.viewportSize()!.height;
    expect(lineBox.x + lineBox.width).toBeLessThanOrEqual(pageBox.x + 1);
    expect(lineBox.y).toBeGreaterThan(vh / 2);
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(vh);
  }
  // The two of them over the painting, left of the page.
  await expect(page.getByTestId('talk-bust-kaos')).toBeVisible();
  await expect(page.getByTestId('talk-bust-hero')).toBeVisible();
  const kaos = (await page.getByTestId('talk-bust-kaos').boundingBox())!;
  const hero = (await page.getByTestId('talk-bust-hero').boundingBox())!;
  const pageBox = (await page.getByTestId('place-page').or(page.getByTestId('village-area')).boundingBox())!;
  expect(hero.x).toBeLessThan(kaos.x);
  expect(kaos.x).toBeLessThan(pageBox.x);
  await expect(page.getByTestId('talk-bust-kaos')).toHaveAttribute('data-face', 'SMILE');

  const seen = await readThrough(page);
  expect(seen.map((s) => s.said)).toEqual(['「ねえ、今日はどっち行く？」', '「森かな。」', '「じゃあ、迷子にならないようにね。」', '「それはこっちの台詞だ。」']);
  expect(seen.map((s) => s.speaking)).toEqual(['KAOS', 'HERO', 'KAOS', 'HERO']);
  expect(seen.map((s) => s.face)).toEqual(['SMILE', '', 'DOYA', '']);
  // His face too, line by line: his first before he speaks, then as written.
  expect(seen.map((s) => s.hero)).toEqual(['NORMAL', 'NORMAL', 'NORMAL', 'SMILE']);
  await expect(box).toHaveCount(0);
  await expect(page.getByTestId('talk-stage')).toHaveCount(0);
  await expect.poll(() => isRead(page, 'talk:BANTER_WHICH_WAY')).toBe(true);
  // The ways on still all there.
  await expect(page.getByTestId('forest-button')).toBeEnabled();

  // Out again: that one is not said again (none other is due on the first day).
  await page.getByTestId('back-to-village').click();
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await expect(page.getByTestId('kaos-banter')).toHaveCount(0);
});

test('coming back into the village: 「ただいまー。」 under the two of them, NEW, the two side by side; and with the roll against it, nothing', async ({
  page,
}) => {
  await freshVillage(page);
  // Against (the DEV default): nothing said either way.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await expect(page.getByTestId('kaos-banter')).toHaveCount(0);
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('kaos-banter')).toHaveCount(0);

  // For it: said on coming back in.
  await roll(page, 0);
  await page.getByTestId('explore-button').click();
  // (setting out says its own first: read it)
  while (await page.getByTestId('kaos-banter').isVisible().catch(() => false)) await page.getByTestId('kaos-banter-next').click();
  await page.getByTestId('back-to-village').click();
  const box = page.getByTestId('kaos-banter');
  await expect(box).toHaveAttribute('data-banter', 'TADAIMA');
  await expect(page.getByTestId('kaos-banter-new')).toBeVisible();
  // Under the two of them, on the painting's side (2026-10-11: 「セリフ左下の画像下の方が読みやすい」): left of the page, at the foot of the screen.
  {
    const lineBox = (await box.boundingBox())!;
    const pageBox = (await page.getByTestId('place-page').or(page.getByTestId('village-area')).boundingBox())!;
    const vh = page.viewportSize()!.height;
    expect(lineBox.x + lineBox.width).toBeLessThanOrEqual(pageBox.x + 1);
    expect(lineBox.y).toBeGreaterThan(vh / 2);
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(vh);
  }
  await expect(page.getByTestId('talk-stage')).toHaveAttribute('data-speaking', 'KAOS');
  const seen = await readThrough(page);
  expect(seen.map((s) => s.said)).toEqual(['「ただいまー。」', '「誰に言ってるんだ。」', '「村に。」']);
  expect(seen.map((s) => s.face)).toEqual(['SMILE', '', 'DOYA']);
  await expect(box).toHaveCount(0);
  // Every door of the square there and working.
  await (await placeButton(page, 'shop-button')).click();
  await expect(page.getByTestId('shop-screen')).toBeVisible();
});

test('in the village the two of them take the whole left panel: its one-person face put away (never her twice), both large, left and right, whoever speaks lit; afterwards the face is back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await freshVillage(page);
  await expect(page.getByTestId('village-who')).toBeVisible();
  await roll(page, 0);
  await page.getByTestId('explore-button').click();
  while (await page.getByTestId('kaos-banter').isVisible().catch(() => false)) await page.getByTestId('kaos-banter-next').click();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('kaos-banter')).toHaveAttribute('data-banter', 'TADAIMA');
  const stage = page.getByTestId('talk-stage');
  await expect(stage).toHaveAttribute('data-layout', 'panel');
  // The panel's own one-person face is put away while they talk.
  await expect(page.getByTestId('village-who')).toBeHidden();
  await expect(page.locator('.vg-side')).toHaveAttribute('data-talk-duo', 'on');
  await expect(page.getByTestId('talk-bust-hero')).toBeVisible();
  await expect(page.getByTestId('talk-bust-kaos')).toBeVisible();
  const panel = (await page.locator('.vg-side').boundingBox())!;
  const hero = (await page.getByTestId('talk-bust-hero').boundingBox())!;
  const kaos = (await page.getByTestId('talk-bust-kaos').boundingBox())!;
  const words = (await page.getByTestId('kaos-banter').boundingBox())!;
  // Left and right, each large: more than half the panel wide, their heads inside the panel's top.
  expect(hero.x + hero.width / 2).toBeLessThan(kaos.x + kaos.width / 2);
  for (const b of [hero, kaos]) {
    expect(b.width).toBeGreaterThan(panel.width * 0.5);
    expect(b.y).toBeGreaterThanOrEqual(panel.y);
    expect(b.y).toBeLessThan(panel.y + panel.height * 0.25);
  }
  // The words under them, inside the panel, not squeezed.
  expect(words.y + words.height).toBeLessThanOrEqual(panel.y + panel.height);
  expect(words.height).toBeGreaterThanOrEqual(40);
  // Whoever speaks is lit: her first, then him.
  await expect(page.locator('.talk-bust-kaos')).toHaveClass(/\bon\b/);
  await expect(page.locator('.talk-bust-hero')).not.toHaveClass(/\bon\b/);
  await page.getByTestId('kaos-banter-next').click();
  await expect(page.locator('.talk-bust-hero')).toHaveClass(/\bon\b/);
  await expect(page.locator('.talk-bust-kaos')).not.toHaveClass(/\bon\b/);
  // Read to the end: the panel's own face again.
  while (await page.getByTestId('kaos-banter').isVisible().catch(() => false)) await page.getByTestId('kaos-banter-next').click();
  await expect(stage).toHaveCount(0);
  await expect(page.getByTestId('village-who')).toBeVisible();
  await expect(page.locator('.vg-side')).not.toHaveAttribute('data-talk-duo', 'on');
});

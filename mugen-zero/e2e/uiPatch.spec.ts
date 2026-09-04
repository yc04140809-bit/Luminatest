import { test, expect, type Page } from './fixtures';
import { playToLifeChoice } from './helpers';

// UI patch: Gald must read as a person — seen before the fight, present
// during it, and visibly beaten (not dead) while his life is decided.

const PHONES = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
];

async function startAndOpenHome(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  await expect(kaos).toBeVisible();
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function expectNoHorizontalScroll(page: Page) {
  const doc = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
}

test('Gald is shown at the encounter, in battle, and beaten at the choice', async ({ page }) => {
  await playToLifeChoice(page, '', { stopAt: 'ENCOUNTER' });

  // 1. Encounter: his face, and a name plate that says who he is.
  await expect(page.getByTestId('scene-portrait')).toBeVisible();
  await expect(page.getByText('盗賊 ガルド').first()).toBeVisible();
  await expect(page.getByText('……止まれ。')).toBeVisible();

  const encounter = page.getByTestId('gald-encounter');
  await encounter.click();
  await encounter.click();

  // 2. Battle: the same man holds the middle, with both health bars.
  await expect(page.getByTestId('battle-screen')).toBeVisible();
  await expect(page.getByTestId('gald-portrait-ready')).toBeVisible();
  await expect(page.getByTestId('enemy-hp')).toContainText('盗賊 ガルド');
  await expect(page.getByTestId('enemy-hp')).toContainText('30 / 30');
  await expect(page.getByTestId('player-hp')).toContainText('40 / 40');

  const attack = page.getByTestId('attack-button');
  await attack.click();
  await expect(page.getByTestId('enemy-hp')).not.toContainText('30 / 30'); // damage lands
  await page.getByTestId('defend-button').click();

  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId('gald-portrait-defeated').isVisible().catch(() => false)) break;
    if (await attack.isEnabled().catch(() => false)) await attack.click();
    await page.waitForTimeout(150);
  }

  // 3. HP 0: he switches to the beaten art and speaks — still alive.
  await expect(page.getByTestId('gald-portrait-defeated')).toBeVisible();
  await expect(page.getByTestId('gald-defeated-line')).toContainText('……くそ……。');

  // 4. The choice is made with him in view; all four routes offered.
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('life-choice-portrait')).toBeVisible();
  await expect(page.getByText('彼の人生を、どうしますか？')).toBeVisible();
  for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
    await expect(page.getByTestId(`choice-${id}`)).toBeVisible();
  }

  // The four options are presented as equals — same styling, no
  // recommended route.
  const styles = await page.evaluate(() =>
    ['KILL', 'SPARE', 'HELP', 'CAPTURE'].map((id) => {
      const el = document.querySelector(`[data-testid="choice-${id}"]`)!;
      const s = getComputedStyle(el);
      return `${s.color}|${s.borderTopColor}|${s.backgroundColor}|${s.fontWeight}`;
    }),
  );
  expect(new Set(styles).size).toBe(1);

  // The choice still records exactly as before.
  await page.getByTestId('choice-SPARE').click();
  await expect(page.getByTestId('choice-result-dialogue')).toBeVisible();
});

test('HOME leads in Japanese', async ({ page }) => {
  await startAndOpenHome(page);
  await expect(page.getByTestId('explore-button')).toContainText('探索する');
  await expect(page.getByTestId('world-memory-button')).toContainText('世界の記憶');
  await expect(page.getByTestId('time-shift-button')).toContainText('旅立つ');
  await expect(page.getByTestId('settings-button')).toContainText('設定');
  await expect(page.getByTestId('archive-button')).toContainText('人生の記録');
  await expect(page.getByTestId('rest-button')).toContainText('休息する');
});

test('Kaos speaks from the middle of the screen, not the bottom edge', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  await expect(page.getByTestId('kaos-intro')).toBeVisible();

  const viewport = page.viewportSize()!;
  const portrait = (await page.getByTestId('dialogue-portrait').boundingBox())!;
  const box = (await page.locator('.dialogue-box').boundingBox())!;

  // Portrait sits above centre; the words sit right under it, well clear
  // of the bottom edge (the old layout pinned them there).
  expect(portrait.y + portrait.height / 2).toBeLessThan(viewport.height * 0.6);
  expect(box.y).toBeGreaterThan(portrait.y);
  expect(box.y + box.height).toBeLessThan(viewport.height * 0.95);
  const gapBelow = viewport.height - (box.y + box.height);
  expect(gapBelow).toBeGreaterThan(viewport.height * 0.05);
});

for (const size of PHONES) {
  test(`battle and life choice fit ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });

    await expectNoHorizontalScroll(page);
    const portrait = (await page.getByTestId('gald-portrait-ready').boundingBox())!;
    expect(portrait.x).toBeGreaterThanOrEqual(0);
    expect(portrait.x + portrait.width).toBeLessThanOrEqual(size.width + 1);
    // Commands stay reachable at the bottom.
    const cmd = (await page.getByTestId('attack-button').boundingBox())!;
    expect(cmd.y + cmd.height).toBeLessThanOrEqual(size.height + 1);
    expect(cmd.height).toBeGreaterThanOrEqual(40);

    const attack = page.getByTestId('attack-button');
    for (let i = 0; i < 8; i++) {
      if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
      if (await attack.isEnabled().catch(() => false)) await attack.click();
      await page.waitForTimeout(150);
    }
    await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalScroll(page);

    // All four options are on screen and tappable.
    for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
      const b = (await page.getByTestId(`choice-${id}`).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(size.width + 1);
      expect(b.y + b.height).toBeLessThanOrEqual(size.height + 1);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByTestId('life-choice-portrait')).toBeVisible();
  });
}

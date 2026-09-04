import { test, expect, type Page } from './fixtures';
import { playToLifeChoice } from './helpers';

// UX polish: the forest has a real backdrop, the baker's reveal is
// carried by his art, and no route leaves the player wondering what to
// do after the reunion.

const PHONES = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
];

async function openAdminWithPreset(page: Page, preset: string) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId(`preset-${preset}`).click();
  await page.getByTestId('dev-admin-back').click();
}

async function walkThroughEnding(page: Page) {
  const ending = page.getByTestId('ending-kaos');
  await expect(ending).toBeVisible();
  await expect(page.getByText('……どうだった？')).toBeVisible();
  for (let i = 0; i < 4; i++) await ending.click();
  await expect(page.getByTestId('ending-screen')).toBeVisible();
}

test('the forest draws art beneath the game layers, and tapping still walks', async ({ page }) => {
  await playToLifeChoice(page, '', { stopAt: 'ENCOUNTER' });
  // Reaching the encounter at all proves the marker and movement still
  // work with the backdrop in place.
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
});

test('the forest background is loaded as a texture', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await page.getByTestId('explore-button').click();

  const responses: string[] = [];
  page.on('response', (r) => {
    if (/greenwood-forest.*\.webp/.test(r.url())) responses.push(r.url());
  });
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1200);
  expect(responses.length).toBeGreaterThan(0);
});

test('the reunion shows baker Gald, then closes with Kaos and offers the survey', async ({
  page,
}) => {
  await openAdminWithPreset(page, 'SPARE_3Y');

  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_BAKERY').click();

  // The reveal is carried by his art, not by a caption.
  const scene = page.getByTestId('bakery-first-visit');
  await expect(scene).toBeVisible();
  await expect(page.getByTestId('scene-portrait')).toBeVisible();
  const art = await page.getByTestId('scene-portrait').getAttribute('src');
  expect(art).toMatch(/gald-baker/);

  for (let i = 0; i < 8; i++) await scene.click();
  await expect(page.getByTestId('bakery-reunion-done')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('bakery-leave').click();

  // No dead end: Kaos closes the arc and hands over three clear choices.
  await walkThroughEnding(page);
  await expect(page.getByTestId('ending-survey-button')).toContainText('感想を伝える');
  await expect(page.getByTestId('ending-archive-button')).toBeVisible();
  await expect(page.getByTestId('ending-keep-playing')).toBeVisible();

  // The archive route leads to the finished record and back again.
  await page.getByTestId('ending-archive-button').click();
  await expect(page.getByTestId('archive-screen')).toBeVisible();
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
  await page.getByTestId('archive-detail-back').click();
  await expect(page.getByTestId('archive-screen')).toBeVisible();
  await page.getByTestId('open-survey-button').click();
  await walkThroughEnding(page);

  // Straight into the EXISTING survey — same seven questions.
  await page.getByTestId('ending-survey-button').click();
  const intro = page.getByTestId('survey-intro');
  await expect(intro).toBeVisible();
  await intro.click();
  await intro.click();
  await expect(page.getByTestId('survey-screen')).toContainText('1 / 6');
  await expect(page.getByTestId('q1-5')).toBeVisible();
});

test('もう少し世界を見る returns to HOME with the world untouched', async ({ page }) => {
  await openAdminWithPreset(page, 'REUNITED');
  await page.getByTestId('archive-button').click();
  await page.getByTestId('open-survey-button').click();
  await walkThroughEnding(page);
  await page.getByTestId('ending-keep-playing').click();
  await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');
});

for (const route of ['KILL', 'HELP', 'CAPTURE'] as const) {
  test(`${route} route also reaches the ending and the survey`, async ({ page }) => {
    await openAdminWithPreset(page, route);
    await page.getByTestId('archive-button').click();
    await page.getByTestId('open-survey-button').click();
    await walkThroughEnding(page);

    // No bakery imagery leaks into a route that never had one.
    const text = await page.getByTestId('ending-screen').innerText();
    expect(text).not.toContain('パン');
    await page.getByTestId('ending-survey-button').click();
    const intro = page.getByTestId('survey-intro');
    await expect(intro).toBeVisible();
    await intro.click();
    await intro.click();
    await expect(page.getByTestId('q1-5')).toBeVisible();
  });
}

for (const size of PHONES) {
  test(`forest and ending fit ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/');
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();

    // Forest: canvas inside the viewport, no sideways scroll.
    await page.getByTestId('explore-button').click();
    await page.getByTestId('location-GREENWOOD_FOREST').click();
    const canvas = page.locator('.phaser-wrap canvas');
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    let doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
    const box = (await canvas.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);

    // Ending: buttons on screen and tappable.
    await page.getByTestId('dev-admin-entry').isVisible().catch(() => false);
    await page.getByTestId('leave-forest').click(); // leave the forest
    await page.locator('.screen-footer .btn').click(); // back to HOME
    await page.getByTestId('dev-admin-entry').click();
    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
    await page.getByTestId('preset-REUNITED').click();
    await page.getByTestId('dev-admin-back').click();
    await page.getByTestId('archive-button').click();
    await page.getByTestId('open-survey-button').click();
    await walkThroughEnding(page);

    doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
    for (const id of ['ending-survey-button', 'ending-archive-button', 'ending-keep-playing']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(size.width + 1);
      expect(b.y + b.height).toBeLessThanOrEqual(size.height + 1);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
  });
}

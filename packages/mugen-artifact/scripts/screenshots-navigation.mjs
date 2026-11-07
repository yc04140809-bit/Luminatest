// PLAYTEST ROUND 2: the navigation upgrade, at 390x844.
//   npx vite --port 4176 & BASE=http://localhost:4176 SHOT_DIR=... node scripts/screenshots-navigation.mjs
import { chromium } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4176';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const shot = async (name) => {
  await page.waitForTimeout(420);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const enter = async () => {
  await page.goto(`${BASE}/`);
  await page
    .locator('[data-testid="start-button"], [data-testid="continue-button"]')
    .first()
    .waitFor({ timeout: 20000 });
  if (await page.getByTestId('start-button').isVisible().catch(() => false)) {
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const k = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await k.click();
  } else {
    await page.getByTestId('continue-button').click();
  }
  await page.getByTestId('world-clock').waitFor();
};
const preset = async (id) => {
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId(`preset-${id}`).click();
  await page.getByTestId('dev-admin-back').click();
};
const play = async (id, n = 20) => {
  const scene = page.getByTestId(id);
  for (let i = 0; i < n; i++) {
    if ((await scene.count()) === 0) break;
    await scene.click({ timeout: 3000 }).catch(() => {});
  }
};

// 1. The first TIME SHIFT now says where to look, not what is there.
await enter();
await preset('SPARE');
await page.getByTestId('time-shift-button').click();
await page.getByTestId('time-shift-go').click();
await page.getByTestId('time-shift-done').waitFor({ timeout: 15000 });
await shot('n1-timeshift-guidance');

// 2. The map, with ✦ on the places that have something waiting.
await page.getByTestId('time-shift-explore').click();
await page.getByTestId('location-GREENWOOD_FOREST').waitFor();
await shot('n2-explore-marks');

// 3. The tavern, and the rumour this world earned.
await page.getByTestId('location-MOONLIGHT_TAVERN').click();
await play('talk-MOONLIGHT_TAVERN');
await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();
await page.getByTestId('location-MOONLIGHT_TAVERN').click();
await page.getByTestId('talk-MOONLIGHT_TAVERN').waitFor();
await page.getByTestId('talk-MOONLIGHT_TAVERN').click();
await page.getByTestId('talk-MOONLIGHT_TAVERN').click();
await shot('n3-tavern-rumour');
await play('talk-MOONLIGHT_TAVERN');
await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();

// 4. The NEXT seed: a question this build does not answer.
await page.getByTestId('location-MOONLIGHT_TAVERN').click();
const seed = page.getByTestId('talk-MOONLIGHT_TAVERN');
await seed.waitFor();
for (let i = 0; i < 3; i++) await seed.click();
await shot('n4-next-seed');
await play('talk-MOONLIGHT_TAVERN');
await shot('n5-next-seed-kaos');
await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();

// 5. The village: a small thing to find.
await page.getByTestId('location-ALDEN_VILLAGE').click();
const village = page.getByTestId('talk-ALDEN_VILLAGE');
await village.waitFor();
await village.click();
await shot('n6-villager');
await play('talk-ALDEN_VILLAGE');
await page.getByTestId('talk-ALDEN_VILLAGE-leave').click();

// 6. The forest, with the walking figure instead of a dot.
await page.getByTestId('location-GREENWOOD_FOREST').click();
const canvas = page.locator('.phaser-wrap canvas');
await canvas.waitFor({ timeout: 25000 });
await page.waitForTimeout(900);
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.55);
await page.waitForTimeout(260);
await shot('n7-player-marker');

await browser.close();
console.log('navigation screenshots written');

// UX polish screens at 390x844 (dev server on 4174).
import { chromium } from '@playwright/test';
const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4174';
const shot = async (page, name) => { await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/${name}.png` }); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/`);
await page.getByTestId('start-button').click();
await page.getByTestId('prologue-monologue').click();
const kaos = page.getByTestId('kaos-intro');
for (let i = 0; i < 6; i++) await kaos.click();
await page.getByTestId('world-clock').waitFor();

// 1. Greenwood with the new backdrop.
await page.getByTestId('explore-button').click();
await page.getByTestId('location-GREENWOOD_FOREST').click();
const canvas = page.locator('.phaser-wrap canvas');
await canvas.waitFor({ timeout: 20000 });
await page.waitForTimeout(1200);
await shot(page, 'u1-greenwood-background');

// 2. Gald at the encounter.
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));
const enc = page.getByTestId('gald-encounter');
await enc.waitFor({ timeout: 20000 });
await shot(page, 'u2-encounter-gald');

// 3. Battle, then the beaten state.
await enc.click(); await enc.click();
await page.getByTestId('battle-screen').waitFor();
const attack = page.getByTestId('attack-button');
for (let i = 0; i < 8; i++) {
  if (await page.getByTestId('gald-portrait-defeated').isVisible().catch(() => false)) break;
  if (await attack.isEnabled().catch(() => false)) await attack.click();
  await page.waitForTimeout(150);
}
await page.getByTestId('gald-defeated-line').waitFor();
await shot(page, 'u3-battle-defeated');

await page.getByTestId('life-choice-screen').waitFor({ timeout: 10000 });
await page.getByTestId('choice-SPARE').click();
const result = page.getByTestId('choice-result-dialogue');
await result.waitFor();
for (let i = 0; i < 3; i++) await result.click();
await page.getByTestId('choice-recorded-screen').waitFor();
await page.getByTestId('return-home-button').click();

// Jump to the reunion state through the admin (official APIs).
await page.getByTestId('dev-admin-entry').click();
await page.getByTestId('dev-lock-input').fill('0909');
await page.getByTestId('dev-lock-submit').click();
await page.getByTestId('preset-SPARE_3Y').click();
await page.getByTestId('dev-admin-back').click();

// 4. Baker Gald, three years on.
await page.getByTestId('explore-button').click();
await page.getByTestId('location-ALDEN_BAKERY').click();
const scene = page.getByTestId('bakery-first-visit');
await scene.waitFor();
await scene.click();
await scene.click();
await shot(page, 'u4-baker-gald');
for (let i = 0; i < 6; i++) await scene.click();
await page.getByTestId('bakery-reunion-done').waitFor({ timeout: 10000 });

// 5. Kaos ending + the three ways on.
await page.getByTestId('bakery-leave').click();
const endingScene = page.getByTestId('ending-kaos');
await endingScene.waitFor();
await shot(page, 'u5-ending-kaos');
for (let i = 0; i < 4; i++) await endingScene.click();
await page.getByTestId('ending-screen').waitFor();
await shot(page, 'u6-ending-choices');

// 6. Straight into the existing survey.
await page.getByTestId('ending-survey-button').click();
const intro = page.getByTestId('survey-intro');
await intro.waitFor();
await intro.click();
await intro.click();
await page.getByTestId('survey-screen').waitFor();
await shot(page, 'u7-survey');

await browser.close();
console.log('ux polish screenshots written');

// Phase G visual baseline: the 14 screens of the core experience at
// 390x844. Run against a DEV server (needs the dev admin for setup):
//   npx vite --port 4174 & SHOT_DIR=... node scripts/screenshots-baseline.mjs
import { chromium } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4174';
// Screens fade in; wait it out so the baseline captures the settled UI.
const shot = async (page, name, opts = {}) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/`);
await page.getByTestId('start-button').waitFor();
await shot(page, '01-title');

await page.getByTestId('start-button').click();
await page.getByTestId('prologue-monologue').click();
await page.getByTestId('kaos-intro').waitFor();
await shot(page, '02-prologue-kaos');

const kaos = page.getByTestId('kaos-intro');
for (let i = 0; i < 6; i++) await kaos.click();
await page.getByTestId('world-clock').waitFor();
await shot(page, '03-home');

await page.getByTestId('explore-button').click();
await page.getByTestId('location-GREENWOOD_FOREST').click();
const canvas = page.locator('.phaser-wrap canvas');
await canvas.waitFor({ timeout: 20000 });
await page.waitForTimeout(800);
await shot(page, '04-greenwood');

const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));
const encounter = page.getByTestId('gald-encounter');
await encounter.waitFor({ timeout: 20000 });
await shot(page, '05-gald');

await encounter.click();
await encounter.click();
await page.getByTestId('battle-screen').waitFor();
await page.getByTestId('attack-button').click();
await page.waitForTimeout(200);
await shot(page, '06-battle');

const attack = page.getByTestId('attack-button');
for (let i = 0; i < 8; i++) {
  if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
  if (await attack.isEnabled().catch(() => false)) await attack.click();
  await page.waitForTimeout(150);
}
await page.getByTestId('life-choice-screen').waitFor({ timeout: 10000 });
await page.waitForTimeout(1200);
await shot(page, '07-life-choice');

await page.getByTestId('choice-SPARE').click();
const result = page.getByTestId('choice-result-dialogue');
await result.waitFor();
await result.click();
await result.click();
await result.click();
await page.getByTestId('choice-recorded-screen').waitFor();
await shot(page, '08-memory');
await page.getByTestId('return-home-button').click();

// LIFE ARCHIVE before discovery (world already ahead of the player).
await page.getByTestId('world-clock').waitFor();
await page.getByTestId('dev-admin-entry').click();
await page.getByTestId('dev-lock-input').fill('0909');
await page.getByTestId('dev-lock-submit').click();
await page.getByTestId('preset-SPARE_3D').click();
await page.getByTestId('dev-admin-back').click();

await page.getByTestId('time-shift-button').click();
await page.getByTestId('time-shift-confirm').waitFor();
await shot(page, '09-timeshift');
await page.getByTestId('time-shift-go').click();
await page.getByTestId('time-shift-done').waitFor({ timeout: 10000 });
await page.getByTestId('time-shift-return').click();

await page.getByTestId('archive-button').click();
await page.getByTestId('archive-entry-GALD').click();
await page.getByTestId('archive-unknown').waitFor();
await shot(page, '12-life-archive-unknown');
await page.getByTestId('archive-detail-back').click();
await page.getByTestId('archive-back').click();

await page.getByTestId('explore-button').click();
await page.getByTestId('location-ALDEN_BAKERY').waitFor();
await shot(page, '10-bakery-unknown');

await page.getByTestId('location-ALDEN_BAKERY').click();
const scene = page.getByTestId('bakery-first-visit');
await scene.waitFor();
for (let i = 0; i < 5; i++) await scene.click();
await page.getByText('……見るな。').waitFor();
await shot(page, '11-reunion');
await scene.click();
await scene.click();
await scene.click();
await page.getByTestId('bakery-reunion-done').waitFor({ timeout: 10000 });
await page.getByTestId('bakery-leave').click();
await page.locator('.screen-footer .btn').click();

await page.getByTestId('archive-button').click();
await page.getByTestId('archive-entry-GALD').click();
await page.getByTestId('archive-chapter-GALD_CH_REUNION').waitFor();
await shot(page, '13-life-archive-known', { fullPage: true });
await page.getByTestId('archive-detail-back').click();
await page.getByTestId('archive-back').click();

await page.getByTestId('settings-button').click();
await page.getByTestId('settings-screen').waitFor();
await shot(page, '14-settings');

await browser.close();
console.log('baseline screenshots written');

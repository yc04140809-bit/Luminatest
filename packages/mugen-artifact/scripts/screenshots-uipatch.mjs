// UI patch screens at 390x844 (dev server on 4174).
import { chromium } from '@playwright/test';
const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4174';
const shot = async (page, name) => { await page.waitForTimeout(420); await page.screenshot({ path: `${OUT}/${name}.png` }); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/`);
await page.getByTestId('start-button').click();
await page.getByTestId('prologue-monologue').click();
const kaos = page.getByTestId('kaos-intro');
await kaos.waitFor();
await shot(page, 'p1-kaos-centered');
for (let i = 0; i < 6; i++) await kaos.click();
await page.getByTestId('world-clock').waitFor();
await shot(page, 'p2-home-japanese');

await page.getByTestId('explore-button').click();
await page.getByTestId('location-GREENWOOD_FOREST').click();
const canvas = page.locator('.phaser-wrap canvas');
await canvas.waitFor({ timeout: 20000 });
await page.waitForTimeout(700);
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));
const enc = page.getByTestId('gald-encounter');
await enc.waitFor({ timeout: 20000 });
await shot(page, 'p3-encounter-gald');

await enc.click(); await enc.click();
await page.getByTestId('battle-screen').waitFor();
await page.getByTestId('attack-button').click();
await shot(page, 'p4-battle-gald');

const attack = page.getByTestId('attack-button');
for (let i = 0; i < 8; i++) {
  if (await page.getByTestId('gald-portrait-defeated').isVisible().catch(() => false)) break;
  if (await attack.isEnabled().catch(() => false)) await attack.click();
  await page.waitForTimeout(150);
}
await page.getByTestId('gald-defeated-line').waitFor();
await shot(page, 'p5-battle-defeated');

await page.getByTestId('life-choice-screen').waitFor({ timeout: 10000 });
await page.waitForTimeout(1200);
await shot(page, 'p6-life-choice-gald');

await browser.close();
console.log('ui patch screenshots written');

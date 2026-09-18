// Captures the Phase D TIME SHIFT screens against `vite preview --port 4173`.
import { chromium } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? '.';
const BASE = 'http://localhost:4173';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/`);
await page.getByTestId('start-button').click();
await page.getByTestId('prologue-monologue').click();
const kaos = page.getByTestId('kaos-intro');
for (let i = 0; i < 6; i++) await kaos.click();
await page.getByTestId('explore-button').click();
await page.getByTestId('location-GREENWOOD_FOREST').click();
const canvas = page.locator('.phaser-wrap canvas');
await canvas.waitFor();
await page.waitForTimeout(800);
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));
const enc = page.getByTestId('gald-encounter');
await enc.waitFor({ timeout: 15000 });
await enc.click();
await enc.click();
const attack = page.getByTestId('attack-button');
for (let i = 0; i < 8; i++) {
  if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
  if (await attack.isEnabled().catch(() => false)) await attack.click();
  await page.waitForTimeout(150);
}
await page.getByTestId('life-choice-screen').waitFor({ timeout: 10000 });
await page.getByTestId('choice-SPARE').click();
const result = page.getByTestId('choice-result-dialogue');
await result.waitFor();
await result.click();
await result.click();
await result.click();
await page.getByTestId('choice-recorded-screen').waitFor();
await page.getByTestId('return-home-button').click();
await page.getByTestId('world-clock').waitFor();

await page.getByTestId('time-shift-button').click();
await page.getByTestId('time-shift-confirm').waitFor();
await page.screenshot({ path: `${OUT}/13-time-shift-confirm.png` });

await page.getByTestId('time-shift-go').click();
await page.getByTestId('time-shift-done').waitFor({ timeout: 10000 });
await page.getByTestId('time-shift-return').click();
await page.getByTestId('world-clock').waitFor();
await page.screenshot({ path: `${OUT}/14-home-after-shift.png` });

await page.getByTestId('world-memory-button').click();
await page.getByTestId('memory-event-WORLD_TIME_SHIFTED').waitFor();
await page.screenshot({ path: `${OUT}/15-memory-after-shift.png` });

await browser.close();
console.log('done');

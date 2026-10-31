// FIRST IMPRESSION: the first thirty seconds, at 390x844.
//   npx vite --port 4176 & BASE=http://localhost:4176 SHOT_DIR=... node scripts/screenshots-firstimpression.mjs
import { chromium } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4176';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const shot = async (name, wait = 700) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};

await page.goto(`${BASE}/`);
await page.getByTestId('start-button').waitFor({ timeout: 20000 });
await shot('f1-title');

await page.getByTestId('start-button').click();
const monologue = page.getByTestId('prologue-monologue');
await monologue.waitFor();
await shot('f2-opening-line', 1500); // the hint has had time to arrive

await monologue.click();
const kaos = page.getByTestId('kaos-intro');
await kaos.waitFor();
await shot('f3-kaos-arrives', 900);
await kaos.click();
await kaos.click();
await shot('f4-kaos-maybe');
for (let i = 0; i < 4; i++) await kaos.click();

await page.getByTestId('world-clock').waitFor();
await shot('f5-home');

await page.getByTestId('explore-button').click();
await page.getByTestId('location-GREENWOOD_FOREST').waitFor();
await shot('f6-explore');

await page.getByTestId('location-GREENWOOD_FOREST').click();
const canvas = page.locator('.phaser-wrap canvas');
await canvas.waitFor({ timeout: 25000 });
await page.waitForTimeout(900);
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.55);
await shot('f7-player-walking', 300);

await browser.close();
console.log('first impression screenshots written');

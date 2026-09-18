import { chromium } from '@playwright/test';

const OUT = '/tmp/claude-0/-home-user-Luminatest/436298ca-03ea-562f-b2f6-a3b2a31100a0/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173/');

await page.waitForSelector('[data-testid="start-button"]');
await page.screenshot({ path: `${OUT}/01-title.png` });
await page.getByTestId('start-button').click();
await page.getByTestId('prologue-monologue').waitFor();
await page.screenshot({ path: `${OUT}/02-prologue.png` });
await page.getByTestId('prologue-monologue').click();
const kaos = page.getByTestId('kaos-intro');
await kaos.waitFor();
for (let i = 0; i < 6; i++) await kaos.click();
await page.getByTestId('explore-button').waitFor();
await page.screenshot({ path: `${OUT}/03-home.png` });
await page.getByTestId('explore-button').click();
await page.getByTestId('location-GREENWOOD_FOREST').click();
await page.waitForSelector('.phaser-wrap canvas');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/04-greenwood.png` });
const box = await page.locator('.phaser-wrap canvas').boundingBox();
await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));
const enc = page.getByTestId('gald-encounter');
await enc.waitFor({ timeout: 15000 });
await page.screenshot({ path: `${OUT}/05-encounter.png` });
await enc.click();
await enc.click();
await page.getByTestId('battle-screen').waitFor();
await page.screenshot({ path: `${OUT}/06-battle.png` });
const attack = page.getByTestId('attack-button');
for (let i = 0; i < 8; i++) {
  if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
  if (await attack.isEnabled().catch(() => false)) await attack.click();
  await page.waitForTimeout(150);
}
await page.getByTestId('life-choice-screen').waitFor({ timeout: 10000 });
await page.waitForTimeout(1300);
await page.screenshot({ path: `${OUT}/07-life-choice.png` });
await browser.close();
console.log('done');

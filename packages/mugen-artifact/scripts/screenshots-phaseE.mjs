// Captures the Phase E discovery + reunion against a DEV server
// (needs the dev admin for fast state building): BASE=http://localhost:4174
import { chromium } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4174';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/`);
await page.getByTestId('start-button').click();
await page.getByTestId('prologue-monologue').click();
const kaos = page.getByTestId('kaos-intro');
for (let i = 0; i < 6; i++) await kaos.click();
await page.getByTestId('world-clock').waitFor();

// Build "baker, not yet reunited" through the admin (official flow).
await page.getByTestId('dev-admin-entry').click();
await page.getByTestId('dev-lock-input').fill('0909');
await page.getByTestId('dev-lock-submit').click();
await page.getByTestId('preset-SPARE_3Y').click();
await page.getByTestId('dev-event-GALD_BECOMES_BAKER').waitFor();
await page.getByTestId('dev-admin-back').click();

// Discovery: the ??? shop in the explore list.
await page.getByTestId('explore-button').click();
await page.getByTestId('location-ALDEN_BAKERY').waitFor();
await page.screenshot({ path: `${OUT}/18-explore-unknown-shop.png` });

// First visit: click to the 「……見るな。」 beat.
await page.getByTestId('location-ALDEN_BAKERY').click();
const scene = page.getByTestId('bakery-first-visit');
await scene.waitFor();
for (let i = 0; i < 5; i++) await scene.click();
await page.getByText('……見るな。').waitFor();
await page.screenshot({ path: `${OUT}/19-minaruna.png` });

await scene.click();
await scene.click();
await scene.click();
await page.getByTestId('bakery-reunion-done').waitFor({ timeout: 10000 });
await page.screenshot({ path: `${OUT}/20-kaos-after-reunion.png` });

await page.getByTestId('bakery-leave').click();
const endingScene = page.getByTestId('ending-kaos');
await endingScene.waitFor();
for (let i = 0; i < 4; i++) await endingScene.click();
await page.getByTestId('ending-keep-playing').click();
await page.getByTestId('explore-button').click();
await page.getByTestId('location-ALDEN_BAKERY').waitFor();
await page.screenshot({ path: `${OUT}/21-explore-discovered.png` });

await browser.close();
console.log('done');

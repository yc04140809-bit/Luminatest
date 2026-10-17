// Captures the LIFE ARCHIVE before/after the reunion (dev server 4174).
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

await page.getByTestId('dev-admin-entry').click();
await page.getByTestId('dev-lock-input').fill('0909');
await page.getByTestId('dev-lock-submit').click();

// Baker in truth, player unaware.
await page.getByTestId('preset-SPARE_3Y').click();
await page.getByTestId('dev-archive-GALD_CH_NEW_WORK').waitFor();
await page.getByTestId('dev-admin-back').click();
await page.getByTestId('archive-button').click();
await page.getByTestId('archive-entry-GALD').click();
await page.getByTestId('archive-unknown').waitFor();
await page.screenshot({ path: `${OUT}/22-archive-unaware.png`, fullPage: true });
await page.getByTestId('archive-detail-back').click();
await page.getByTestId('archive-back').click();

// Reunited: the whole life connects.
await page.getByTestId('dev-admin-entry').click();
await page.getByTestId('dev-lock-input').fill('0909');
await page.getByTestId('dev-lock-submit').click();
await page.getByTestId('preset-REUNITED').click();
await page.getByTestId('dev-archive-GALD_CH_REUNION').waitFor();
await page.screenshot({ path: `${OUT}/24-dev-archive-debug.png`, fullPage: true });
await page.getByTestId('dev-admin-back').click();
await page.getByTestId('archive-button').click();
await page.getByTestId('archive-entry-GALD').click();
await page.getByTestId('archive-chapter-GALD_CH_REUNION').waitFor();
await page.screenshot({ path: `${OUT}/23-archive-reunited.png`, fullPage: true });

await browser.close();
console.log('done');

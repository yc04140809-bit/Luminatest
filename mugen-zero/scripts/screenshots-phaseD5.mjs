// Captures the DEV ADMIN panel against a DEV server (vite --port 4174),
// since production builds hide the admin unless VITE_ENABLE_DEV_ADMIN=1.
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
await page.getByTestId('dev-lock-screen').waitFor();
await page.screenshot({ path: `${OUT}/16-dev-lock.png` });

await page.getByTestId('dev-lock-input').fill('0909');
await page.getByTestId('dev-lock-submit').click();
await page.getByTestId('dev-admin-screen').waitFor();

await page.getByTestId('preset-SPARE_3Y').click();
await page.getByTestId('dev-event-WORLD_TIME_SHIFTED').waitFor();
await page.screenshot({ path: `${OUT}/17-dev-admin.png`, fullPage: true });

await browser.close();
console.log('done');

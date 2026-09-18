// Phase H survey screens + an offline answer check.
// Run against a DEV server: npx vite --port 4174 & SHOT_DIR=... node scripts/screenshots-phaseH.mjs
import { chromium } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4174';
const shot = async (page, name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto(`${BASE}/`);
await page.getByTestId('start-button').click();
await page.getByTestId('prologue-monologue').click();
const kaos = page.getByTestId('kaos-intro');
for (let i = 0; i < 6; i++) await kaos.click();
await page.getByTestId('world-clock').waitFor();

// Reach the end state through the admin (official APIs underneath).
await page.getByTestId('dev-admin-entry').click();
await page.getByTestId('dev-lock-input').fill('0909');
await page.getByTestId('dev-lock-submit').click();
await page.getByTestId('preset-REUNITED').click();
await page.getByTestId('dev-admin-back').click();

await page.getByTestId('archive-button').click();
await shot(page, '15-archive-with-survey');

// Answer with the network switched off: the survey is local-only.
await context.setOffline(true);
await page.getByTestId('open-survey-button').click();
const intro = page.getByTestId('survey-intro');
await intro.waitFor();
await shot(page, '16-survey-intro');
await intro.click();
await intro.click();

await page.getByTestId('survey-screen').waitFor();
await page.getByTestId('q1-5').click();
await page.getByTestId('q2-5').click();
await page.getByTestId('q3-IMMEDIATE').click();
await shot(page, '17-survey-page1');
await page.getByTestId('survey-next').click();
await page.getByTestId('q4-4').click();
await page.getByTestId('q5-4').click();
await page.getByTestId('q6-REUNION').click();
await shot(page, '18-survey-page2');
await page.getByTestId('survey-next').click();
await page.getByTestId('q7-4').click();
await page.getByTestId('q8-4').click();
await page.getByTestId('q9-NONE').click();
await page.getByTestId('survey-next').click();
await page.getByTestId('q10-input').fill('あの盗賊がパン屋にいたのが本当に驚いた。続きが見たい。');
await shot(page, '19-survey-page4');
await page.getByTestId('survey-submit').click();
await page.getByTestId('survey-done').waitFor({ timeout: 10000 });
await shot(page, '20-survey-done');
await context.setOffline(false);
console.log('offline survey submit: OK');

// Dev view of the collected answer.
await page.getByTestId('survey-done-home').click();
await page.getByTestId('dev-admin-entry').click();
await page.getByTestId('dev-lock-input').fill('0909');
await page.getByTestId('dev-lock-submit').click();
await page.getByTestId('dev-playtest-summary').waitFor();
await page.getByTestId('dev-playtest-summary').scrollIntoViewIfNeeded();
await page.waitForTimeout(700); // let the screen finish fading in
await page.screenshot({ path: `${OUT}/21-dev-playtest.png` });

await browser.close();
console.log('phase H screenshots written');

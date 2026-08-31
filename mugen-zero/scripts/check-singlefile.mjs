// Verifies the single-file build actually plays: the whole core loop on a
// phone viewport, served as one static page.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:4180';
const failures = [];
const ok = (l) => console.log(`  PASS  ${l}`);
const bad = (l, d) => { failures.push(l); console.log(`  FAIL  ${l}${d ? ` — ${d}` : ''}`); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => bad('no page errors', String(e).slice(0, 120)));

await page.goto(`${BASE}/`);
await page.getByTestId('start-button').waitFor({ timeout: 20000 });
ok('title screen loads');

await page.getByTestId('start-button').click();
await page.getByTestId('prologue-monologue').click();
const kaos = page.getByTestId('kaos-intro');
await kaos.waitFor();
const portrait = await page.getByTestId('dialogue-portrait').isVisible();
portrait ? ok('Kaos portrait inlined') : bad('Kaos portrait inlined');
for (let i = 0; i < 6; i++) await kaos.click();
await page.getByTestId('world-clock').waitFor();

// Forest: Phaser must run even though it was folded into the one file.
await page.getByTestId('explore-button').click();
await page.getByTestId('location-GREENWOOD_FOREST').click();
const canvas = page.locator('.phaser-wrap canvas');
await canvas.waitFor({ timeout: 25000 });
(await canvas.count()) === 1 ? ok('Phaser canvas runs (single instance)') : bad('Phaser canvas runs');
await page.waitForTimeout(600);
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));

const encounter = page.getByTestId('gald-encounter');
await encounter.waitFor({ timeout: 25000 });
ok('Gald encounter triggers');
await encounter.click();
await encounter.click();
await page.getByTestId('battle-screen').waitFor();
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
ok('life choice saved to IndexedDB');
await result.click(); await result.click(); await result.click();
await page.getByTestId('choice-recorded-screen').waitFor();
await page.getByTestId('return-home-button').click();

// Time, discovery, reunion.
const clock = page.getByTestId('world-clock');
for (let i = 0; i < 3; i++) {
  const before = await clock.textContent();
  await page.getByTestId('rest-button').click();
  await page.waitForFunction((p) => document.querySelector('[data-testid="world-clock"]')?.textContent !== p, before);
}
await page.getByTestId('time-shift-button').click();
await page.getByTestId('time-shift-go').click();
await page.getByTestId('time-shift-done').waitFor({ timeout: 15000 });
await page.getByTestId('time-shift-return').click();
ok('time shift +3 years');

await page.getByTestId('explore-button').click();
const bakery = page.getByTestId('location-ALDEN_BAKERY');
await bakery.waitFor({ timeout: 10000 });
(await bakery.innerText()).includes('？？？') ? ok('bakery appears unspoiled') : bad('bakery appears unspoiled');
await bakery.click();
const scene = page.getByTestId('bakery-first-visit');
await scene.waitFor();
for (let i = 0; i < 5; i++) await scene.click();
(await page.getByText('……見るな。').isVisible()) ? ok('reunion beat reached') : bad('reunion beat reached');
for (let i = 0; i < 3; i++) await scene.click();
await page.getByTestId('bakery-reunion-done').waitFor({ timeout: 15000 });
await page.getByTestId('bakery-leave').click();
const endingScene = page.getByTestId('ending-kaos');
await endingScene.waitFor();
for (let i = 0; i < 4; i++) await endingScene.click();
await page.getByTestId('ending-keep-playing').click();

// Archive + survey.
await page.getByTestId('archive-button').click();
await page.getByTestId('archive-entry-GALD').click();
const chapters = await page.getByTestId('archive-detail').locator('.location-card').count();
chapters === 5 ? ok('life archive shows 5 chapters') : bad('life archive shows 5 chapters', `${chapters}`);
await page.getByTestId('archive-detail-back').click();
// The survey is reached through Kaos's closing scene.
await page.getByTestId('open-survey-button').click();
const closing = page.getByTestId('ending-kaos');
await closing.waitFor();
for (let i = 0; i < 4; i++) await closing.click();
await page.getByTestId('ending-survey-button').click();
const intro = page.getByTestId('survey-intro');
await intro.waitFor();
await intro.click(); await intro.click();
await page.getByTestId('q1-5').click();
await page.getByTestId('q2-5').click();
await page.getByTestId('q3-IMMEDIATE').click();
await page.getByTestId('survey-next').click();
await page.getByTestId('q4-4').click();
await page.getByTestId('q5-4').click();
await page.getByTestId('q6-REUNION').click();
await page.getByTestId('survey-next').click();
await page.getByTestId('q7-input').fill('テスト回答');
await page.getByTestId('survey-submit').click();
await page.getByTestId('survey-done').waitFor({ timeout: 15000 });
ok('survey submits and saves');

// Dev admin must be absent in this build.
await page.getByTestId('survey-done-home').click();
(await page.getByTestId('dev-admin-entry').count()) === 0
  ? ok('dev admin hidden')
  : bad('dev admin hidden');

// Reload: the save survives in this origin.
await page.reload();
await page.getByTestId('continue-button').waitFor({ timeout: 20000 });
ok('save restored after reload');

await browser.close();
if (failures.length) { console.error(`\n${failures.length} check(s) failed`); process.exit(1); }
console.log('\nSingle-file build plays end to end');

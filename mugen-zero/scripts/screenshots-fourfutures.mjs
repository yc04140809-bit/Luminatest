// GALD FOUR FUTURES: the same beat on all four routes — the ??? card, the
// scene, and Kaos closing it. Run against a DEV server (needs dev admin):
//   npx vite --port 4174 & SHOT_DIR=... node scripts/screenshots-fourfutures.mjs
import { chromium } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4174';

const ROUTES = [
  { key: 'spare', preset: 'SPARE_3Y', site: 'ALDEN_BAKERY', scene: 'bakery', beat: 5 },
  { key: 'help', preset: 'HELP_3Y', site: 'GREENWOOD_WAYSTATION', scene: 'waystation', beat: 10 },
  { key: 'capture', preset: 'CAPTURE_3Y', site: 'ALDEN_WORKYARD', scene: 'workyard', beat: 10 },
  { key: 'kill', preset: 'KILL_3Y', site: 'GREENWOOD_GRAVE', scene: 'grave', beat: 8 },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};

for (const [i, route] of ROUTES.entries()) {
  await page.goto(`${BASE}/`);
  await page
    .locator('[data-testid="start-button"], [data-testid="continue-button"]')
    .first()
    .waitFor({ timeout: 20000 });
  if (await page.getByTestId('start-button').isVisible().catch(() => false)) {
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let k = 0; k < 6; k++) await kaos.click();
  } else {
    await page.getByTestId('continue-button').click();
  }
  await page.getByTestId('world-clock').waitFor();

  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId(`preset-${route.preset}`).click();
  await page.getByTestId('dev-admin-back').click();

  const n = i + 1;
  await page.getByTestId('explore-button').click();
  await page.getByTestId(`location-${route.site}`).waitFor();
  await shot(`ff${n}a-${route.key}-unknown`);

  await page.getByTestId(`location-${route.site}`).click();
  const scene = page.getByTestId(`${route.scene}-first-visit`);
  await scene.waitFor();
  for (let k = 0; k < route.beat; k++) await scene.click();
  await shot(`ff${n}b-${route.key}-scene`);

  for (let k = 0; k < 24; k++) {
    if (!(await scene.isVisible().catch(() => false))) break;
    await scene.click();
  }
  if (route.key === 'help') {
    await page.getByTestId('waystation-reply').waitFor();
    await shot(`ff${n}c-${route.key}-reply`);
    await page.getByTestId('waystation-reply-DONT_KNOW').click();
    const after = page.getByTestId('waystation-after-reply');
    for (let k = 0; k < 12; k++) {
      if (!(await after.isVisible().catch(() => false))) break;
      await after.click();
    }
  }
  await page.getByTestId(`${route.scene}-reunion-done`).waitFor({ timeout: 15000 });
  await shot(`ff${n}d-${route.key}-kaos`);

  await page.getByTestId(`${route.scene}-leave`).click();
  const ending = page.getByTestId('ending-kaos');
  await ending.waitFor();
  for (let k = 0; k < 4; k++) await ending.click();
  await page.getByTestId('ending-keep-playing').click();

  await page.getByTestId('archive-button').click();
  await page.getByTestId('archive-entry-GALD').click();
  await page.getByTestId('archive-detail').waitFor();
  await shot(`ff${n}e-${route.key}-archive`);
  await page.getByTestId('archive-detail-back').click();
  await page.getByTestId('archive-back').click();
}

await browser.close();
console.log('four futures screenshots written');

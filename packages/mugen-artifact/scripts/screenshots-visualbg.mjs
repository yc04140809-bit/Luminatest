// VISUAL BACKGROUND UPDATE: the four screens that gained art, captured at
// the three phone widths the playtest targets.
//   npx vite --port 4174 & SHOT_DIR=... node scripts/screenshots-visualbg.mjs
import { chromium } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:4174';
const WIDTHS = (process.env.WIDTHS ?? '390').split(',').map(Number);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const width of WIDTHS) {
  const tag = WIDTHS.length > 1 ? `-w${width}` : '';
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  const shot = async (name) => {
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${OUT}/${name}${tag}.png` });
  };
  // The horizontal scrollbar check: nothing may overflow sideways.
  const noHScroll = async (where) => {
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (over > 0) console.error(`  !! ${where} overflows by ${over}px at ${width}px`);
    else console.log(`  ok ${where} @${width}px`);
  };

  await page.goto(`${BASE}/`);
  await page.getByTestId('start-button').waitFor();
  await page.getByTestId('title-backdrop').waitFor();
  await shot('vb1-title');
  await noHScroll('TITLE');

  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await page.getByTestId('world-clock').waitFor();
  await page.getByTestId('home-backdrop').waitFor();
  await shot('vb2-home');
  await noHScroll('HOME');

  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  const canvas = page.locator('.phaser-wrap canvas');
  await canvas.waitFor({ timeout: 20000 });
  await page.waitForTimeout(900);
  await shot('vb3-greenwood');
  await noHScroll('GREENWOOD');

  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));
  const encounter = page.getByTestId('gald-encounter');
  await encounter.waitFor({ timeout: 20000 });
  await shot('vb4-encounter');
  await noHScroll('ENCOUNTER');

  await encounter.click();
  await encounter.click();
  await page.getByTestId('battle-screen').waitFor();
  await page.getByTestId('battle-backdrop').waitFor();
  await page.getByTestId('attack-button').click();
  await page.waitForTimeout(250);
  await shot('vb5-battle');
  await noHScroll('BATTLE');

  await page.close();
}

await browser.close();
console.log('visual background screenshots written');

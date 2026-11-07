// Production-build checks that the dev-server e2e suite cannot cover:
// dev admin hidden, service worker registered, offline shell boots.
// Usage: npx vite preview --port 4173 & node scripts/check-production.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const failures = [];
const ok = (label) => console.log(`  PASS  ${label}`);
const bad = (label, detail) => {
  failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
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

// 1. DEV ADMIN must not exist in a production build.
(await page.getByTestId('dev-admin-entry').count()) === 0
  ? ok('dev admin hidden in production build')
  : bad('dev admin hidden in production build');

// 2. Service worker registers and takes control.
await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
  timeout: 15000,
}).then(
  () => ok('service worker registered and controlling'),
  (e) => bad('service worker registered and controlling', String(e).slice(0, 80)),
);

// 3. Manifest is installable-shaped.
const manifest = await page.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
  if (!href) return null;
  const res = await fetch(href);
  return res.ok ? res.json() : null;
});
manifest && manifest.name === 'MUGEN ZERO' && manifest.display === 'standalone' &&
manifest.icons?.length >= 2
  ? ok('manifest installable (name/display/icons)')
  : bad('manifest installable (name/display/icons)');

// 4. Play far enough to store world state, then go offline and reload:
//    the shell must boot from cache and the save must still be there.
//    (One online reload first, mirroring a real second visit: that is
//    when the worker actually serves — and caches — the app's assets.)
await page.getByTestId('rest-button').click();
await page.waitForTimeout(400);
await page.reload();
await page.getByTestId('continue-button').waitFor({ timeout: 15000 });
await page.waitForTimeout(800); // let asset caching settle
await context.setOffline(true);
await page.reload();
// waitFor, not isVisible: isVisible() ignores a timeout and answers
// immediately, which raced the offline reload.
const bootedOffline = await page
  .getByTestId('continue-button')
  .waitFor({ state: 'visible', timeout: 15000 })
  .then(() => true)
  .catch(() => false);
bootedOffline ? ok('offline shell boots from cache') : bad('offline shell boots from cache');

if (bootedOffline) {
  await page.getByTestId('continue-button').click();
  const clock = await page.getByTestId('world-clock').textContent();
  clock?.includes('2日目')
    ? ok(`IndexedDB save intact offline (${clock.trim()})`)
    : bad('IndexedDB save intact offline', clock ?? 'no clock');
}
await context.setOffline(false);

await browser.close();
if (failures.length > 0) {
  console.error(`\n${failures.length} production check(s) failed`);
  process.exit(1);
}
console.log('\nAll production checks passed');

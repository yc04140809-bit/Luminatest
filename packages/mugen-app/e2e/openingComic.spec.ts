import { test, expect, type Page } from '@playwright/test';

/**
 * 触る漫画形式のオープニング (作者指示 2026-10-16): tapped through, one TAP one
 * page; noise, the glimpse of the man and the power going off run by
 * themselves; the despair is held; the three answers are the drawn ones; then
 * the name, then Alden — and the opening is kept as seen, never played again
 * on 「つづきから」.
 */

test.describe.configure({ timeout: 120_000 });

async function freshStart(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await Promise.all(
      ((await indexedDB.databases?.()) ?? []).map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  await page.reload();
  await page.getByTestId('start-button').click();
}

const comic = (page: Page) => page.getByTestId('opening-comic');
const playing = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mugenAudio?: { bgmState(): { current: string | null } } }).__mugenAudio?.bgmState().current ?? null);

/** Taps through to the naming screen, a page at a time; returns each picture seen and how it behaved. */
async function tapThrough(page: Page): Promise<{ image: string; kind: string; tapped: boolean }[]> {
  const seen: { image: string; kind: string; tapped: boolean }[] = [];
  for (let i = 0; i < 400; i++) {
    if (await page.getByTestId('naming-screen').isVisible().catch(() => false)) break;
    const c = comic(page);
    // The page as it is, read in one go: a page that goes on by itself may be gone between two reads.
    const now = await page
      .evaluate(() => {
        const el = document.querySelector('[data-testid="opening-comic"]');
        return el
          ? { image: el.getAttribute('data-image') ?? '', kind: el.getAttribute('data-kind') ?? '', waiting: el.getAttribute('data-waiting'), choice: el.getAttribute('data-choice'), step: el.getAttribute('data-step') }
          : null;
      })
      .catch(() => null);
    if (!now || !now.image) continue;
    const { image, kind } = now;
    if (seen.at(-1)?.image !== image) seen.push({ image, kind, tapped: false });
    if (kind === 'CHOICE' && now.choice === 'ASK') {
      await page.getByTestId('opening-choice-CRYING').click();
      continue;
    }
    if (now.waiting !== 'yes') {
      await page.waitForTimeout(40);
      continue;
    }
    const step = now.step;
    await c.click({ position: { x: 20, y: 20 } }).catch(() => {});
    seen.at(-1)!.tapped = true;
    // One tap, one page: wait for it to move (or for the name).
    await expect
      .poll(async () => ((await page.getByTestId('naming-screen').isVisible().catch(() => false)) ? 'done' : await c.getAttribute('data-step').catch(() => 'done')))
      .not.toBe(step);
    await page.waitForTimeout(220);
  }
  return seen;
}

test('tapped from the first page to 「また、ここで。」: every picture in order; noise, the man and the power off go on alone; then the name, then Alden; kept as seen', async ({ page }) => {
  await freshStart(page);
  await expect(comic(page)).toHaveAttribute('data-image', 'op_01_intro_comic');
  await expect(page.getByTestId('opening-tap-hint')).toBeVisible();
  await expect.poll(() => playing(page)).toBe('KAOS_EVENT');
  // Every picture shown, however briefly (the noise is ~160 ms): recorded in the page as it changes.
  await page.evaluate(() => {
    const w = window as unknown as { __opSeen: string[] };
    w.__opSeen = [document.querySelector('[data-testid="opening-comic"]')!.getAttribute('data-image')!];
    new MutationObserver(() => {
      const img = document.querySelector('[data-testid="opening-comic"]')?.getAttribute('data-image');
      if (img && w.__opSeen.at(-1) !== img) w.__opSeen.push(img);
    }).observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['data-image'] });
  });
  const seen = await tapThrough(page);
  const shown = await page.evaluate(() => (window as unknown as { __opSeen: string[] }).__opSeen);
  expect(shown).toEqual([
    'op_01_intro_comic',
    'op_02_warning_comic',
    'op_03_sorejaa',
    'op_04_noise',
    'op_05a_hatena',
    'op_05_doushitano',
    'op_06_jitsuwane',
    'op_06_noise',
    'op_flash_01_smile',
    'op_flash_01b_doushitano',
    'op_flash_01b_noise',
    'op_flash_02_hold_hand',
    'op_flash_02_noise',
    'op_flash_03_release_hand',
    'op_flash_03_noise',
    'op_flash_04_ruins',
    'op_flash_04_noise',
    'op_flash_05_machine_angel',
    'op_flash_06_stand',
    'op_flash_06_noise',
    'op_flash_07_cry',
    'op_flash_07_cry_closeup',
    'op_poweroff_black',
    'op_funny_face',
    'op_reaction_comic',
    'op_choice_comic',
    'op_jaa',
    'op_gardo_preview',
    'op_itterasshai',
    'op_mata_kokode',
  ]);
  // The ones that run by themselves were never tapped.
  for (const s of seen.filter((x) => x.kind === 'NOISE' || x.kind === 'GLIMPSE' || x.kind === 'POWER_OFF')) expect(s.tapped, s.image).toBe(false);
  // Then the name, then Alden (no 第0話 between).
  await page.getByTestId('naming-input').fill('レイ');
  await page.getByTestId('naming-confirm').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('intro')).toHaveCount(0);
  const marked = await page.evaluate(() => (window as unknown as { __mugenWorld: { isRead(id: string): boolean } }).__mugenWorld.isRead('event:OPENING_COMIC'));
  expect(marked).toBe(true);
  // 「つづきから」: straight to the village, never the opening again.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(comic(page)).toHaveCount(0);
});

test('one TAP, one page: a quick second tap is not taken; a tap on noise does nothing', async ({ page }) => {
  await freshStart(page);
  await expect(comic(page)).toHaveAttribute('data-step', '0');
  await comic(page).dblclick({ position: { x: 20, y: 20 } });
  await expect(comic(page)).toHaveAttribute('data-step', '1');
  await page.waitForTimeout(300);
  await expect(comic(page)).toHaveAttribute('data-step', '1');
});

test('the despair is held before a TAP is taken; the power off is silence, then the funny face brings the music back', async ({ page }) => {
  await freshStart(page);
  for (let i = 0; i < 300; i++) {
    if ((await comic(page).getAttribute('data-image')) === 'op_flash_07_cry_closeup') break;
    if ((await comic(page).getAttribute('data-waiting')) === 'yes') await comic(page).click({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(230);
  }
  await expect(comic(page)).toHaveAttribute('data-kind', 'HOLD');
  await expect(comic(page)).toHaveAttribute('data-waiting', 'no');
  await comic(page).click({ position: { x: 20, y: 20 } });
  await expect(comic(page)).toHaveAttribute('data-image', 'op_flash_07_cry_closeup');
  await expect(comic(page)).toHaveAttribute('data-waiting', 'yes', { timeout: 3000 });
  await comic(page).click({ position: { x: 20, y: 20 } });
  await expect(comic(page)).toHaveAttribute('data-kind', 'POWER_OFF');
  await expect.poll(() => playing(page)).toBe(null);
  await expect(comic(page)).toHaveAttribute('data-image', 'op_funny_face', { timeout: 3000 });
  await expect.poll(() => playing(page)).toBe('KAOS_EVENT');
});

for (const [w, h] of [
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: the choice page — only the drawn answers take a tap; the right panels dark until then; any answer leads on`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshStart(page);
    for (let i = 0; i < 400; i++) {
      if ((await comic(page).getAttribute('data-kind')) === 'CHOICE') break;
      if ((await comic(page).getAttribute('data-waiting')) === 'yes') await comic(page).click({ position: { x: 5, y: 5 } });
      await page.waitForTimeout(230);
    }
    await expect(comic(page)).toHaveAttribute('data-choice', 'ASK');
    await expect(page.locator('.opening-panel-veil')).toHaveCount(2);
    // Off the answers: nothing.
    await comic(page).click({ position: { x: Math.round(w * 0.78), y: Math.round(h * 0.5) } });
    await page.waitForTimeout(300);
    await expect(comic(page)).toHaveAttribute('data-choice', 'ASK');
    // Each answer is on screen.
    for (const id of ['WHAT', 'CRYING', 'FACE']) {
      const b = (await page.getByTestId(`opening-choice-${id}`).boundingBox())!;
      expect(b.y + b.height).toBeLessThanOrEqual(h + 1);
      expect(b.height).toBeGreaterThan(14);
    }
    await page.getByTestId('opening-choice-FACE').click();
    await expect(comic(page)).toHaveAttribute('data-choice', 'STRAIGHT');
    await expect(page.locator('.opening-panel-veil')).toHaveCount(1);
    await expect(comic(page)).toHaveAttribute('data-choice', 'SMILE', { timeout: 2000 });
    await expect(page.locator('.opening-panel-veil')).toHaveCount(0);
    await comic(page).click({ position: { x: 5, y: 5 } });
    await expect(comic(page)).toHaveAttribute('data-image', 'op_jaa');
  });
}

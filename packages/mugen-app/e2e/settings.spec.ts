import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { placeButton } from './village';

/**
 * 設定 (作者 2026-11-02): the sound as the player sets it, kept across a restart; タイトルに戻る from the village,
 * asked once; and the admin's reset — the lock number, then asked twice — that leaves a new game and keeps the
 * device's settings. In the crystal card, inside the screen at the smallest phone size.
 */
/** The buses as they come out (MASTER folded in) — null until the game has opened its world. */
const volumes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mugenAudio?: { volumes(): Record<string, number> } }).__mugenAudio?.volumes() ?? null);

async function fresh(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
    localStorage.clear();
  });
  await page.reload();
}

async function intoTheVillage(page: Page) {
  await fresh(page);
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

test('from the title: the four levels and 全ミュート, heard at once and kept after a restart', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings')).toBeVisible();
  // As the game has always played until now.
  for (const [bus, v] of [['master', '100'], ['bgm', '35'], ['sfx', '80'], ['voice', '80']] as const)
    await expect(page.getByTestId(`settings-${bus}-value`)).toHaveText(v);
  await page.getByTestId('settings-voice').fill('50');
  await page.getByTestId('settings-master').fill('80');
  await expect(page.getByTestId('settings-voice-value')).toHaveText('50');
  await expect.poll(async () => (await volumes(page))?.voice).toBeCloseTo(0.4, 3);
  // 全ミュート: all silent, the levels kept.
  await page.getByTestId('settings-mute').click();
  await expect(page.getByTestId('settings-mute')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => volumes(page)).toEqual({ master: 0, bgm: 0, sfx: 0, voice: 0 });
  await page.getByTestId('settings-close').click();
  await expect(page.getByTestId('settings')).toHaveCount(0);
  // Kept: after a restart, the same — and heard so before the settings are opened again.
  await page.reload();
  await expect.poll(async () => (await volumes(page))?.master).toBe(0);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-voice-value')).toHaveText('50');
  await expect(page.getByTestId('settings-master-value')).toHaveText('80');
  await expect(page.getByTestId('settings-mute')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('settings-mute').click();
  await expect.poll(async () => (await volumes(page))?.voice).toBeCloseTo(0.4, 3);
  // No タイトルに戻る on the title itself.
  await expect(page.getByTestId('settings-title')).toHaveCount(0);
});

test('from the village: タイトルに戻る asks once — やめる stays, 戻る goes to the title with the save kept', async ({ page }) => {
  test.setTimeout(120_000);
  await intoTheVillage(page);
  await page.getByTestId('settings-button').click();
  await page.getByTestId('settings-title').click();
  await expect(page.getByTestId('settings-confirm-title')).toBeVisible();
  await page.getByTestId('settings-confirm-no').click();
  await expect(page.getByTestId('settings-title')).toBeVisible();
  await page.getByTestId('settings-title').click();
  await page.getByTestId('settings-confirm-yes').click();
  await expect(page.getByTestId('continue-button')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

test('管理者: a wrong number opens nothing; the right one opens データリセット — asked twice, then a new game, settings kept', async ({ page }) => {
  test.setTimeout(120_000);
  await intoTheVillage(page);
  await page.getByTestId('settings-button').click();
  await page.getByTestId('settings-voice').fill('30');
  await expect(page.getByTestId('settings-reset')).toHaveCount(0);
  await page.getByTestId('settings-admin').click();
  await page.getByTestId('settings-admin-code').fill('1234567');
  await page.getByTestId('settings-admin-unlock').click();
  await expect(page.getByTestId('settings-admin-wrong')).toBeVisible();
  await expect(page.getByTestId('settings-reset')).toHaveCount(0);
  await page.getByTestId('settings-admin-code').fill('4148999');
  await page.getByTestId('settings-admin-unlock').click();
  await expect(page.getByTestId('settings-admin-tools')).toBeVisible();
  // Asked twice: the first やめる keeps everything.
  await page.getByTestId('settings-reset').click();
  await expect(page.getByTestId('settings-confirm-reset_1')).toBeVisible();
  await page.getByTestId('settings-confirm-no').click();
  // Closed, it is locked again.
  await page.getByTestId('settings-close').click();
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-reset')).toHaveCount(0);
  await page.getByTestId('settings-admin').click();
  await page.getByTestId('settings-admin-code').fill('4148999');
  await page.getByTestId('settings-admin-unlock').click();
  await page.getByTestId('settings-reset').click();
  await page.getByTestId('settings-confirm-yes').click();
  await expect(page.getByTestId('settings-confirm-reset_2')).toBeVisible();
  await page.getByTestId('settings-confirm-yes').click();
  // A new game: はじめる, not つづきから — and the device's settings as they were.
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('continue-button')).toHaveCount(0);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-voice-value')).toHaveText('30');
});

for (const size of [
  { width: 844, height: 390 },
  { width: 640, height: 300 },
]) {
  test(`${size.width}×${size.height}: the card inside the screen, every row reachable; the village's gear clear of the objective`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(size);
    await intoTheVillage(page);
    const gear = await page.getByTestId('settings-button').boundingBox();
    const objective = await page.getByTestId('next-objective').boundingBox();
    expect(gear && objective).toBeTruthy();
    // Not over the objective's box.
    expect(gear!.x + gear!.width <= objective!.x || gear!.y >= objective!.y + objective!.height || gear!.y + gear!.height <= objective!.y).toBe(true);
    expect(gear!.height).toBeGreaterThanOrEqual(24);
    await page.screenshot({ path: `test-results/settings-village-${size.width}.png` });
    await page.getByTestId('settings-button').click();
    const card = await page.locator('.settings-card').boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.y).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(size.width);
    expect(card!.y + card!.height).toBeLessThanOrEqual(size.height);
    for (const id of ['settings-master', 'settings-voice', 'settings-mute', 'settings-brightness', 'settings-cutin-daily', 'settings-text-instant', 'settings-vibration', 'settings-title', 'settings-close', 'settings-admin']) {
      await page.getByTestId(id).scrollIntoViewIfNeeded();
      await expect(page.getByTestId(id)).toBeInViewport();
    }
    await page.getByTestId('settings-text-instant').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/settings-${size.width}.png` });
  });
}

// ---- 段階2: 画面 ----

/** Each voice file played, by name, from before the page loads. */
async function listenForVoices(page: Page) {
  await page.addInitScript(() => {
    const heard: string[] = [];
    (window as unknown as { __heard: string[] }).__heard = heard;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const file = (this.src.split('/').pop() ?? '').replace(/-[A-Za-z0-9_]{6,}(?=\.mp3)/, '');
      if (this instanceof HTMLAudioElement && /^v_/.test(file)) heard.push(file);
      return play.call(this);
    };
  });
  return () => page.evaluate(() => (window as unknown as { __heard: string[] }).__heard.slice());
}

/** The screen's settings, set before the page loads (as a device that set them before). */
async function withScreen(page: Page, screen: object) {
  await page.addInitScript((s) => localStorage.setItem('mugen-settings-display', JSON.stringify(s)), screen);
}

async function toHerTurnOf(page: Page, who: string) {
  for (let i = 0; i < 8; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === who) return;
    await page.getByTestId('pb-cmd-defend').click();
  }
  throw new Error(`never ${who}'s turn`);
}

async function shundan(page: Page) {
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-shundan').click();
  const pick = page.locator('[data-testid^="pb-target-enemy-"]').first();
  if (await pick.isVisible().catch(() => false)) await pick.click();
}

test('明るさ: darker — a veil over everything; brighter — drawn brighter; 100 — nothing; kept after a restart', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('brightness-veil')).toHaveCount(0);
  await page.getByTestId('settings-brightness').fill('80');
  await expect(page.getByTestId('brightness-veil')).toHaveAttribute('data-brightness', '0.80');
  // Never in a finger's way.
  await expect(page.getByTestId('brightness-veil')).toHaveCSS('pointer-events', 'none');
  await page.getByTestId('settings-close').click();
  await page.reload();
  await expect(page.getByTestId('brightness-veil')).toHaveAttribute('data-brightness', '0.80');
  await page.getByTestId('settings-button').click();
  await page.getByTestId('settings-brightness').fill('120');
  await expect(page.getByTestId('brightness-veil')).toHaveCSS('backdrop-filter', /brightness\(1\.2/);
  await page.getByTestId('settings-brightness').fill('100');
  await expect(page.getByTestId('brightness-veil')).toHaveCount(0);
});

test('カットイン OFF: 《瞬断》 goes straight on — no picture, no shout', async ({ page }) => {
  test.setTimeout(60_000);
  await withScreen(page, { brightness: 1, cutIn: 'OFF', textSpeed: 'INSTANT' });
  const heard = await listenForVoices(page);
  await page.goto('/?preview=party');
  await toHerTurnOf(page, 'hero');
  await shundan(page);
  await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
  await expect(page.getByTestId('cut-in')).toHaveCount(0);
  expect((await heard()).filter((f) => /v_ch1_hero110/.test(f))).toEqual([]);
});

test('カットイン 1日1回: 《瞬断》’s the first time today, with its shout; in the next fight the same day, straight on', async ({ page }) => {
  test.setTimeout(90_000);
  await withScreen(page, { brightness: 1, cutIn: 'DAILY', textSpeed: 'INSTANT' });
  const heard = await listenForVoices(page);
  await page.goto('/?preview=party');
  await toHerTurnOf(page, 'hero');
  await shundan(page);
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await expect.poll(async () => (await heard()).filter((f) => /v_ch1_hero110/.test(f))).toHaveLength(1);
  // Another fight, the same day.
  await page.reload();
  await toHerTurnOf(page, 'hero');
  await shundan(page);
  await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
  await expect(page.getByTestId('cut-in')).toHaveCount(0);
  expect((await heard()).filter((f) => /v_ch1_hero110/.test(f))).toEqual([]);
});

test('テキスト速度 普通: a line comes a letter at a time; the first tap shows it whole and goes nowhere, the next goes on', async ({ page }) => {
  test.setTimeout(120_000);
  await intoTheVillage(page);
  await page.getByTestId('settings-button').click();
  // 一括 as it has always been, until another is chosen; the sample shows how they will come.
  await expect(page.getByTestId('settings-text-instant')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('settings-text-normal').click();
  await expect(page.getByTestId('settings-text-sample').locator('[data-typing="yes"]')).toHaveCount(1);
  await page.getByTestId('settings-close').click();
  await (await placeButton(page, 'tavern-button')).click();
  await page.getByTestId('tavern-talk').click();
  const line = page.getByTestId('tavern-line');
  await expect(line.locator('[data-typing="yes"]')).toHaveCount(1);
  const first = (await line.textContent()) ?? '';
  await page.getByTestId('tavern-next').click();
  // Whole now — the same line, not the next.
  await expect(line.locator('[data-typing="yes"]')).toHaveCount(0);
  expect(await line.textContent()).toBe(first);
  await page.getByTestId('tavern-next').click();
  await expect(line).not.toHaveText(first);
});

test('振動: the same switch as the walk’s own — OFF here is OFF there, kept after a restart', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-vibration')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('settings-vibration').click();
  await expect(page.getByTestId('settings-vibration')).toHaveText('OFF');
  expect(await page.evaluate(() => localStorage.getItem('mugen-explore-vibration'))).toBe('off');
  await page.reload();
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-vibration')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('settings-vibration').click();
  expect(await page.evaluate(() => localStorage.getItem('mugen-explore-vibration'))).toBe('on');
});

test('which build: at the very foot of 設定, small — the dev server says dev', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('settings-button').click();
  const stamp = page.getByTestId('settings-build');
  await expect(stamp).toHaveText('build dev');
  // Last in the card, under the admin's row; small.
  const admin = (await page.getByTestId('settings-admin').boundingBox())!;
  const at = (await stamp.boundingBox())!;
  expect(at.y).toBeGreaterThanOrEqual(admin.y + admin.height - 1);
  expect(await stamp.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(11);
});

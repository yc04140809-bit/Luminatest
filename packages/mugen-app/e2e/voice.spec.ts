import { test, expect, type Page } from '@playwright/test';
import { fightUntil } from './battle';
import { throughTheOpening, pastTheIntro } from './opening';
import { placeButton } from './village';

/**
 * THEIR VOICES (2026-10-30 タスクD; ケイオス 21本・主人公 9本, src/platform/voice.ts): each line heard where it
 * belongs, in its order — and a line with no file is silence and nothing else: no error, the fight going on.
 *
 * Every `play()` of a voice is written down from before the page loads (which file, how loud, when), and every
 * error the page throws.
 */
async function listen(page: Page) {
  await page.addInitScript(() => {
    const heard: { file: string; volume: number; at: number }[] = [];
    (window as unknown as { __heard: typeof heard }).__heard = heard;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const file = (this.src.split('/').pop() ?? '').replace(/-[A-Za-z0-9_]{6,}(?=\.mp3)/, '');
      if (this instanceof HTMLAudioElement && /^(v_|voice-dummy)/.test(file)) heard.push({ file, volume: this.volume, at: performance.now() });
      return play.call(this);
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const heard = () => page.evaluate(() => (window as unknown as { __heard: { file: string; volume: number; at: number }[] }).__heard.slice());
  return { errors, heard, files: async () => (await heard()).map((h) => h.file) };
}

async function toTurnOf(page: Page, who: string) {
  for (let i = 0; i < 8; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === who) return;
    await page.getByTestId('pb-cmd-defend').click();
  }
  throw new Error(`never ${who}'s turn`);
}

async function use(page: Page, skill: string) {
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId(`pb-cmd-skill-${skill}`).click();
  const pick = page.locator('[data-testid^="pb-target-enemy-"]').first();
  if (await pick.isVisible().catch(() => false)) await pick.click();
}

test('ケイオス’s 《双極臨界》: 「双極臨界――吸いなさい、全部」 as her cut-in comes in, 「……界核崩壊」 out of the stillness — at the voice volume', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/?preview=party&collapse=1&enemies=3');
  await toTurnOf(page, 'kaos');
  const before = (await ear.heard()).length;
  await use(page, 'soukyoku_rinkai');
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /finisher/.test(f)), { timeout: 15_000 }).toEqual([
    'v_chaos_finisher01.mp3',
    'v_chaos_finisher02.mp3',
  ]);
  const said = (await ear.heard()).slice(before).filter((h) => /finisher/.test(h.file));
  // The second after the pull and its stillness — seconds after the first, never on top of it.
  expect(said[1].at - said[0].at).toBeGreaterThan(3000);
  // The voice's own level (platform/audio.ts: 0.8 until a setting sets it), not the music's 0.35.
  for (const h of said) expect(h.volume).toBeCloseTo(0.8, 2);
  await expect(page.getByTestId('pb-collapse')).toHaveCount(0, { timeout: 20_000 });
  expect(ear.errors).toEqual([]);
});

test('主人公’s 《彼岸花》: 「彼岸花――」 with the cut-in, 「散れ」 as the lilies open; a won fight: 「……終わったか」 then 「ふふっ、うちの勝ちだね」', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/?preview=party&higanbana=1&enemies=2&weak=1');
  await toTurnOf(page, 'hero');
  const before = (await ear.heard()).length;
  await use(page, 'higanbana');
  await expect(page.getByTestId('pb-bloom')).toHaveCount(1, { timeout: 10_000 });
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /finisher/.test(f))).toEqual(['v_hero_finisher01.mp3', 'v_hero_finisher02.mp3']);
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 30_000 });
  await expect.poll(async () => (await ear.files()).filter((f) => /win/.test(f)), { timeout: 8_000 }).toEqual(['v_hero_win01.mp3', 'v_chaos_win01.mp3']);
  expect(ear.errors).toEqual([]);
});

test('a plain blow says its take, in turn — hers 「くらえっ」 then 「そこっ！」; 星癒の羽 says 「セイユノハネ――癒してあげる」', async ({ page }) => {
  test.setTimeout(90_000);
  const ear = await listen(page);
  await page.goto('/?preview=party&hurt=1');
  const hers: string[] = [];
  for (let n = 0; n < 2; n++) {
    await toTurnOf(page, 'kaos');
    const before = (await ear.heard()).length;
    await page.getByTestId('pb-cmd-attack').click();
    await expect.poll(async () => (await ear.files()).slice(before).find((f) => /v_chaos_atk/.test(f)) ?? null).not.toBeNull();
    hers.push((await ear.files()).slice(before).find((f) => /v_chaos_atk/.test(f))!);
  }
  expect(new Set(hers).size).toBe(2);
  await toTurnOf(page, 'kaos');
  const before = (await ear.heard()).length;
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-star_feather').click();
  const ally = page.getByTestId('pb-target-hero');
  if (await ally.isVisible().catch(() => false)) await ally.click();
  await expect.poll(async () => (await ear.files()).slice(before)).toContain('v_chaos_heal01.mp3');
  expect(ear.errors).toEqual([]);
});

test('the opening: her first page says its three in order — 「……あ！」 「起きた？」 「遅いぞ〜？」', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await expect.poll(() => ear.files(), { timeout: 15_000 }).toEqual(['v_op_chaos01.mp3', 'v_op_chaos02.mp3', 'v_op_chaos03.mp3']);
  expect(ear.errors).toEqual([]);
});

test('a line with no file (主人公’s 《瞬断》, not yet recorded): silence, no error, the fight goes on', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/?preview=party');
  await toTurnOf(page, 'hero');
  const before = (await ear.heard()).length;
  await use(page, 'shundan');
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
  expect((await ear.files()).slice(before).filter((f) => /hero_battle_shundan|shundan/.test(f))).toEqual([]);
  expect(ear.errors).toEqual([]);
});

test('DEBUG ?voice=dummy: the stand-in heard in place of her shout', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/?preview=party&collapse=1&voice=dummy');
  await toTurnOf(page, 'kaos');
  const before = (await ear.heard()).length;
  await use(page, 'soukyoku_rinkai');
  await expect.poll(async () => (await ear.files()).slice(before)[0] ?? null, { timeout: 5_000 }).toBe('voice-dummy.mp3');
});

test('ガルド (still 「盗賊」 on screen): 「へっ、やるってのか」 as it opens, then 主人公 「……行くか」; his blows, his hurt, his pinch — in his own voice beside theirs', async ({ page }) => {
  test.setTimeout(240_000);
  const ear = await listen(page);
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  const before = (await ear.heard()).length;
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await expect.poll(async () => (await ear.files()).slice(before).slice(0, 2), { timeout: 10_000 }).toEqual(['v_gard_start01.mp3', 'v_hero_start01.mp3']);
  // The name on screen is what the player knows him as.
  await expect(page.getByTestId('battle-screen')).toContainText('盗賊');
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), { maxTurns: 200 });
  const said = (await ear.files()).slice(before);
  expect(said).toContain('v_gard_atk01.mp3');
  expect(said).toContain('v_gard_dmg01.mp3');
  expect(said).toContain('v_gard_pinch01.mp3');
  expect(said.filter((f) => f === 'v_gard_pinch01.mp3')).toHaveLength(1);
  expect(said).toContain('v_hero_atk01.mp3');
  expect(ear.errors).toEqual([]);
});

async function intoTheVillage(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

test('the bakery: リナ’s welcome as it is walked into (one of three, not the last one again), her thanks back out on the village', async ({ page }) => {
  test.setTimeout(120_000);
  const ear = await listen(page);
  await intoTheVillage(page);
  const welcomes: string[] = [];
  for (let n = 0; n < 2; n++) {
    const before = (await ear.heard()).length;
    await (await placeButton(page, 'bakery-button')).click();
    await expect(page.getByTestId('bakery-screen')).toBeVisible();
    await expect.poll(async () => (await ear.files()).slice(before).find((f) => /v_lina_welcome0[123]/.test(f)) ?? null).not.toBeNull();
    welcomes.push((await ear.files()).slice(before).find((f) => /v_lina_welcome/.test(f))!);
    const inside = (await ear.heard()).length;
    await page.getByTestId('bakery-leave').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
    await expect.poll(async () => (await ear.files()).slice(inside)).toContain('v_lina_thanks01.mp3');
  }
  expect(welcomes[1]).not.toBe(welcomes[0]);
  expect(ear.errors).toEqual([]);
});

test('the tool shop: ミレイ’s welcome, a word of hers when she is touched, her thanks back out', async ({ page }) => {
  test.setTimeout(120_000);
  const ear = await listen(page);
  await intoTheVillage(page);
  const before = (await ear.heard()).length;
  await (await placeButton(page, 'shop-button')).click();
  await expect(page.getByTestId('shop-screen')).toBeVisible();
  await expect.poll(async () => (await ear.files()).slice(before).find((f) => /v_mirei_welcome0[123]/.test(f)) ?? null).not.toBeNull();
  const touched = (await ear.heard()).length;
  await page.getByTestId('shop-keeper-touch').click();
  await expect(page.getByTestId('shop-touch-line')).toBeVisible();
  await expect.poll(async () => (await ear.files()).slice(touched).find((f) => /v_mirei_touch0[12]/.test(f)) ?? null).not.toBeNull();
  const inside = (await ear.heard()).length;
  await page.getByTestId('shop-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect.poll(async () => (await ear.files()).slice(inside)).toContain('v_mirei_thanks01.mp3');
  expect(ear.errors).toEqual([]);
});

test('グレイヴ: his plain blow says its take, and 重撃・豪断 its two — the cut-in, then the blow coming down', async ({ page }) => {
  test.setTimeout(90_000);
  const ear = await listen(page);
  await page.goto('/?preview=party');
  await toTurnOf(page, 'grave');
  let before = (await ear.heard()).length;
  await page.getByTestId('pb-cmd-attack').click();
  await expect.poll(async () => (await ear.files()).slice(before).find((f) => /v_grave_atk0[12]/.test(f)) ?? null).not.toBeNull();
  await toTurnOf(page, 'grave');
  before = (await ear.heard()).length;
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  const pick = page.locator('[data-testid^="pb-target-enemy-"]').first();
  if (await pick.isVisible().catch(() => false)) await pick.click();
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /v_grave_finisher/.test(f)), { timeout: 15_000 }).toEqual([
    'v_grave_finisher01.mp3',
    'v_grave_finisher02.mp3',
  ]);
  expect(ear.errors).toEqual([]);
});

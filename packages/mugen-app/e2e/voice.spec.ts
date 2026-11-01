import { test, expect, type Page } from '@playwright/test';
import { fightUntil, readyToAct, throughTheAwakening } from './battle';
import { throughTheOpening, pastTheIntro, watchTheIntro } from './opening';
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

test('主人公’s 《彼岸花》: 「彼岸花――」 with the cut-in, 「散れ」 as the lilies open; a won fight: her line in the band, 「決まったね！ わたしの応援のおかげ♪」, then his answer 「応援してたか？」', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/?preview=party&higanbana=1&enemies=2&weak=1');
  await toTurnOf(page, 'hero');
  const before = (await ear.heard()).length;
  await use(page, 'higanbana');
  await expect(page.getByTestId('pb-bloom')).toHaveCount(1, { timeout: 10_000 });
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /finisher/.test(f))).toEqual(['v_hero_finisher01.mp3', 'v_hero_finisher02.mp3']);
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 30_000 });
  // Her line in the result's band is what she says (ボイスパック12), and his answer after it (ボイスパック13) — in
  // place of their plain words for a win.
  await expect.poll(async () => (await ear.files()).filter((f) => /win|v_ch1_/.test(f)), { timeout: 8_000 }).toEqual(['v_ch1_chaos152.mp3', 'v_ch1_hero115.mp3']);
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

test('主人公’s 《瞬断》 (ボイスパック13): 「瞬断」 with its cut-in; and 月影の構え says its name as he takes it up', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/?preview=party');
  await toTurnOf(page, 'hero');
  const before = (await ear.heard()).length;
  await use(page, 'shundan');
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /v_ch1_hero/.test(f)), { timeout: 10_000 }).toEqual(['v_ch1_hero110.mp3']);
  await toTurnOf(page, 'hero');
  const guard = (await ear.heard()).length;
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-moon_guard').click();
  await expect.poll(async () => (await ear.files()).slice(guard).filter((f) => /v_ch1_hero/.test(f)), { timeout: 10_000 }).toEqual(['v_ch1_hero111.mp3']);
  expect(ear.errors).toEqual([]);
});

test('主人公 (ボイスパック13): the bakery’s first talk — his three lines heard as they come up, リナ’s welcome before them', async ({ page }) => {
  test.setTimeout(120_000);
  const ear = await listen(page);
  await intoTheVillage(page);
  await (await placeButton(page, 'bakery-button')).click();
  await expect(page.getByTestId('bakery-screen')).toBeVisible();
  const before = (await ear.heard()).length;
  await page.getByTestId('bakery-talk').click();
  for (let i = 0; i < 10; i++) {
    const next = page.getByTestId('bakery-next');
    const done = (await next.textContent()) === 'もどる';
    // Each line long enough for its take to begin.
    await page.waitForTimeout(400);
    await next.click();
    if (done) break;
  }
  await expect
    .poll(async () => (await ear.files()).slice(before).filter((f) => /^v_ch1_hero/.test(f)))
    .toEqual(['063', '064', '065'].map((n) => `v_ch1_hero${n}.mp3`));
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
  // His two words on the road first (ボイスパック18), then the fight's.
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /^v_ch1_gald00[12]/.test(f)), { timeout: 10_000 }).toEqual(['v_ch1_gald001.mp3', 'v_ch1_gald002.mp3']);
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => !/^v_ch1_/.test(f)).slice(0, 2), { timeout: 10_000 }).toEqual(['v_gard_start01.mp3', 'v_hero_start01.mp3']);
  // The name on screen is what the player knows him as.
  await expect(page.getByTestId('battle-screen')).toContainText('盗賊');
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), { maxTurns: 200 });
  const said = (await ear.files()).slice(before);
  expect(said).toContain('v_gard_atk01.mp3');
  expect(said).toContain('v_gard_dmg01.mp3');
  expect(said).toContain('v_gard_pinch01.mp3');
  expect(said.filter((f) => f === 'v_gard_pinch01.mp3')).toHaveLength(1);
  expect(said).toContain('v_hero_atk01.mp3');
  // As he changes (本気・捨て身), each once; beaten, 「……くそ……。」; beside the four, 「……どうするつもりだ……。」.
  expect(said.filter((f) => f === 'v_ch1_gald006.mp3')).toHaveLength(1);
  expect(said.filter((f) => f === 'v_ch1_gald008.mp3')).toHaveLength(1);
  await expect.poll(async () => (await ear.files()).slice(before)).toContain('v_ch1_gald010.mp3');
  await expect.poll(async () => (await ear.files()).slice(before), { timeout: 10_000 }).toContain('v_ch1_gald011.mp3');
  // 見逃す: his three words after it.
  const answered = (await ear.heard()).length;
  await page.getByTestId('choice-SPARE').click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId('choice-result-next')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(300);
    await page.getByTestId('choice-result-next').click();
  }
  await expect
    .poll(async () => (await ear.files()).slice(answered).filter((f) => /^v_ch1_gald/.test(f)))
    .toEqual(['v_ch1_gald012.mp3', 'v_ch1_gald013.mp3', 'v_ch1_gald014.mp3']);
  expect(ear.errors).toEqual([]);
});

test('リナ (ボイスパック19): the shelves — 「いらっしゃい！ 今日はどれにする？」 as they open, her answer to a loaf asked for', async ({ page }) => {
  test.setTimeout(120_000);
  const ear = await listen(page);
  await intoTheVillage(page);
  await (await placeButton(page, 'bakery-button')).click();
  await expect(page.getByTestId('bakery-screen')).toBeVisible();
  const before = (await ear.heard()).length;
  await page.getByTestId('bakery-buy').click();
  await expect.poll(async () => (await ear.files()).slice(before)).toContain('v_ch1_lina010.mp3');
  await page.locator('[data-testid^="bakery-buy-"]:not([data-testid="bakery-buy-close"])').first().click();
  // 「まいどあり！」, or — a new save's purse — 「あ……LUMIがちょっと足りないみたい。」: whichever is shown, in her voice.
  const shown = (await page.getByTestId('bakery-say').textContent()) ?? '';
  const take = shown.includes('まいどあり') ? 'v_ch1_lina013.mp3' : shown.includes('足りない') ? 'v_ch1_lina014.mp3' : 'v_ch1_lina015.mp3';
  await expect.poll(async () => (await ear.files()).slice(before)).toContain(take);
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

test('the tool shop: ミレイ’s welcome, the line shown when she is touched in her voice (ボイスパック15), her thanks back out', async ({ page }) => {
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
  await expect.poll(async () => (await ear.files()).slice(touched).find((f) => /^v_ch1_mirei\d{3}\.mp3$/.test(f)) ?? null).not.toBeNull();
  // One of her touch lines' takes (001〜027), not the two at random.
  const take = (await ear.files()).slice(touched).find((f) => /^v_ch1_mirei/.test(f))!;
  expect(Number(take.slice(11, 14))).toBeLessThanOrEqual(27);
  expect((await ear.files()).slice(touched).some((f) => /v_mirei_touch0[12]/.test(f))).toBe(false);
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
  // Its name first (ボイスパック14), then his line for the cut-in, then the blow coming down.
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /v_grave_finisher|v_ch1_grave074/.test(f)), { timeout: 20_000 }).toEqual([
    'v_ch1_grave074.mp3',
    'v_grave_finisher01.mp3',
    'v_grave_finisher02.mp3',
  ]);
  expect(ear.errors).toEqual([]);
});

test('the tavern: グレイヴ’s 「おう、よく来たな」 as his ordinary greeting begins — not at the first meeting', async ({ page }) => {
  test.setTimeout(120_000);
  const ear = await listen(page);
  await intoTheVillage(page);
  const talkThrough = async () => {
    await page.getByTestId('tavern-talk').click();
    for (let i = 0; i < 40; i++) {
      if (await page.getByTestId('tavern-master-menu').isVisible().catch(() => false)) {
        await page.getByTestId('tavern-master-listen').click();
        continue;
      }
      if (!(await page.getByTestId('tavern-next').isVisible().catch(() => false))) break;
      await page.getByTestId('tavern-next').click();
    }
  };
  // The first time: he introduces himself — no greeting voice.
  let before = (await ear.heard()).length;
  await (await placeButton(page, 'tavern-button')).click();
  await expect(page.getByTestId('tavern-screen')).toBeVisible();
  await talkThrough();
  expect((await ear.files()).slice(before)).not.toContain('v_grave_daily01.mp3');
  await page.getByTestId('tavern-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  // After: his ordinary greeting, and his word with it.
  before = (await ear.heard()).length;
  await (await placeButton(page, 'tavern-button')).click();
  await talkThrough();
  await expect.poll(async () => (await ear.files()).slice(before)).toContain('v_grave_daily01.mp3');
  expect(ear.errors).toEqual([]);
});

test('the tavern (ボイスパック14): his greeting’s first line after 「おう、よく来たな」, not over it; 「どうした。」 over his menu', async ({ page }) => {
  test.setTimeout(120_000);
  const ear = await listen(page);
  await intoTheVillage(page);
  // Met once: his first meeting, read through.
  await (await placeButton(page, 'tavern-button')).click();
  await page.getByTestId('tavern-talk').click();
  for (let i = 0; i < 40 && (await page.getByTestId('tavern-next').isVisible().catch(() => false)); i++) await page.getByTestId('tavern-next').click();
  await page.getByTestId('tavern-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  const before = (await ear.heard()).length;
  await (await placeButton(page, 'tavern-button')).click();
  await page.getByTestId('tavern-talk').click();
  await expect(page.getByTestId('tavern-master-menu')).toBeVisible();
  await expect.poll(async () => (await ear.files()).slice(before)).toContain('v_ch1_grave008.mp3');
  await page.getByTestId('tavern-master-listen').click();
  // Left on its first line: 「おう、よく来たな」, then 「また来たな。そこ空いてるぞ。」.
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /v_grave_daily01|v_ch1_grave006/.test(f)), { timeout: 10_000 }).toEqual([
    'v_grave_daily01.mp3',
    'v_ch1_grave006.mp3',
  ]);
  expect(ear.errors).toEqual([]);
});

test('第1章のケイオス (ボイスパック12) and 主人公 (ボイスパック13): 第0話 from 回想 — each line heard as it comes up, 「？？？」 before she is named too, what he only thinks as well', async ({ page }) => {
  test.setTimeout(90_000);
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
  await page.getByTestId('archive-button').click();
  const before = (await ear.heard()).length;
  await page.getByTestId('recall-OPENING_INTRO').click();
  await watchTheIntro(page);
  // Her 「ん？」 has no take of its own (the opening's says 「ん？ どうしたの？」): silent there.
  await expect
    .poll(async () => (await ear.files()).slice(before).filter((f) => /^v_ch1_chaos/.test(f)))
    .toEqual(['003', '004', '005', '006', '007', '008', '009', '010', '011', '012'].map((n) => `v_ch1_chaos${n}.mp3`));
  // His: every line but his silence 「……。」.
  await expect.poll(async () => (await ear.files()).slice(before).filter((f) => /^v_ch1_hero/.test(f))).toEqual(
    ['001', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '017', '018'].map((n) => `v_ch1_hero${n}.mp3`),
  );
  expect(ear.errors).toEqual([]);
});

test('第1章のケイオス (ボイスパック12): against Gald she wakes — 「……そこまで。」「わたしも、戦えるよ。」 — and her spell says its name, 「星光弾」', async ({ page }) => {
  test.setTimeout(120_000);
  const ear = await listen(page);
  await page.goto('/?preview=battle&enemy=gald');
  const awakening = page.getByTestId('magic-awakening');
  const until = Date.now() + 90_000;
  while (Date.now() < until && !(await awakening.isVisible())) {
    const free = await page.evaluate(() => document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') === 'no');
    if (free) await page.getByTestId('bp-attack').click().catch(() => {});
    else await page.waitForTimeout(60);
  }
  expect(await throughTheAwakening(page)).toBe(true);
  await expect.poll(async () => (await ear.files()).filter((f) => /^v_ch1_/.test(f))).toEqual(['v_ch1_chaos100.mp3', 'v_ch1_chaos101.mp3']);
  await readyToAct(page);
  await page.getByTestId('bp-magic').click();
  await page.getByTestId('magic-starlight_bolt').click();
  await expect.poll(async () => (await ear.files()).filter((f) => /^v_ch1_/.test(f)), { timeout: 10_000 }).toContain('v_ch1_chaos145.mp3');
  expect(ear.errors).toEqual([]);
});

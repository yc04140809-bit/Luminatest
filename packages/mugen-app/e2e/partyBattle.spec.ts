import { test, expect, type Page } from '@playwright/test';

/**
 * 3人戦闘 (戦闘方式 B, 作者指示 2026-10-12): 主人公・ケイオス・グレイヴ, each
 * their own HP and turn; Kaos her own MP; the order by speed; the creature
 * strikes one of them; a heal aimed at one. Through the debug door
 * (`?preview=party`), which reads and writes nothing of the world. The
 * fights the game already has are untouched (their own specs).
 */

const screen = (page: Page) => page.getByTestId('pb-screen');
const hp = async (page: Page, id: string) => Number(await page.getByTestId(`pb-member-${id}`).getAttribute('data-hp'));
const enemyHp = async (page: Page) => Number(await page.getByTestId('pb-enemy-hp').getAttribute('data-hp'));
const mp = async (page: Page) => Number(await page.getByTestId('pb-member-kaos-mp').getAttribute('data-mp'));
const turnOf = (page: Page, id: string) => expect(screen(page)).toHaveAttribute('data-actor', id, { timeout: 8000 });

async function onScreen(page: Page, id: string) {
  const box = (await page.getByTestId(id).boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box, id).not.toBeNull();
  expect(box.x, id).toBeGreaterThanOrEqual(-1);
  expect(box.y, id).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, id).toBeLessThanOrEqual(vp.width + 1);
  expect(box.y + box.height, id).toBeLessThanOrEqual(vp.height + 1);
}

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`at ${size.width}×${size.height}: the three HP, who acts, Kaos's MP, the TURN ORDER, the creature's HP and the commands — all on screen at once`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/?preview=party');
    await expect(screen(page)).toBeVisible();
    // Kaos is fastest: hers is the first turn.
    await turnOf(page, 'kaos');
    for (const id of [
      'pb-member-hero',
      'pb-member-kaos',
      'pb-member-grave',
      'pb-member-kaos-mp',
      'pb-acting',
      'pb-turn-order',
      'pb-enemy-plate',
      'pb-cmd-attack',
      'pb-cmd-skills',
      'pb-cmd-magic',
      'pb-cmd-defend',
      'pb-auto',
      'pb-speed',
      'pb-break-gauge',
    ]) {
      await expect(page.getByTestId(id)).toBeVisible();
      await onScreen(page, id);
    }
    await expect(page.getByTestId('pb-member-hero')).toContainText('100/100');
    await expect(page.getByTestId('pb-member-kaos')).toContainText('100/100');
    await expect(page.getByTestId('pb-member-grave')).toContainText('180/180');
    await expect(page.getByTestId('pb-member-kaos-mp')).toHaveText('MP 48/48');
    // MP only for the one who has it.
    await expect(page.getByTestId('pb-member-hero-mp')).toHaveCount(0);
    await expect(page.getByTestId('pb-member-grave-mp')).toHaveCount(0);
    // The one acting marked in the party and first in the order.
    await expect(page.getByTestId('pb-member-kaos')).toHaveAttribute('data-acting', 'yes');
    await expect(page.getByTestId('pb-turn-slot-0')).toHaveAttribute('data-actor', 'kaos');
    await expect(page.getByTestId('pb-turn-slot-1')).toHaveAttribute('data-actor', 'enemy');
    await expect(page.getByTestId('pb-turn-slot-2')).toHaveAttribute('data-actor', 'hero');
    await expect(page.getByTestId('pb-turn-slot-3')).toHaveAttribute('data-actor', 'grave');
    // All three figures on the field.
    for (const id of ['hero', 'kaos', 'grave']) await expect(page.getByTestId(`pb-figure-${id}`)).toBeVisible();
  });
}

test('each their own turn: Kaos casts (her MP), the creature strikes ONE of them, the hero\'s 《瞬断》, Grave\'s swing', async ({ page }) => {
  await page.goto('/?preview=party');
  await turnOf(page, 'kaos');
  const before = await enemyHp(page);
  await page.getByTestId('pb-cmd-magic').click();
  await page.getByTestId('pb-magic-starlight_bolt').click();
  await expect.poll(() => enemyHp(page)).toBeLessThan(before);
  expect(await mp(page)).toBe(42);
  // The creature: one of them is struck, no more — unless it used its sweep (旋尾薙ぎ, about one turn
  // in eight: valsheelBattle.ts), which strikes all three and says so.
  await turnOf(page, 'enemy');
  await turnOf(page, 'hero');
  const struck = (await Promise.all(['hero', 'kaos', 'grave'].map((id) => hp(page, id)))).filter((v, i) => v < [100, 100, 180][i]);
  if (struck.length === 3) await expect(page.getByTestId('pb-log')).toContainText('旋尾薙ぎ');
  else expect(struck).toHaveLength(1);
  // The hero: 《瞬断》, from スキル in the cross (no magic: 魔法 is there, closed).
  await expect(page.getByTestId('pb-cmd-magic')).toBeDisabled();
  const beforeHero = await enemyHp(page);
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-shundan').click();
  await expect.poll(() => enemyHp(page)).toBeLessThan(beforeHero);
  // Grave: a swing.
  await turnOf(page, 'grave');
  const beforeGrave = await enemyHp(page);
  await page.getByTestId('pb-cmd-attack').click();
  await expect.poll(() => enemyHp(page)).toBeLessThan(beforeGrave);
  // A new round: Kaos first again.
  await turnOf(page, 'kaos');
});

test('a heal is aimed: 癒しの光 → 「誰に？」 → グレイヴ; もどる goes back a step', async ({ page }) => {
  await page.goto('/?preview=party&hurt=1');
  await turnOf(page, 'kaos');
  expect(await hp(page, 'grave')).toBe(60);
  await page.getByTestId('pb-cmd-magic').click();
  await page.getByTestId('pb-magic-mending_light').click();
  await expect(page.getByText('誰に？')).toBeVisible();
  await page.getByTestId('pb-cmd-back').click();
  await expect(page.getByTestId('pb-magic-mending_light')).toBeVisible();
  await page.getByTestId('pb-magic-mending_light').click();
  await page.getByTestId('pb-target-grave').click();
  await expect.poll(() => hp(page, 'grave')).toBe(82);
  expect(await mp(page)).toBe(36);
  expect(await hp(page, 'hero')).toBe(40);
});

test('AUTO at ×2 fights it to the end, and the end is shown', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?preview=party&enemy=moss_rabbit');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-speed').click();
  await page.getByTestId('pb-auto').click();
  await expect(page.getByTestId('pb-result')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY');
  await page.getByTestId('pb-result-next').click();
  await expect(page.getByTestId('pb-preview-ended')).toBeVisible();
});

// 通常スキル3種 + BREAK (2026-10-12). The preview's creature is ヴァルシール
// (第1形態, provisional numbers); `&footing=4` makes its footing short enough
// for one 重撃・豪断 to break it.
const memberHp = hp;
const gauge = (page: Page) => page.getByTestId('pb-break-gauge');

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`at ${size.width}×${size.height}: 星癒の羽 and 月影の構え show under the name; 重撃・豪断 → BREAK!! — the gauge, 「BREAK中」, 防御DOWN, two lost turns, then it stands`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(size);
    await page.goto('/?preview=party&hurt=1&footing=4');
    await turnOf(page, 'kaos');
    await expect(page.getByTestId('pb-enemy-plate')).toContainText('ヴァルシール');
    await expect(gauge(page)).toHaveAttribute('data-max', '4');
    await expect(gauge(page)).toHaveAttribute('data-current', '4');
    // Kaos: 星癒の羽 is in her スキル (a skill: no MP), aimed like a heal.
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-tech-star_feather').click();
    await expect(page.getByText('誰に？')).toBeVisible();
    await page.getByTestId('pb-target-hero').click();
    expect(await mp(page)).toBe(48);
    await expect(page.getByTestId('pb-status-hero-regen')).toHaveText('星癒 3T');
    await onScreen(page, 'pb-status-hero-regen');
    // The hero: the same cross, his スキル (《瞬断》, 月影の構え); at the end of his turn the feathers heal him (+20).
    await turnOf(page, 'hero');
    await page.getByTestId('pb-cmd-skills').click();
    for (const id of ['pb-cmd-attack', 'pb-cmd-skill-shundan', 'pb-cmd-tech-moon_guard', 'pb-cmd-defend']) await onScreen(page, id);
    const before = await memberHp(page, 'hero');
    await page.getByTestId('pb-cmd-tech-moon_guard').click();
    await expect.poll(() => memberHp(page, 'hero')).toBe(Math.min(100, before + 20));
    await expect(page.getByTestId('pb-float-regen-hero')).toHaveText('+20 HP');
    await expect(page.getByTestId('pb-status-hero-guard')).toHaveText('月影 2T');
    // 月影の構え draws the creature's single blows to him (注目).
    await expect(page.getByTestId('pb-member-hero')).toHaveAttribute('data-taunt', 'yes');
    await expect(page.getByTestId('pb-member-kaos')).toHaveAttribute('data-taunt', 'no');
    await expect(page.getByTestId('pb-status-hero-regen')).toHaveText('星癒 2T');
    await expect(page.getByTestId('pb-tech-name')).toHaveText('月影の構え');
    // Grave: 重撃・豪断 breaks it.
    await turnOf(page, 'grave');
    await expect(page.getByTestId('pb-cmd-magic')).toBeDisabled();
    await page.getByTestId('pb-cmd-skills').click();
    await onScreen(page, 'pb-cmd-tech-goudan');
    const hpBefore = await enemyHp(page);
    await page.getByTestId('pb-cmd-tech-goudan').click();
    await expect(screen(page)).toHaveAttribute('data-broken', 'yes');
    expect(await enemyHp(page)).toBeLessThan(hpBefore);
    await expect(page.getByTestId('pb-break-flash')).toHaveText('BREAK!!');
    await expect(page.getByTestId('pb-tech-name')).toHaveText('重撃・豪断');
    await expect(page.getByTestId('pb-enemy-broken')).toHaveText('BREAK中');
    await expect(page.getByTestId('pb-break-badge')).toHaveText('防御DOWN 残り2T');
    await onScreen(page, 'pb-break-badge');
    await onScreen(page, 'pb-enemy-broken');
    // Its next turn is lost: nobody is struck.
    await turnOf(page, 'kaos');
    await page.getByTestId('pb-cmd-defend').click();
    const hps = await Promise.all(['hero', 'kaos', 'grave'].map((id) => memberHp(page, id)));
    await turnOf(page, 'hero');
    await expect(page.getByTestId('pb-log')).toContainText('BREAK中');
    await expect(page.getByTestId('pb-break-badge')).toHaveText('防御DOWN 残り1T');
    expect(await Promise.all(['hero', 'kaos', 'grave'].map((id) => memberHp(page, id)))).toEqual(hps);
    // While broken it takes more (1.4×); then its second lost turn, and it stands, its footing whole.
    await page.getByTestId('pb-cmd-defend').click();
    await turnOf(page, 'grave');
    await page.getByTestId('pb-cmd-defend').click();
    await turnOf(page, 'kaos');
    await page.getByTestId('pb-cmd-defend').click();
    await turnOf(page, 'hero');
    await expect(screen(page)).toHaveAttribute('data-broken', 'no');
    await expect(gauge(page)).toHaveAttribute('data-current', '4');
    await expect(page.getByTestId('pb-break-badge')).toHaveCount(0);
  });
}

// LOUDER (作者 実機 2026-10-24: 「ダメージ表記とBreak表示ももっと目立たせて」「画面全体をガラスを割ったみたいな
// 表現」「COMBO表示もあった方がBreakして俺のターンが分かっていい」): a cut-in move's speed lines and its big
// number; COMBO climbing with the party's blows (《瞬断》 two, 重撃・豪断 two), on through the creature's lost turns,
// gone when it strikes; BREAK breaking the whole screen like glass.
for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`at ${size.width}×${size.height}: a cut-in move's speed lines and big number; COMBO through a BREAK; the screen breaks like glass`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(size);
    await page.goto('/?preview=party&hurt=1&footing=4');
    // The order: Kaos, the creature, the hero, Grave. Kaos guards; it strikes.
    await turnOf(page, 'kaos');
    await page.getByTestId('pb-cmd-defend').click();
    // The hero's 《瞬断》 (a cut-in): speed lines; two quick cuts (作者 2026-10-24) — two numbers adding up to
    // the one amount the fight dealt, the last the bigger — and COMBO two.
    await turnOf(page, 'hero');
    const hpBefore = await enemyHp(page);
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-skill-shundan').click();
    await expect(page.getByTestId('pb-focus-lines')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByTestId('pb-foe').getByTestId('pb-float')).toHaveClass(/finisher/);
    await expect(page.getByTestId('pb-foe').getByTestId('pb-float-cut')).toHaveCount(1);
    await expect(page.getByTestId('pb-combo')).toHaveAttribute('data-hits', '2');
    const cuts = (await page.getByTestId('pb-foe').locator('[data-testid="pb-float-cut"], [data-testid="pb-float"]').allTextContents()).map(Number);
    expect(cuts).toHaveLength(2);
    expect(cuts.reduce((a, b) => a + b, 0)).toBe(hpBefore - (await enemyHp(page)));
    expect(cuts[1]).toBeGreaterThanOrEqual(cuts[0]);
    // Grave's 重撃・豪断: two blows (4 COMBO), and BREAK — the glass, over the whole screen.
    await turnOf(page, 'grave');
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-tech-goudan').click();
    await expect(page.getByTestId('pb-shatter')).toBeVisible({ timeout: 15_000 });
    const glass = (await page.getByTestId('pb-shatter').boundingBox())!;
    expect(glass.width).toBeGreaterThanOrEqual(size.width - 1);
    expect(glass.height).toBeGreaterThanOrEqual(size.height - 1);
    await expect(page.getByTestId('pb-break-flash')).toHaveText('BREAK!!');
    await expect(page.getByTestId('pb-combo')).toHaveAttribute('data-hits', '4');
    await expect(page.getByTestId('pb-combo')).toHaveAttribute('data-chain', 'yes');
    await onScreen(page, 'pb-combo');
    const damage = Number(((await page.getByTestId('pb-combo-damage').textContent()) ?? '').replace(/\D/g, ''));
    expect(damage).toBeGreaterThan(0);
    // Kaos's attack: 5 — no speed lines, an ordinary number.
    await turnOf(page, 'kaos');
    await page.getByTestId('pb-cmd-attack').click();
    await expect(page.getByTestId('pb-combo')).toHaveAttribute('data-hits', '5');
    await expect(page.getByTestId('pb-focus-lines')).toHaveCount(0);
    await expect(page.getByTestId('pb-foe').getByTestId('pb-float')).not.toHaveClass(/finisher/);
    // Its turn is lost (「BREAK中、動けない」): the count goes on, and climbs again.
    await turnOf(page, 'hero');
    await expect(page.getByTestId('pb-log')).toContainText('BREAK中');
    await expect(page.getByTestId('pb-combo')).toHaveAttribute('data-hits', '5');
    await page.getByTestId('pb-cmd-attack').click();
    await expect(page.getByTestId('pb-combo')).toHaveAttribute('data-hits', '6');
    // It stands again and strikes: the count is gone.
    for (let i = 0; i < 12 && (await page.getByTestId('pb-combo').count()) > 0; i++) {
      await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
      if ((await page.getByTestId('pb-combo').count()) === 0) break;
      await page.getByTestId('pb-cmd-defend').click();
    }
    await expect(page.getByTestId('pb-combo')).toHaveCount(0);
  });
}

// 《彼岸花》 (作者 2026-10-24「主人公必殺技『彼岸花』＋BREAK / COMBO戦術拡張」): his finisher — three strikes of its own,
// a number at each adding up to what it took, COMBO three, the dark and the lily, and the creature SLOWED:
// on its plate, and behind the hero and Grave in the TURN ORDER.
for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`at ${size.width}×${size.height}: 《彼岸花》 — three numbers, COMBO three, the dark and the lily, SLOWED (on its plate and in the TURN ORDER)`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(size);
    await page.goto('/?preview=party&higanbana=1&footing=40');
    // The order: Kaos, the creature, the hero, Grave. Kaos guards; it strikes; then him.
    await turnOf(page, 'kaos');
    await page.getByTestId('pb-cmd-defend').click();
    await turnOf(page, 'hero');
    await page.getByTestId('pb-cmd-skills').click();
    // His finisher first among his skills; 《瞬断》 still there.
    await expect(page.getByTestId('pb-list').locator('[data-testid^="pb-cmd-skill-"]').first()).toHaveAttribute('data-testid', 'pb-cmd-skill-higanbana');
    await expect(page.getByTestId('pb-cmd-skill-shundan')).toBeVisible();
    const hpBefore = await enemyHp(page);
    await page.getByTestId('pb-cmd-skill-higanbana').click();
    // The finisher's long cut-in.
    await expect(page.getByTestId('cut-in')).toHaveAttribute('data-tier', 'FINISHER');
    await expect(page.getByTestId('pb-bloom')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByTestId('pb-foe').getByTestId('pb-float-cut')).toHaveCount(2, { timeout: 10_000 });
    await expect(page.getByTestId('pb-foe').getByTestId('pb-float')).toHaveCount(1);
    const nums = (await page.getByTestId('pb-foe').locator('[data-testid="pb-float-cut"], [data-testid="pb-float"]').allTextContents()).map(Number);
    expect(nums).toHaveLength(3);
    expect(nums.reduce((a, b) => a + b, 0)).toBe(hpBefore - (await enemyHp(page)));
    await expect(page.getByTestId('pb-combo')).toHaveAttribute('data-hits', '3');
    await expect(page.getByTestId('pb-log')).toContainText('速度DOWN');
    await expect(page.getByTestId('pb-slow-badge')).toHaveText('速度DOWN 残り3');
    await onScreen(page, 'pb-slow-badge');
    // Its words beside the giant's narrow plate, never widening it (作者 実機 2026-10-25: 縦型ステータスバーが大きくて邪魔).
    const plate = await box(page, 'pb-enemy-plate');
    expect(plate.width).toBeLessThan(size.width * 0.06);
    expect((await box(page, 'pb-slow-badge')).x).toBeGreaterThanOrEqual(plate.x + plate.width);
    await expect(page.getByTestId('pb-foe').getByTestId('pb-float-slow')).toHaveText('SPEED DOWN');
    // Slowed: in the coming turns it stands after the hero and Grave (as it did not: Kaos, it, him, Grave).
    const ahead = await page.getByTestId('pb-turn-order').locator('[data-actor]').evaluateAll((els) => els.map((e) => e.getAttribute('data-actor')));
    const next = ahead.slice(ahead.indexOf('kaos'));
    expect(next.indexOf('enemy')).toBeGreaterThan(next.indexOf('hero'));
    expect(next.indexOf('enemy')).toBeGreaterThan(next.indexOf('grave'));
  });
}

// 最終仕様 (作者 2026-10-24): at all of them — three cuts on each, each one's own numbers, COMBO nine, every one slowed.
test('《彼岸花》 at three creatures: three numbers on each adding up to what each lost, COMBO nine, the ground split under each, every one slowed', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?preview=party&higanbana=1&enemies=3&footing=40');
  for (let i = 0; i < 6 && (await screen(page).getAttribute('data-actor')) !== 'hero'; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await screen(page).getAttribute('data-actor')) === 'hero') break;
    await page.getByTestId('pb-cmd-defend').click();
    await page.waitForTimeout(300);
  }
  await turnOf(page, 'hero');
  const ids = ['enemy', 'enemy-2', 'enemy-3'];
  const hpOf = (id: string) => page.getByTestId(`pb-foe-${id}`).getAttribute('data-hp').then(Number);
  const before = await Promise.all(ids.map(hpOf));
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-higanbana').click();
  await page.getByTestId('pb-foe-enemy-2').click();
  await expect(page.getByTestId('pb-bloom')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByTestId('pb-bloom')).toHaveAttribute('data-spots', '3');
  await expect(page.getByTestId('pb-crack').locator('g')).toHaveCount(3);
  for (const [i, id] of ids.entries()) {
    const foe = page.getByTestId(`pb-foe-${id}`);
    await expect(foe.locator('[data-testid="pb-float-cut"], [data-testid="pb-float"]')).toHaveCount(3, { timeout: 10_000 });
    const nums = (await foe.locator('[data-testid="pb-float-cut"], [data-testid="pb-float"]').allTextContents()).map(Number);
    expect(nums.reduce((a, b) => a + b, 0)).toBe(before[i] - (await hpOf(id)));
    // 仕上げ §7–10: the first two cuts' flow away, small; the third's stays, in front. With several struck
    // (ブラッシュアップ §3) the first two are a quick faint flick, and the third reads far the largest.
    await expect(foe.getByTestId('pb-float-cut').first()).toHaveClass(/\bflow\b/);
    await expect(foe.getByTestId('pb-float-cut').first()).toHaveClass(/\bmany\b/);
    await expect(foe.getByTestId('pb-float')).toHaveClass(/\bstay\b/);
    const px = (l: ReturnType<typeof foe.getByTestId>) => l.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(await px(foe.getByTestId('pb-float'))).toBeGreaterThan((await px(foe.getByTestId('pb-float-cut').first())) * 1.5);
    await expect(foe.getByTestId('pb-float-slow')).toHaveText('SPEED DOWN');
  }
  await expect(page.getByTestId('pb-combo')).toHaveAttribute('data-hits', '9');
  await expect(page.getByTestId('pb-log')).toContainText('の動きが鈍った。（速度DOWN）');
  // The next turn comes once he is home.
  await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
});

// AUTO (§16–18): not the moment it is ready — against ヴァルシール, standing whole, his first turn is 《瞬断》; it
// waits for BREAK (or the edge of it), and then it comes.
test('AUTO keeps 《彼岸花》 for BREAK: his first turn against ヴァルシール is 《瞬断》, and 《彼岸花》 comes later in the fight', async ({ page }) => {
  test.setTimeout(150_000);
  // Every move's name as it flashes, in order.
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __names: string[] }).__names = seen;
    new MutationObserver(() => {
      const el = document.querySelector('[data-testid="pb-tech-name"]');
      const t = el?.textContent ?? '';
      if (t && seen[seen.length - 1] !== t) seen.push(t);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.goto('/?preview=party&higanbana=1');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-speed').click();
  await page.getByTestId('pb-auto').click();
  const names = () => page.evaluate(() => (window as unknown as { __names: string[] }).__names.filter((n) => n === '瞬断' || n === '彼岸花'));
  await expect.poll(names, { timeout: 30_000 }).toContain('瞬断');
  expect((await names())[0]).toBe('瞬断');
  await expect.poll(names, { timeout: 110_000 }).toContain('彼岸花');
});

test('《彼岸花》 brought it down part-way: the numbers that landed, the fight won — nothing breaks', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?preview=party&higanbana=1&weak=1&enemies=2');
  for (let i = 0; i < 6 && (await screen(page).getAttribute('data-actor')) !== 'hero'; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await screen(page).getAttribute('data-actor')) === 'hero') break;
    await page.getByTestId('pb-cmd-defend').click();
    await page.waitForTimeout(300);
  }
  await turnOf(page, 'hero');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-higanbana').click();
  await page.getByTestId('pb-foe-enemy').click().catch(() => {});
  await expect(page.getByTestId('pb-bloom')).toHaveCount(1, { timeout: 15_000 });
  // Whatever fell, the fight goes on — the next turn comes — or (at all of them: both may fall) it is won.
  await expect(page.getByTestId('pb-result').or(page.locator('[data-testid="pb-commands"][data-locked="no"]'))).toBeVisible({ timeout: 15_000 });
});

test('AUTO at ×2 against ヴァルシール: the techniques are used, BREAK comes, and it is won', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?preview=party&hurt=1');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-speed').click();
  await page.getByTestId('pb-auto').click();
  // A technique is used (グレイヴ's 重撃・豪断 on his first turn, at the least; who 星癒の羽 goes to
  // depends on the dice under these blows — its rule is the unit tests').
  await expect(page.getByTestId('pb-tech-name')).toBeVisible({ timeout: 30_000 });
  await expect(screen(page)).toHaveAttribute('data-broken', 'yes', { timeout: 60_000 });
  await expect(page.getByTestId('pb-result')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY');
});

// THE LAYOUT, FIXED (作者指示 2026-10-12, 固定方針): the creature's name, HP
// and BREAK top left; the TURN ORDER and the place top centre; the party's
// cards top right; WORLD MEMORY bottom left; the command cross bottom right.
// The party right, in a CROSS of four fixed places on the ground — FRONT
// グレイヴ toward the creature and BACK ケイオス toward the party's edge on one
// ground line, the middle column between them: MID_LOWER 主人公 nearest the
// camera (lowest, largest), MID_UPPER up the path (empty: a mark on the
// ground) — every one standing on the ground with a shadow. A GIANT drawn bigger than
// the screen, the party a little smaller (not tiny); the UI exactly where it
// is in a normal fight.
type Box = { x: number; y: number; width: number; height: number };
const box = async (page: Page, id: string) => (await page.getByTestId(id).boundingBox()) as Box;
const apart = (a: Box, b: Box) => a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1 || a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1;
const feet = (b: Box) => b.y + b.height;

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`at ${size.width}×${size.height}: the fixed layout — plate top left, turn order top centre, party top right, WORLD MEMORY bottom left, command cross bottom right; the party a cross on the ground; a giant big; the same UI`, async ({ page }) => {
    await page.setViewportSize(size);
    const seen: Record<string, Record<string, Box>> = {};
    for (const [query, scale] of [
      ['enemy=moss_rabbit', 'NORMAL'],
      ['enemy=sekiryuga', 'NORMAL'],
      ['', 'GIANT'],
    ] as const) {
      await page.goto(`/?preview=party${query ? `&${query}` : ''}`);
      await turnOf(page, 'kaos');
      await expect(screen(page)).toHaveAttribute('data-scale', scale);
      await page.waitForTimeout(300);
      // The four places: who is in which, and the empty one marked on the ground.
      await expect(page.getByTestId('pb-figure-grave')).toHaveAttribute('data-slot', 'FRONT');
      await expect(page.getByTestId('pb-figure-hero')).toHaveAttribute('data-slot', 'MID_LOWER');
      await expect(page.getByTestId('pb-figure-kaos')).toHaveAttribute('data-slot', 'BACK');
      await expect(page.getByTestId('pb-slot-empty-MID_UPPER')).toHaveCount(1);
      for (const id of ['hero', 'kaos', 'grave']) await expect(page.getByTestId(`pb-figure-${id}`).locator('.pb-shadow')).toHaveCount(1);
      const ids = ['pb-figure-hero', 'pb-figure-kaos', 'pb-figure-grave', 'pb-enemy-art', 'pb-commands', 'pb-members', 'pb-enemy-plate', 'pb-turn-order', 'bx-world-memory'];
      const b = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await box(page, id)] as const)));
      seen[`${scale}:${query}`] = b;
      const [hero, kaos, grave] = [b['pb-figure-hero'], b['pb-figure-kaos'], b['pb-figure-grave']];
      const empty = await box(page, 'pb-slot-empty-MID_UPPER');
      // Where the feet are (partyStage FOOT_AT: グレイヴ 0.6, 主人公 0.5, ケイオス 0.52 of the drawing).
      const footX = { grave: grave.x + grave.width * 0.6, hero: hero.x + hero.width * 0.5, kaos: kaos.x + kaos.width * 0.52 };
      const emptyMid = { x: empty.x + empty.width / 2, y: empty.y + empty.height / 2 };
      // The cross: FRONT and BACK on one ground line either side; the middle column between them.
      expect(Math.abs(feet(grave) - feet(kaos))).toBeLessThan(size.height * 0.03);
      expect(footX.grave).toBeLessThan(footX.hero - size.width * 0.08);
      expect(footX.kaos).toBeGreaterThan(footX.hero + size.width * 0.08);
      expect(Math.abs(emptyMid.x - footX.hero)).toBeLessThan(size.width * 0.02);
      // The middle column: MID_LOWER nearest the camera (below the line), MID_UPPER up the path (above it).
      expect(feet(hero)).toBeGreaterThan(feet(grave) + size.height * 0.1);
      expect(emptyMid.y).toBeLessThan(feet(grave) - size.height * 0.1);
      // Nearer is larger: the hero (nearest) taller than グレイヴ on the line; ケイオス her own size on it.
      expect(hero.height).toBeGreaterThan(grave.height * 1.05);
      expect(kaos.height / grave.height).toBeGreaterThan(0.8);
      expect(kaos.height / grave.height).toBeLessThan(0.95);
      // On the ground: every one's feet in the lower part of the screen, not in the air.
      for (const who of [hero, kaos, grave]) expect(feet(who)).toBeGreaterThan(size.height * 0.6);
      // The UI's places.
      const plate = b['pb-enemy-plate'];
      expect(plate.x).toBeLessThan(size.width * 0.05);
      expect(plate.y).toBeLessThan(size.height * 0.05);
      const turn = b['pb-turn-order'];
      expect(Math.abs(turn.x + turn.width / 2 - size.width / 2)).toBeLessThan(size.width * 0.08);
      const cards = b['pb-members'];
      expect(cards.x + cards.width).toBeGreaterThan(size.width * 0.96);
      expect(cards.y).toBeLessThan(size.height * 0.05);
      const cross = b['pb-commands'];
      expect(cross.x + cross.width).toBeGreaterThan(size.width * 0.96);
      expect(cross.y + cross.height).toBeGreaterThan(size.height * 0.95);
      const memory = b['bx-world-memory'];
      expect(memory.x).toBeLessThan(size.width * 0.05);
      expect(memory.y + memory.height).toBeGreaterThan(size.height * 0.95);
      // The party clear of the cross and of the cards.
      for (const who of [hero, kaos, grave]) {
        expect(apart(who, cross)).toBe(true);
        expect(apart(who, cards)).toBe(true);
      }
      for (const id of ['pb-commands', 'pb-members', 'pb-enemy-plate', 'pb-break-gauge', 'bx-world-memory']) await onScreen(page, id);
    }
    // The same UI in every one of them: nothing moved for the giant.
    const normal = seen['NORMAL:enemy=sekiryuga'];
    const giant = seen['GIANT:'];
    for (const id of ['pb-commands', 'pb-members', 'pb-enemy-plate', 'pb-turn-order', 'bx-world-memory']) {
      expect(Math.abs(giant[id].x - normal[id].x), id).toBeLessThan(2);
      expect(Math.abs(giant[id].y - normal[id].y), id).toBeLessThan(2);
    }
    // The giant: taller than the screen; the party a little smaller, not tiny.
    expect(giant['pb-enemy-art'].height).toBeGreaterThan(size.height);
    const ratio = giant['pb-figure-grave'].height / normal['pb-figure-grave'].height;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(0.9);
  });
}

test('WORLD MEMORY bottom left in the party fight too, AUTO and ×2 beside it, the creature\'s plate top left', async ({ page }) => {
  for (const size of [
    { width: 640, height: 300 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/?preview=party');
    await turnOf(page, 'kaos');
    const memory = await box(page, 'bx-world-memory');
    expect(memory.y + memory.height).toBeGreaterThan(size.height * 0.9);
    expect(memory.x + memory.width).toBeLessThan(size.width * 0.3);
    for (const id of ['pb-auto', 'pb-speed', 'pb-members', 'pb-commands']) expect(apart(memory, await box(page, id)), id).toBe(true);
    await onScreen(page, 'bx-world-memory');
    const plate = await box(page, 'pb-enemy-plate');
    expect(plate.y).toBeLessThan(size.height * 0.1);
    expect(plate.x).toBeLessThan(size.width * 0.1);
  }
});

// SEVERAL CREATURES (2026-10-12, 複数敵): two and three, through the debug door
// (`&enemies=2|3`). Each its own place on the left (a diagonal into the
// ground), its own HP and footing, its own turn; 攻撃 asks 「どれを？」; one down
// and the fight goes on.
const foeBox = (page: Page, id: string) => box(page, `pb-foe-${id}`);
const foeHp = async (page: Page, id: string) => Number(await page.getByTestId(`pb-foe-${id}`).getAttribute('data-hp'));

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`at ${size.width}×${size.height}: two and three creatures stand on the left in a diagonal, each its own HP, footing and turn; the UI where it always is`, async ({ page }) => {
    await page.setViewportSize(size);
    for (const n of [2, 3]) {
      await page.goto(`/?preview=party&enemies=${n}`);
      await turnOf(page, 'kaos');
      await page.waitForTimeout(300);
      const ids = ['enemy', 'enemy-2', 'enemy-3'].slice(0, n);
      const boxes = await Promise.all(ids.map((id) => foeBox(page, id)));
      // On the left, in front of the party; each one's own place: no two at the same ground line or the same spot.
      const hero = await box(page, 'pb-figure-hero');
      for (const b of boxes) expect(b.x + b.width / 2).toBeLessThan(hero.x);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          expect(Math.abs(feet(boxes[i]) - feet(boxes[j])), `${ids[i]} / ${ids[j]}`).toBeGreaterThan(size.height * 0.08);
        }
      }
      // The first is the nearest (lowest, the largest).
      for (const b of boxes.slice(1)) {
        expect(feet(boxes[0])).toBeGreaterThan(feet(b));
        expect(boxes[0].height).toBeGreaterThan(b.height);
      }
      // Each its own small HP; each its own face in the TURN ORDER.
      for (const id of ids) await expect(page.getByTestId(`pb-foe-${id}`).getByTestId('pb-foe-mini')).toBeVisible();
      const turnActors = await page.locator('[data-testid^="pb-turn-slot-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-actor')));
      for (const id of ids.slice(0, 2)) expect(turnActors).toContain(id);
      // The UI where it always is, clear of the creatures.
      for (const id of ['pb-enemy-plate', 'pb-commands', 'pb-members', 'bx-world-memory', 'pb-turn-order']) await onScreen(page, id);
      const memory = await box(page, 'bx-world-memory');
      const plate = await box(page, 'pb-enemy-plate');
      for (const b of boxes) {
        expect(apart(b, memory)).toBe(true);
        expect(apart(b, plate)).toBe(true);
      }
    }
  });
}

test('攻撃 → 「どれを？」 → the second creature: only it is hurt; the plate shows it; もどる goes back', async ({ page }) => {
  await page.goto('/?preview=party&enemies=2');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-defend').click();
  await turnOf(page, 'hero');
  const a = await foeHp(page, 'enemy');
  const b = await foeHp(page, 'enemy-2');
  await page.getByTestId('pb-cmd-attack').click();
  await expect(page.getByText('どれを？')).toBeVisible();
  await page.getByTestId('pb-cmd-back').click();
  await expect(page.getByText('どれを？')).toHaveCount(0);
  await page.getByTestId('pb-cmd-attack').click();
  await page.getByTestId('pb-target-enemy-enemy-2').click();
  await expect.poll(() => foeHp(page, 'enemy-2')).toBeLessThan(b);
  expect(await foeHp(page, 'enemy')).toBe(a);
  await expect(page.getByTestId('pb-enemy-plate')).toHaveAttribute('data-focus', 'enemy-2');
  await expect(page.getByTestId('pb-enemy-plate')).toContainText('コケマル');
  // Tapping a creature on the field also aims (Grave's 重撃・豪断 at the first).
  await turnOf(page, 'grave');
  const a2 = await foeHp(page, 'enemy');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  await page.getByTestId('pb-foe-enemy').click();
  await expect.poll(() => foeHp(page, 'enemy')).toBeLessThan(a2);
});

test('one creature down: out of the TURN ORDER and the targets, the fight goes on; the last one down is the victory', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?preview=party&enemies=2&weak=1');
  await turnOf(page, 'kaos');
  // Kaos's 彗星撃 (20) at コケマル (an eighth of 80 = 10).
  await page.getByTestId('pb-cmd-magic').click();
  await page.getByTestId('pb-magic-comet_strike').click();
  await page.getByTestId('pb-target-enemy-enemy-2').click();
  await expect(page.getByTestId('pb-foe-enemy-2')).toHaveAttribute('data-down', 'yes');
  await expect(screen(page)).toHaveAttribute('data-outcome', 'ONGOING');
  const turnActors = await page.locator('[data-testid^="pb-turn-slot-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-actor')));
  expect(turnActors).not.toContain('enemy-2');
  // With one left, 攻撃 asks nothing.
  await turnOf(page, 'hero');
  await page.getByTestId('pb-cmd-attack').click();
  await expect(page.getByText('どれを？')).toHaveCount(0);
  await expect(screen(page)).not.toHaveAttribute('data-actor', 'hero');
  // AUTO finishes it.
  await page.getByTestId('pb-speed').click();
  await page.getByTestId('pb-auto').click();
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 60_000 });
});

test('BREAK is each creature\'s own: one broken (「BREAK中」 at its feet), the other not', async ({ page }) => {
  await page.goto('/?preview=party&enemies=2&footing=4');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-defend').click();
  await turnOf(page, 'hero');
  await page.getByTestId('pb-cmd-defend').click();
  await turnOf(page, 'grave');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  await page.getByTestId('pb-target-enemy-enemy-2').click();
  await expect(page.getByTestId('pb-foe-enemy-2')).toHaveAttribute('data-broken', 'yes');
  await expect(page.getByTestId('pb-foe-enemy')).toHaveAttribute('data-broken', 'no');
  await expect(page.getByTestId('pb-foe-enemy-2').getByTestId('pb-enemy-broken')).toHaveText('BREAK中');
  await expect(page.getByTestId('pb-foe-enemy').getByTestId('pb-enemy-broken')).toHaveCount(0);
  await expect(page.getByTestId('pb-break-badge')).toBeVisible();
});

test('AUTO at ×2 fights three creatures to the end', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?preview=party&enemies=3');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-speed').click();
  await page.getByTestId('pb-auto').click();
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 140_000 });
  for (const id of ['enemy', 'enemy-2', 'enemy-3']) await expect(page.getByTestId(`pb-foe-${id}`)).toHaveAttribute('data-down', 'yes');
});

test('the DEBUG door\'s chooser: 敵1体 / セキリュウガ / 敵2体 / 敵3体', async ({ page }) => {
  await page.goto('/?preview=party&enemy=select');
  for (const id of ['pb-select-1', 'pb-select-sekiryuga', 'pb-select-2', 'pb-select-3']) await expect(page.getByTestId(id)).toBeVisible();
  await page.getByTestId('pb-select-3').click();
  await expect(page.getByTestId('pb-foe-enemy-3')).toBeVisible();
  await expect(screen(page)).toHaveAttribute('data-actor', 'kaos');
});


// 戦闘ルール整理 (2026-10-12): ESCAPE from an ordinary fight, 「逃走不可」 against
// a boss; skills (no MP) waiting their turns, 「あとNT」 in the list; 星癒の羽
// not laid on one who has it.
test('ESCAPE: an ordinary fight can be fled (one creature, or several); a boss\'s cannot — 「逃走不可」', async ({ page }) => {
  for (const q of ['&enemy=moss_rabbit', '&enemies=2']) {
    await page.goto(`/?preview=party${q}`);
    await turnOf(page, 'kaos');
    await expect(page.getByTestId('pb-escape')).toHaveAttribute('data-escape', 'yes');
    await expect(page.getByTestId('pb-escape')).toBeEnabled();
    await onScreen(page, 'pb-escape');
  }
  await page.getByTestId('pb-escape').click();
  await expect(page.getByTestId('pb-preview-ended')).toContainText('逃げ出しました');
  for (const q of ['', '&enemy=sekiryuga']) {
    await page.goto(`/?preview=party${q}`);
    await turnOf(page, 'kaos');
    await expect(page.getByTestId('pb-escape')).toHaveAttribute('data-escape', 'no');
    await expect(page.getByTestId('pb-escape')).toBeDisabled();
    await expect(page.getByTestId('pb-escape')).toHaveText('逃走不可');
  }
});

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`at ${size.width}×${size.height}: a skill used waits — greyed in the list with 「あとNT」, MP untouched`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/?preview=party&enemy=moss_rabbit&hurt=1');
    await turnOf(page, 'kaos');
    // 星癒の羽 on the hero (MP untouched).
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-tech-star_feather').click();
    await page.getByTestId('pb-target-hero').click();
    expect(await mp(page)).toBe(48);
    // Grave: 重撃・豪断, then it waits: next turn 「あと2T」, greyed.
    await turnOf(page, 'hero');
    await page.getByTestId('pb-cmd-defend').click();
    await turnOf(page, 'grave');
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-tech-goudan').click();
    // Kaos again: 星癒の羽 waits (あと4T), greyed but still there.
    await turnOf(page, 'kaos');
    await page.getByTestId('pb-cmd-skills').click();
    await expect(page.getByTestId('pb-cmd-tech-star_feather')).toBeDisabled();
    await expect(page.getByTestId('pb-cmd-tech-star_feather').getByTestId('pb-wait')).toHaveText('あと4T');
    await onScreen(page, 'pb-cmd-tech-star_feather');
    await page.getByTestId('pb-cmd-back').click();
    await page.getByTestId('pb-cmd-defend').click();
    await turnOf(page, 'hero');
    await page.getByTestId('pb-cmd-defend').click();
    await turnOf(page, 'grave');
    await page.getByTestId('pb-cmd-skills').click();
    await expect(page.getByTestId('pb-cmd-tech-goudan')).toBeDisabled();
    await expect(page.getByTestId('pb-cmd-tech-goudan').getByTestId('pb-wait')).toHaveText('あと2T');
  });
}

test('星癒の羽 on グレイヴ: 「星癒 3T」 on his card, Kaos\'s MP untouched', async ({ page }) => {
  // (Not laying it on one who has it is the core's rule — partyBattle.test.ts. With its wait of
  // five of her turns longer than its three, the screen's 「星癒中」 cannot come up yet.)
  await page.goto('/?preview=party&enemy=moss_rabbit&hurt=1');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-star_feather').click();
  await page.getByTestId('pb-target-grave').click();
  await expect(page.getByTestId('pb-status-grave-regen')).toHaveText('星癒 3T');
  expect(await mp(page)).toBe(48);
});

// A GIANT's plate stands upright down the left edge (作者 実機 2026-10-23): the same corner, narrow and
// tall, clear of WORLD MEMORY — and off the giant's head. A fight of several keeps the wide plate.
test('a giant\'s plate stands upright down the left edge: slim, half the height, clear of WORLD MEMORY; others keep the wide one', async ({ page }) => {
  for (const size of [
    { width: 640, height: 300 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/?preview=party');
    await turnOf(page, 'kaos');
    const plate = page.getByTestId('pb-enemy-plate');
    await expect(plate).toHaveAttribute('data-layout', 'upright');
    await expect(plate).toContainText('ヴァルシール');
    const b = await box(page, 'pb-enemy-plate');
    expect(b.x).toBeLessThan(size.width * 0.05);
    expect(b.y).toBeLessThan(size.height * 0.05);
    // Slim and about half the height (作者 実機 2026-10-25: 大きくて邪魔、演出が見れない).
    expect(b.width).toBeLessThan(size.width * 0.06);
    expect(b.height).toBeGreaterThan(size.height * 0.45);
    expect(b.height).toBeLessThan(size.height * 0.6);
    expect(apart(b, await box(page, 'bx-world-memory'))).toBe(true);
    await onScreen(page, 'pb-break-gauge');
    await expect(page.getByTestId('pb-enemy-hp')).toContainText('500');
  }
  await page.goto('/?preview=party&enemies=2');
  await turnOf(page, 'kaos');
  await expect(page.getByTestId('pb-enemy-plate')).not.toHaveAttribute('data-layout', 'upright');
});

// 《彼岸花》 breaking it (作者 実機 2026-10-25: BREAKの表示が早すぎて彼岸花のエフェクトが見れない): the cuts, the
// ground split, the dark and the lilies — and only once the dark has lifted, 「BREAK!!」. No command until then.
test('《彼岸花》 breaking it: 「BREAK!!」 only after the dark and the lilies, and no command before it', async ({ page }) => {
  await page.goto('/?preview=party&higanbana=1&footing=3');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-defend').click();
  await turnOf(page, 'hero');
  await page.evaluate(() => {
    const w = window as unknown as { __hb: Record<string, number> };
    w.__hb = {};
    const t0 = performance.now();
    const tick = () => {
      const now = Math.round(performance.now() - t0);
      const dark = document.querySelector('.pb-bloom-dark');
      if (dark && Number(getComputedStyle(dark).opacity) > 0.5) w.__hb.dark ??= now;
      if (w.__hb.dark !== undefined && w.__hb.lit === undefined && (!dark || Number(getComputedStyle(dark).opacity) < 0.5)) w.__hb.lit = now;
      if (document.querySelector('[data-testid="pb-break-flash"]')) w.__hb.break ??= now;
      if (document.querySelector('[data-testid="pb-commands"]')?.getAttribute('data-locked') === 'no' && w.__hb.dark !== undefined) w.__hb.free ??= now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-higanbana').click();
  await expect(page.getByTestId('pb-break-flash')).toHaveCount(1, { timeout: 15_000 });
  const t = await page.evaluate(() => (window as unknown as { __hb: Record<string, number> }).__hb);
  expect(t.dark, 'the dark came').toBeDefined();
  expect(t.lit, 'and lifted').toBeDefined();
  expect(t.break, '「BREAK!!」 after the dark, never over it').toBeGreaterThanOrEqual(t.lit);
  expect(t.free ?? Infinity, 'no command before 「BREAK!!」').toBeGreaterThanOrEqual(t.break);
  await expect(page.getByTestId('pb-break-badge')).toBeVisible();
});

// ブラッシュアップ §4 (作者 2026-10-25: 初回は魅せる、以降はテンポ重視): 《彼岸花》's cut-in is the whole one the first
// time in a fight, the short one after that.
test('《彼岸花》 twice in one fight: the whole cut-in the first time, the short one the second', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?preview=party&higanbana=1&footing=99');
  const seen: { ms: string | null; brief: string | null }[] = [];
  for (let turn = 0; turn < 40 && seen.length < 2; turn++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 20_000 });
    if ((await screen(page).getAttribute('data-actor')) === 'hero') {
      await page.getByTestId('pb-cmd-skills').click();
      if (await page.getByTestId('pb-cmd-skill-higanbana').isEnabled()) {
        await page.getByTestId('pb-cmd-skill-higanbana').click();
        const cut = page.getByTestId('cut-in');
        await expect(cut).toBeVisible();
        seen.push({ ms: await cut.getAttribute('data-ms'), brief: await cut.getAttribute('data-brief') });
        await expect(cut).toHaveCount(0, { timeout: 5_000 });
        continue;
      }
      await page.getByTestId('pb-cmd-skills').click();
    }
    await page.getByTestId('pb-cmd-defend').click();
  }
  expect(seen).toEqual([
    { ms: '2500', brief: null },
    { ms: '1500', brief: 'yes' },
  ]);
});

// Their skills' cut-ins (作者 実機 2026-10-23 — cutin/skillCutIn.ts): グレイヴ's 重撃・豪断 with its name
// first, the commands held; then the blow.
test('グレイヴ\'s 重撃・豪断: its cut-in with its name first, the commands held — then the blow', async ({ page }) => {
  await page.goto('/?preview=party&footing=40');
  // The round's order: ケイオス, the creature, 主人公, グレイヴ — the first two defend.
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-defend').click();
  await turnOf(page, 'hero');
  await page.getByTestId('pb-cmd-defend').click();
  await turnOf(page, 'grave');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  await expect(page.getByTestId('pb-cinematic')).toBeVisible();
  await expect(page.getByTestId('cut-in-name')).toHaveText('重撃・豪断');
  await expect(page.getByTestId('cut-in')).toHaveAttribute('data-theme', 'grave');
  await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'yes');
  // While his move plays the giant's plate steps back (作者 実機 2026-10-25: 演出が見れない) — and is back
  // the moment his last blow lands.
  await expect(screen(page)).toHaveAttribute('data-showing', 'yes');
  await expect.poll(() => page.getByTestId('pb-enemy-plate').evaluate((e) => Number(getComputedStyle(e).opacity))).toBeLessThan(0.5);
  await expect(page.getByTestId('pb-cinematic')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByTestId('pb-foe').getByTestId('pb-float')).toHaveAttribute('data-tier', 'big');
  await expect(screen(page)).toHaveAttribute('data-showing', 'no', { timeout: 5000 });
  await expect.poll(() => page.getByTestId('pb-enemy-plate').evaluate((e) => Number(getComputedStyle(e).opacity))).toBeGreaterThan(0.95);
});

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
  // The creature: one of them is struck, no more.
  await turnOf(page, 'enemy');
  await turnOf(page, 'hero');
  const struck = (await Promise.all(['hero', 'kaos', 'grave'].map((id) => hp(page, id)))).filter((v, i) => v < [100, 100, 180][i]);
  expect(struck).toHaveLength(1);
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
    // Kaos: 星癒の羽 is in her スキル, aimed like a heal. MP 8.
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-tech-star_feather').click();
    await expect(page.getByText('誰に？')).toBeVisible();
    await page.getByTestId('pb-target-hero').click();
    expect(await mp(page)).toBe(40);
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

test('AUTO at ×2 against ヴァルシール: the techniques are used, BREAK comes, and it is won', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/?preview=party&hurt=1');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-speed').click();
  await page.getByTestId('pb-auto').click();
  // Kaos lays 星癒の羽 on the one under 70% (both are; the lowest share first).
  await expect(page.getByTestId('pb-status-grave-regen').or(page.getByTestId('pb-status-hero-regen')).first()).toBeVisible({ timeout: 10_000 });
  await expect(screen(page)).toHaveAttribute('data-broken', 'yes', { timeout: 60_000 });
  await expect(page.getByTestId('pb-result')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY');
});

// THE LAYOUT (作者指示 2026-10-12, UI 修正): the creature left, the party
// right as a triangle (never a row), the command cross top right, everyone's
// HP bottom right; a GIANT (ヴァルシール) big on the left with the party
// drawn smaller.
type Box = { x: number; y: number; width: number; height: number };
const box = async (page: Page, id: string) => (await page.getByTestId(id).boundingBox()) as Box;
const apart = (a: Box, b: Box) => a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1 || a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1;

for (const size of [
  { width: 640, height: 300 },
  { width: 844, height: 390 },
]) {
  test(`at ${size.width}×${size.height}: the party a triangle on the right, clear of the command cross and the HP; a giant drawn big, the party smaller`, async ({ page }) => {
    await page.setViewportSize(size);
    const heights: Record<string, number> = {};
    for (const [query, scale] of [
      ['enemy=sekiryuga', 'NORMAL'],
      ['', 'GIANT'],
    ] as const) {
      await page.goto(`/?preview=party${query ? `&${query}` : ''}`);
      await turnOf(page, 'kaos');
      await expect(screen(page)).toHaveAttribute('data-scale', scale);
      await page.waitForTimeout(300);
      const [hero, kaos, grave, foe, cross, hp] = await Promise.all(
        ['pb-figure-hero', 'pb-figure-kaos', 'pb-figure-grave', 'pb-enemy-art', 'pb-commands', 'pb-members'].map((id) => box(page, id)),
      );
      // The creature on the left, all three of the party right of it.
      for (const who of [hero, kaos, grave]) expect(who.x + who.width / 2).toBeGreaterThan(foe.x + foe.width / 2);
      // (Grave's drawing is wide — the great sword held out toward the creature — so his box's middle sits a little left of his body.)
      for (const who of [hero, kaos, grave]) expect(who.x + who.width / 2).toBeGreaterThan(size.width * 0.4);
      for (const who of [hero, kaos, grave]) expect(who.x + who.width).toBeGreaterThan(size.width * 0.55);
      // A triangle: Kaos at the apex (her feet higher than both), Grave toward the creature, the hero right.
      expect(kaos.y + kaos.height).toBeLessThan(Math.min(hero.y + hero.height, grave.y + grave.height) - 10);
      expect(grave.x + grave.width / 2).toBeLessThan(hero.x + hero.width / 2);
      // Clear of the command cross and of the HP.
      for (const who of [hero, kaos, grave]) {
        expect(apart(who, cross)).toBe(true);
        expect(apart(who, hp)).toBe(true);
      }
      await onScreen(page, 'pb-commands');
      await onScreen(page, 'pb-members');
      await onScreen(page, 'pb-enemy-plate');
      await onScreen(page, 'pb-break-gauge');
      heights[`${scale}-hero`] = hero.height;
      heights[`${scale}-foe`] = foe.height;
    }
    // The giant: most of the screen's height; the party drawn smaller than in a normal fight.
    expect(heights['GIANT-foe']).toBeGreaterThan(size.height * 0.85);
    expect(heights['GIANT-foe']).toBeGreaterThan(heights['NORMAL-foe'] * 1.6);
    expect(heights['GIANT-hero']).toBeLessThan(heights['NORMAL-hero'] * 0.65);
  });
}

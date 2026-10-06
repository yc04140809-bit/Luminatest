import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { command, fightToResult, readyToAct } from './battle';

/**
 * THE APP FIGHT'S NOISES — the delivered sounds, at the moments the
 * stage already draws.
 *
 * Every sound the game plays goes through `new Audio(src)` and `play()`,
 * so a page that records what `play()` was asked to play hears exactly
 * what a player would. The fight itself is untouched: these tests only
 * listen.
 */

async function listen(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __played: string[] };
    w.__played = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.__played.push(`${decodeURIComponent(this.currentSrc || this.src)}|${this.playbackRate.toFixed(2)}`);
      return play.call(this).catch(() => undefined);
    };
  });
}

const played = (page: Page) => page.evaluate(() => (window as unknown as { __played: string[] }).__played);
const heard = async (page: Page, name: string) => (await played(page)).some((src) => src.includes(`/${name}`));

async function freshVillage(page: Page) {
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
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
}

test('a creature fight: his swing is the sword, then the hit; the creature’s tackle is the heavy blow', async ({ page }) => {
  await listen(page);
  await freshVillage(page);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await command(page, 'bp-attack');
  await expect.poll(() => heard(page, 'battle_attack_slash'), { timeout: 15_000 }).toBe(true);
  // The hit on the creature: the short thump, after the swing.
  await expect.poll(() => heard(page, 'battle_attack_strike'), { timeout: 15_000 }).toBe(true);
  const order = (await played(page)).map((src) => src.split('/').pop()!);
  expect(order.findIndex((n) => n.startsWith('battle_attack_slash'))).toBeLessThan(order.findIndex((n) => n.startsWith('battle_attack_strike')));
  // It does not tackle every turn (it may hide): fight until it has.
  for (let i = 0; i < 8 && !(await heard(page, 'battle_attack_heavy_strike')); i++) {
    await command(page, 'bp-attack');
    await page.waitForTimeout(300);
  }
  await expect.poll(() => heard(page, 'battle_attack_heavy_strike'), { timeout: 15_000 }).toBe(true);
  // Nothing for somebody else's weapon.
  expect(await heard(page, 'battle_attack_dagger')).toBe(false);
  // Each swing's pitch drifts only a hair: 0.96, 1.00 or 1.04.
  const rates = (await played(page)).filter((p) => p.includes('/battle_attack_slash')).map((p) => p.split('|')[1]);
  for (const r of rates) expect(['0.96', '1.00', '1.04']).toContain(r);
});

test('Gald’s fight: his knives are the knife sound', async ({ page }) => {
  test.setTimeout(150_000);
  await listen(page);
  await freshVillage(page);
  await page.getByTestId('gald-button').click();
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  // He does not strike every turn (he hides, he talks): fight until he has.
  for (let i = 0; i < 12 && !((await heard(page, 'battle_attack_dagger')) && (await heard(page, 'battle_damage'))); i++) {
    await command(page, 'bp-attack');
    await page.waitForTimeout(300);
  }
  await readyToAct(page, 20_000);
  expect(await heard(page, 'battle_attack_dagger')).toBe(true);
  expect(await heard(page, 'battle_attack_slash')).toBe(true);
  // A boss: his hits on Gald are the heavy thump, not the ordinary one.
  expect(await heard(page, 'battle_attack_heavy_strike')).toBe(true);
  expect(await heard(page, 'battle_attack_strike')).toBe(false);
  // His knives landing on the party: the hit sound.
  expect(await heard(page, 'battle_damage')).toBe(true);
});

test('a creature beaten: it goes down with the down sound', async ({ page }) => {
  test.setTimeout(120_000);
  await listen(page);
  await freshVillage(page);
  await page.getByTestId('encounter-button').click();
  await fightToResult(page);
  expect(await heard(page, 'battle_down')).toBe(true);
});

for (const [spell, gather, extra] of [
  ['comet_strike', 'battle_charge_aura', 'battle_finisher_hit'],
  ['mending_light', 'magic_cast', 'battle_heal'],
  ['starlight_bolt', 'magic_cast', 'battle_magic_ice'],
] as const) {
  test(`her ${spell}: the cut-in, then ${gather}, then ${extra}`, async ({ page }) => {
    await listen(page);
    // A first touch (sound is allowed only after one), then cast from the panel.
    await page.goto('/?preview=battle&debug=0&hurt=1&magic=1');
    await readyToAct(page);
    await page.mouse.click(5, 5);
    await page.getByTestId('bp-magic').click();
    await page.getByTestId(`magic-${spell}`).click();
    await expect(page.getByTestId('cut-in')).toBeVisible();
    await expect.poll(() => heard(page, 'battle_cutin'), { timeout: 10_000 }).toBe(true);
    await expect.poll(() => heard(page, gather), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => heard(page, extra), { timeout: 15_000 }).toBe(true);
    const order = (await played(page)).map((src) => src.split('/').pop()!);
    const at = (name: string) => order.findIndex((n) => n.startsWith(name));
    expect(at('battle_cutin')).toBeLessThan(at(gather));
    expect(at(gather)).toBeLessThan(at(extra));
    // Its own landing stands in for the ordinary hit of that blow.
    if (spell !== 'mending_light') expect(at('battle_attack_strike')).toBe(-1);
  });
}

for (const [part, sounds] of [
  ['zero', ['battle_charge_aura', 'battle_attack_slash', 'battle_finisher_hit']],
  ['levi', ['battle_magic_dark', 'battle_attack_thrust', 'battle_attack_heavy_weapon', 'battle_finisher_hit']],
  ['aria', ['battle_attack_bow', 'battle_magic_holy', 'battle_heal']],
] as const) {
  test(`the special move ${part}: ${sounds.join(' → ')}`, async ({ page }) => {
    await listen(page);
    await page.goto('/?preview=battle');
    await readyToAct(page);
    await page.getByTestId('debug-toggle').click();
    await page.getByTestId(`debug-${part}`).click();
    await expect.poll(() => heard(page, sounds[sounds.length - 1]), { timeout: 15_000 }).toBe(true);
    const order = (await played(page)).map((src) => src.split('/').pop()!);
    const at = sounds.map((name) => order.findIndex((n) => n.startsWith(name)));
    for (let i = 0; i < at.length; i++) expect(at[i], sounds[i]).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < at.length; i++) expect(at[i], `${sounds[i - 1]} before ${sounds[i]}`).toBeGreaterThan(at[i - 1]);
    if (part === 'levi') expect(order.filter((n) => n.startsWith('battle_attack_thrust')).length).toBe(6);
  });
}

test('×2: Levi’s six spears are heard as three, so they never become a buzz', async ({ page }) => {
  await listen(page);
  await page.goto('/?preview=battle');
  await readyToAct(page);
  await page.getByTestId('bp-speed').click();
  await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', '2');
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-levi').click();
  await expect.poll(() => heard(page, 'battle_finisher_hit'), { timeout: 15_000 }).toBe(true);
  const order = (await played(page)).map((src) => src.split('/').pop()!);
  expect(order.filter((n) => n.startsWith('battle_attack_thrust')).length).toBe(3);
});

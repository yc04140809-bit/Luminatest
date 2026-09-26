import { test, expect, type Page } from '@playwright/test';
import { MAGIC_DEFS } from '../../mugen-core/content/magic/magicDefs';
import { enemyHp, fightUntil, readyToAct, throughTheAwakening } from './battle';
import { throughTheOpening } from './opening';

/**
 * HER SPELLS, SHOWN IN FULL (STEP C) — in the debug preview and in the
 * game's own fight, through the one pipeline both use.
 *
 * Every spell the game's data has is cast, and every frame is sampled:
 * her cut-in carries the spell's own name; her aura comes before the
 * landing; nothing about the fight changes on screen until it lands;
 * the one number shown is the health the core took off, and only for a
 * spell that hurts; the plate says what the core's own log says; and
 * when it is over nothing of it is left and the fight takes a command.
 */

interface Frame {
  t: number;
  cut: string | null;
  cutMs: number | null;
  phase: string | null;
  kind: string | null;
  hp: string;
  mp: string;
  locked: string;
  enemyHits: string[];
  said: string;
}

async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __recording: boolean };
    w.__frames = [];
    w.__recording = true;
    const t0 = performance.now();
    const tick = () => {
      const fx = document.querySelector('[data-testid="spell-fx"]');
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        cut: document.querySelector('[data-testid="cut-in-name"]')?.textContent ?? null,
        cutMs:
          Number(document.querySelector('[data-testid="cut-in"]')?.getAttribute('data-ms')) || null,
        phase: fx?.getAttribute('data-phase') ?? null,
        kind: fx?.getAttribute('data-kind') ?? null,
        hp: document.querySelector('[data-testid="bp-enemy-read"]')?.textContent ?? '',
        mp: document.querySelector('[data-testid="bx-kaos-mp"]')?.textContent ?? '',
        locked:
          document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') ?? '',
        enemyHits: [...document.querySelectorAll<HTMLElement>('.bp-hit')]
          .filter((h) => parseFloat(h.style.left) < 50)
          .map((h) => h.querySelector('.bp-hit-damage')?.textContent ?? ''),
        said: document.querySelector('[data-testid="bp-said-result"]')?.textContent ?? '',
      });
      if (w.__recording) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function stopRecording(page: Page): Promise<Frame[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __recording: boolean };
    w.__recording = false;
    return w.__frames;
  });
}
const hpOf = (text: string) => Number(text.split('/')[0].replace(/\D/g, ''));
const first = (f: Frame[], test: (x: Frame) => boolean) => f.findIndex(test);

/** The spell is over: no cut-in, no effect, and the row takes a command. */
async function settled(page: Page) {
  await expect(page.getByTestId('spell-fx')).toHaveCount(0, { timeout: 12_000 });
  await expect(page.getByTestId('cut-in')).toHaveCount(0);
  await readyToAct(page, 12_000);
}

for (const def of MAGIC_DEFS) {
  test(`${def.name}: cut-in, aura, landing, and only the core's own result`, async ({ page }) => {
    await page.goto('/?preview=battle&debug=0&hurt=1');
    await readyToAct(page);
    const [startHp] = await enemyHp(page);
    await record(page);
    // Cast from the DEBUG panel's own button: a fresh fight, full MP.
    await page.goto(`/?preview=battle&debug=0&hurt=1&spell=${def.id}`);
    await record(page);
    await expect(page.getByTestId('cut-in')).toBeVisible();
    await settled(page);
    const f = await stopRecording(page);

    // THE ORDER: her cut-in with the spell's own name, then her aura,
    // then the landing.
    const cut = first(f, (x) => x.cut === def.name);
    const aura = first(f, (x) => x.phase === 'channel');
    const land = first(f, (x) => x.phase === 'impact');
    expect(cut, 'her cut-in names the spell as the game does').toBeGreaterThanOrEqual(0);
    expect(aura).toBeGreaterThan(cut);
    expect(land).toBeGreaterThan(aura);
    expect(f[land].kind).toBe(
      {
        starlight_bolt: 'BOLT',
        comet_strike: 'COMET',
        mending_light: 'MEND',
        star_shield: 'WARD',
        star_haze: 'HAZE',
      }[def.id],
    );

    // NOTHING CHANGES ON SCREEN BEFORE IT LANDS: the creature's health and
    // her MP read as before the spell, all through the cut-in and aura.
    for (const x of f.slice(0, land)) {
      if (!x.hp) continue;
      expect(hpOf(x.hp)).toBe(startHp);
      expect(x.mp).toContain('48');
    }
    // After it: her MP is down by exactly the spell's cost.
    const last = f[f.length - 1];
    expect(Number(last.mp.split('/')[0].replace(/\D/g, ''))).toBe(48 - def.mpCost);

    const numbers = f.flatMap((x) => x.enemyHits).filter(Boolean);
    const [endHp] = await enemyHp(page);
    if (def.effect === 'DAMAGE') {
      // THE NUMBER IS THE CORE'S: exactly the health it took off.
      expect(numbers.length).toBeGreaterThan(0);
      expect(Number(numbers[0])).toBe(startHp - endHp);
      // And it appears only once it has landed.
      expect(first(f, (x) => x.enemyHits.some(Boolean))).toBeGreaterThan(land);
    } else {
      // No number for a spell that hurts nothing.
      expect(numbers).toEqual([]);
      expect(endHp).toBe(startHp);
    }
    // The plate says what the core's own log says it did.
    expect(f.some((x) => x.said.includes(`《${def.name}》`))).toBe(true);
    // And the fight goes on: one more swing works as ever.
    await page.getByTestId('bp-attack').click();
    await readyToAct(page);
  });
}

test('×2: shorter, never below the floors, and still every part of it', async ({ page }) => {
  const lockedFor = (f: Frame[]) => {
    const on = f.find((x) => x.locked === 'yes');
    const off = on && f.find((x) => x.t > on.t && x.locked === 'no');
    return on && off ? off.t - on.t : Infinity;
  };
  const cast = async (speed: 1 | 2) => {
    await page.goto('/?preview=battle');
    await readyToAct(page);
    if (speed === 2) await page.getByTestId('bp-speed').click();
    await page.getByTestId('debug-toggle').click();
    await record(page);
    await page.getByTestId('debug-spell-comet_strike').click();
    await settled(page);
    return stopRecording(page);
  };
  const slow = await cast(1);
  const fast = await cast(2);
  expect(slow.find((x) => x.cutMs)?.cutMs).toBe(2500);
  expect(fast.find((x) => x.cutMs)?.cutMs).toBe(1800);
  expect(lockedFor(fast)).toBeLessThan(lockedFor(slow));
  for (const f of [slow, fast]) {
    expect(f.some((x) => x.cut === '彗星撃')).toBe(true);
    expect(f.some((x) => x.phase === 'channel')).toBe(true);
    expect(f.some((x) => x.phase === 'impact')).toBe(true);
    expect(f.some((x) => x.enemyHits.some(Boolean))).toBe(true);
  }
});

test('pressing 攻撃 again and again while she casts takes no extra turn', async ({ page }) => {
  await page.goto('/?preview=battle&debug=0&spell=starlight_bolt');
  const [startHp] = await enemyHp(page);
  await record(page);
  const attack = (await page.getByTestId('bp-attack').boundingBox())!;
  for (let i = 0; i < 12; i++) {
    await page.mouse.click(attack.x + attack.width / 2, attack.y + attack.height / 2);
    await page.waitForTimeout(200);
  }
  await settled(page);
  const f = await stopRecording(page);
  const numbers = f.flatMap((x) => x.enemyHits).filter(Boolean);
  // One number, and the health lost is the spell's and nothing else.
  expect(new Set(numbers).size).toBe(1);
  expect(startHp - (await enemyHp(page))[0]).toBe(Number(numbers[0]));
});

test('cast again from the panel mid-spell: a clean new fight, the same numbers', async ({
  page,
}) => {
  await page.goto('/?preview=battle');
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-spell-starlight_bolt').click();
  await settled(page);
  const once = (await enemyHp(page))[0];
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-spell-starlight_bolt').click();
  await expect(page.getByTestId('cut-in')).toBeVisible();
  // Again, in the middle of it.
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-spell-starlight_bolt').click();
  await settled(page);
  expect((await enemyHp(page))[0]).toBe(once);
  await expect(page.locator('.sfx, .ci')).toHaveCount(0);
});

test('leaving in the middle of a spell leaves no error and nothing behind', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?preview=battle&spell=comet_strike');
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-exit').click();
  await expect(page.getByTestId('debug-battle-preview')).toBeVisible();
  await page.waitForTimeout(3500);
  await expect(page.locator('.sfx, .ci')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("in the game's own fight with Gald, her spells are shown in full and the fight goes on", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? [])
      if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (
      await page
        .getByTestId('battle-screen')
        .isVisible()
        .catch(() => false)
    )
      break;
    await page.getByTestId('encounter-next').click();
  }
  // Until she wakes.
  const awakening = page.getByTestId('magic-awakening');
  await fightUntil(page, () => awakening.isVisible().catch(() => false), { maxTurns: 200 });
  await throughTheAwakening(page);
  await readyToAct(page);

  // 星光弾, from the tray.
  const [before] = await enemyHp(page);
  await record(page);
  await page.getByTestId('bp-magic').click();
  await page.getByTestId('magic-starlight_bolt').click();
  await settled(page);
  let f = await stopRecording(page);
  expect(f.some((x) => x.cut === '星光弾')).toBe(true);
  expect(f.some((x) => x.phase === 'channel')).toBe(true);
  expect(f.some((x) => x.phase === 'impact')).toBe(true);
  const shown = Number(f.flatMap((x) => x.enemyHits).find(Boolean));
  expect(shown).toBe(before - (await enemyHp(page))[0]);
  expect(f.some((x) => x.said.includes('《星光弾》'))).toBe(true);

  // 癒しの光: her cut-in, and the plate in the core's words — no number on him.
  await record(page);
  await page.getByTestId('bp-magic').click();
  await page.getByTestId('magic-mending_light').click();
  await settled(page);
  f = await stopRecording(page);
  expect(f.some((x) => x.cut === '癒しの光')).toBe(true);
  expect(f.some((x) => x.kind === 'MEND' && x.phase === 'impact')).toBe(true);
  expect(f.some((x) => x.said.includes('《癒しの光》'))).toBe(true);
  expect(f.flatMap((x) => x.enemyHits).filter(Boolean)).toEqual([]);

  // And the fight is still the game's: on to the four answers.
  await fightUntil(
    page,
    () =>
      page
        .getByTestId('life-choice-screen')
        .isVisible()
        .catch(() => false),
    {
      maxTurns: 200,
    },
  );
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  castMagic,
  createBattle,
  playerAttack,
  playerDefend,
  useItem,
  type BattleState,
  type EnemySpec,
} from '../../game/battle/battleLogic';
import { statsForLevels } from '../../core/progression/levelStats';
import { MAGIC_DEFS } from '../magic/magicDefs';
import { itemDef } from '../economy/itemDefs';
import { GALD_BATTLE } from './galdBattle';
import { MOSS_RABBIT } from './species';
import { specOf } from '../../game/battle/enemySpec';
import { SEKIRYUGA_BATTLE, SEKIRYUGA_CHARACTER_ID, SEKIRYUGA_NAME } from './sekiryugaBattle';

/**
 * セキリュウガ — THE FIRST BOSS'S NUMBERS AND MOVES.
 *
 * Three moves (爪撃 / 裂牙 / 咆哮 → 渾身の裂牙 the next turn), a tell the
 * turn before the big one, the fight's length measured against the two
 * fights already in the game, and every other fight untouched by any of it.
 */

function seeded(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const always = (v: number) => () => v;
const last = (s: BattleState) => s.log[s.log.length - 1];

describe('who it is is referred to, not copied', () => {
  it('is FORGE’s MON-000007 by id, and FORGE’s own folder does not hold it', () => {
    expect(SEKIRYUGA_CHARACTER_ID).toBe('MON-000007');
    expect(SEKIRYUGA_BATTLE.name).toBe(SEKIRYUGA_NAME);
    const forge = join(__dirname, '..', 'forge');
    const files = readdirSync(forge, { recursive: true }) as string[];
    expect(files.some((f) => String(f).includes('MON-000007'))).toBe(false);
  });

  it('this file imports nothing from FORGE', () => {
    const src = readFileSync(join(__dirname, 'sekiryugaBattle.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"][^'"]*forge/);
  });
});

describe('its three moves', () => {
  it('its ordinary blow is 爪撃', () => {
    const s = playerAttack(createBattle(SEKIRYUGA_BATTLE), always(0.99), 'ATTACK');
    expect(s.lastEnemyAction).toBe('ATTACK');
    expect(s.lastEnemyMove).toBe('BLOW');
    expect(last(s)).toMatch(/^セキリュウガの爪撃！ \d+のダメージ。$/);
  });

  it('sometimes 裂牙 instead — harder', () => {
    // Past its first turns, so it may roar; a die under the bite's chance but over the roar's.
    let s = createBattle(SEKIRYUGA_BATTLE);
    s = { ...s, enemyChargeCooldown: 0 };
    // His swing · roar? no (0.5 ≥ 0.3) · bite? yes (0.1 < 0.25) · its roll: the top.
    const dice = [0.5, 0.5, 0.1, 0.99];
    const next = playerAttack(s, () => dice.shift() ?? 0.5, null);
    expect(next.lastEnemyMove).toBe('HEAVY');
    expect(last(next)).toMatch(/^セキリュウガの裂牙！/);
    // 7 at the top of its roll, ×1.6.
    expect(next.lastEnemyDamage).toBe(Math.ceil(7 * 1.6));
  });

  it('咆哮: no blow, the tell is said — and the NEXT turn is 渾身の裂牙, whatever the dice', () => {
    let s = createBattle(SEKIRYUGA_BATTLE);
    s = { ...s, enemyChargeCooldown: 0 };
    const roared = playerAttack(s, always(0.99), 'SKILL');
    expect(roared.lastEnemyMove).toBe('CHARGE');
    expect(roared.lastEnemyAction).toBe('SKILL');
    expect(roared.lastEnemyDamage).toBe(0);
    expect(roared.playerHp).toBe(s.playerHp);
    expect(roared.enemyCharging).toBe(true);
    expect(last(roared)).toContain('咆哮');
    expect(last(roared)).toContain('次の一撃が来る');
    // The release comes even when the dice and the forcing say otherwise.
    const released = playerAttack(roared, always(0.99), 'ATTACK');
    expect(released.lastEnemyMove).toBe('RELEASE');
    expect(last(released)).toMatch(/^セキリュウガの渾身の裂牙！/);
    expect(released.lastEnemyDamage).toBe(Math.ceil(7 * 2.2));
    expect(released.enemyCharging).toBe(false);
  });

  it('bracing after the roar halves the release', () => {
    let s = createBattle(SEKIRYUGA_BATTLE);
    s = { ...s, enemyChargeCooldown: 0 };
    const roared = playerAttack(s, always(0.99), 'SKILL');
    const braced = playerDefend(roared, always(0.99));
    expect(braced.lastEnemyMove).toBe('RELEASE');
    expect(braced.lastEnemyDamage).toBe(Math.ceil(7 * 0.5 * 2.2));
    expect(last(braced)).toMatch(/防御して/);
  });

  it('does not roar in its first two turns, nor twice in a row', () => {
    let s = createBattle(SEKIRYUGA_BATTLE);
    s = playerAttack(s, always(0.01), null);
    expect(s.lastEnemyMove).not.toBe('CHARGE');
    s = playerAttack(s, always(0.01), null);
    expect(s.lastEnemyMove).not.toBe('CHARGE');
    s = playerAttack(s, always(0.01), null);
    expect(s.lastEnemyMove).toBe('CHARGE');
    s = playerAttack(s, always(0.01), null);
    expect(s.lastEnemyMove).toBe('RELEASE');
    // The cooldown after a release.
    s = playerAttack(s, always(0.01), null);
    expect(s.lastEnemyMove).not.toBe('CHARGE');
  });

  it('at nought it stops — 膝をついた — and nothing says it died', () => {
    let s = createBattle(SEKIRYUGA_BATTLE);
    s = { ...s, enemyHp: 1 };
    s = playerAttack(s, always(0.5));
    expect(s.outcome).toBe('VICTORY');
    expect(last(s)).toBe('セキリュウガは膝をついた……。');
    expect(s.log.join('')).not.toMatch(/死|倒れて動かなくなった|息絶/);
  });
});

describe('every other fight is untouched', () => {
  it('a fight without moves carries none of their fields', () => {
    for (const spec of [GALD_BATTLE, specOf(MOSS_RABBIT)]) {
      let s = createBattle(spec);
      expect('enemyMoves' in s || 'enemyCharging' in s || 'lastEnemyMove' in s).toBe(false);
      for (let i = 0; i < 6 && s.outcome === 'ONGOING'; i++) s = playerAttack(s, seeded(i + 3));
      expect('lastEnemyMove' in s).toBe(false);
    }
  });
});

describe('the measured length (2000 seeded fights each)', () => {
  const comet = MAGIC_DEFS.find((m) => m.id === 'comet_strike')!;
  const mend = MAGIC_DEFS.find((m) => m.id === 'mending_light')!;
  const herb = itemDef('FOREST_HERB')!.use!;

  function fight(spec: EnemySpec, level: number, careful: boolean, seed: number) {
    const rng = seeded(seed);
    let s = createBattle(spec, undefined, { stats: statsForLevels(level, level), magicUnlocked: careful });
    let herbs = careful ? 2 : 0;
    let turns = 0;
    while (s.outcome === 'ONGOING' && turns < 80) {
      turns++;
      if (!careful) s = playerAttack(s, rng);
      else if (s.enemyCharging) s = playerDefend(s, rng);
      else if (s.playerHp < s.playerMaxHp * 0.3 && herbs > 0) (herbs--, (s = useItem(s, herb, rng)));
      else if (s.playerHp < s.playerMaxHp * 0.3 && s.playerMp >= mend.mpCost) s = castMagic(s, mend, rng);
      else if (s.playerMp >= comet.mpCost + mend.mpCost) s = castMagic(s, comet, rng);
      else s = playerAttack(s, rng);
    }
    return { won: s.outcome === 'VICTORY', turns };
  }
  function measure(spec: EnemySpec, level: number, careful: boolean) {
    const N = 2000;
    let won = 0;
    let turns = 0;
    for (let i = 1; i <= N; i++) {
      const r = fight(spec, level, careful, i);
      if (r.won) won++;
      turns += r.turns;
    }
    return { win: won / N, turns: turns / N };
  }

  it('longer than the forest’s ordinary creature, shorter than Gald', () => {
    const rabbit = measure(specOf(MOSS_RABBIT), 2, false);
    const gald = measure({ ...GALD_BATTLE, awakening: undefined }, 2, false);
    const boss = measure(SEKIRYUGA_BATTLE, 2, false);
    expect(boss.turns).toBeGreaterThan(rabbit.turns);
    expect(boss.turns).toBeLessThan(gald.turns);
    expect(boss.turns).toBeGreaterThanOrEqual(12);
    expect(boss.turns).toBeLessThanOrEqual(16);
  });

  it('not a fight lost on first sight: careful play wins at level one, plain swinging mostly wins at two', () => {
    expect(measure(SEKIRYUGA_BATTLE, 1, true).win).toBeGreaterThanOrEqual(0.99);
    expect(measure(SEKIRYUGA_BATTLE, 2, false).win).toBeGreaterThanOrEqual(0.95);
  });

  it('but swinging alone at level one can lose it: mending, bracing and herbs matter', () => {
    const plain = measure(SEKIRYUGA_BATTLE, 1, false).win;
    expect(plain).toBeLessThan(0.9);
    expect(plain).toBeGreaterThan(0.5);
  });
});

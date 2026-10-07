import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  castMagic,
  createBattle,
  playerAttack,
  playerDefend,
  playerSkill,
  skillReadyIn,
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
import { SHUNDAN } from '../skills/heroSkills';

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
  const mend = MAGIC_DEFS.find((m) => m.id === 'mending_light')!;
  const herb = itemDef('FOREST_HERB')!.use!;

  /** plain: 攻撃 only · skill: 《瞬断》 whenever ready · careful: and braces, mends, drinks. */
  function fight(spec: EnemySpec, level: number, how: 'plain' | 'skill' | 'careful', seed: number) {
    const rng = seeded(seed);
    let s = createBattle(spec, undefined, { stats: statsForLevels(level, level), magicUnlocked: how === 'careful' });
    let herbs = how === 'careful' ? 2 : 0;
    let turns = 0;
    while (s.outcome === 'ONGOING' && turns < 80) {
      turns++;
      if (how === 'careful' && s.enemyCharging) s = playerDefend(s, rng);
      else if (how === 'careful' && s.playerHp < s.playerMaxHp * 0.3 && herbs > 0) (herbs--, (s = useItem(s, herb, rng)));
      else if (how === 'careful' && s.playerHp < s.playerMaxHp * 0.3 && s.playerMp >= mend.mpCost) s = castMagic(s, mend, rng);
      else if (how !== 'plain' && skillReadyIn(s, SHUNDAN) === 0) s = playerSkill(s, SHUNDAN, rng);
      else s = playerAttack(s, rng);
    }
    return { won: s.outcome === 'VICTORY', turns };
  }
  function measure(spec: EnemySpec, level: number, how: 'plain' | 'skill' | 'careful') {
    const N = 2000;
    let won = 0;
    let turns = 0;
    for (let i = 1; i <= N; i++) {
      const r = fight(spec, level, how, i);
      if (r.won) won++;
      turns += r.turns;
    }
    return { win: won / N, turns: turns / N };
  }

  it('longer than the forest’s ordinary creature, shorter than Gald — 《瞬断》 used as it comes round', () => {
    const rabbit = measure(specOf(MOSS_RABBIT), 2, 'skill');
    const gald = measure({ ...GALD_BATTLE, awakening: undefined }, 2, 'skill');
    const boss = measure(SEKIRYUGA_BATTLE, 2, 'skill');
    expect(boss.turns).toBeGreaterThan(rabbit.turns);
    expect(boss.turns).toBeLessThan(gald.turns);
    expect(boss.turns).toBeGreaterThanOrEqual(10);
    expect(boss.turns).toBeLessThanOrEqual(14);
  });

  it('not a fight lost on first sight: careful play wins at level one, using 《瞬断》 wins at two', () => {
    expect(measure(SEKIRYUGA_BATTLE, 1, 'careful').win).toBeGreaterThanOrEqual(0.99);
    expect(measure(SEKIRYUGA_BATTLE, 2, 'skill').win).toBeGreaterThanOrEqual(0.98);
  });

  it('but ignoring 《瞬断》 can lose it: the skill, bracing, mending and herbs matter', () => {
    expect(measure(SEKIRYUGA_BATTLE, 2, 'plain').win).toBeLessThan(0.9);
    expect(measure(SEKIRYUGA_BATTLE, 1, 'plain').win).toBeLessThan(0.5);
  });
});

describe('《氷晶咆哮》 — its one great move', () => {
  it('the first of its turns at half health or below, once, reaching both — and bracing halves it', () => {
    let s = createBattle(SEKIRYUGA_BATTLE);
    s = { ...s, enemyHp: 86 };
    const hit = playerAttack(s, always(0.99), 'ATTACK');
    expect(hit.lastEnemyMove).toBe('SIGNATURE');
    expect(hit.enemySignatureUsed).toBe(true);
    expect(hit.log).toContain('凍てつく咆哮が、二人をまとめて呑みこんだ。');
    expect(last(hit)).toMatch(/^セキリュウガの《氷晶咆哮》！ \d+のダメージ。$/);
    // Never again in this fight.
    const after = playerAttack(hit, always(0.99), 'ATTACK');
    expect(after.lastEnemyMove).not.toBe('SIGNATURE');
    // Braced: half.
    const braced = playerDefend({ ...s, enemyHp: 80 }, always(0.99));
    expect(braced.lastEnemyMove).toBe('SIGNATURE');
    expect(braced.lastEnemyDamage).toBeLessThan(hit.lastEnemyDamage);
  });

  it('not above half', () => {
    const s = playerAttack(createBattle(SEKIRYUGA_BATTLE), always(0.5), 'ATTACK');
    expect(s.lastEnemyMove).not.toBe('SIGNATURE');
  });
});

describe('《瞬断》 — his skill', () => {
  it('twice his swing, no MP, then every third turn', () => {
    const start = createBattle(specOf(MOSS_RABBIT));
    const plain = playerAttack(start, always(0.99), 'ATTACK');
    const skilled = playerSkill(start, SHUNDAN, always(0.99), 'ATTACK');
    expect(start.enemyHp - skilled.enemyHp).toBe(2 * (start.enemyHp - plain.enemyHp));
    expect(skilled.playerMp).toBe(start.playerMp);
    expect(skilled.log).toContain(`《瞬断》！ ${start.enemyName}に${start.enemyHp - skilled.enemyHp}のダメージ。`);
    // Turn 2 and 3: not ready; refused, the state as it was.
    expect(skillReadyIn(skilled, SHUNDAN)).toBe(2);
    expect(playerSkill(skilled, SHUNDAN, always(0.5))).toBe(skilled);
    const t2 = playerAttack(skilled, always(0.5), 'ATTACK');
    expect(skillReadyIn(t2, SHUNDAN)).toBe(1);
    const t3 = playerDefend(t2, always(0.5), 'ATTACK');
    // Turn 4: ready again.
    expect(skillReadyIn(t3, SHUNDAN)).toBe(0);
    expect(playerSkill(t3, SHUNDAN, always(0.5), 'ATTACK')).not.toBe(t3);
  });

  it('a fight he never uses it in carries no trace of it', () => {
    let s = createBattle(GALD_BATTLE);
    for (let i = 0; i < 4; i++) s = playerAttack(s, seeded(i + 1));
    expect('skillUsedAt' in s).toBe(false);
  });
});

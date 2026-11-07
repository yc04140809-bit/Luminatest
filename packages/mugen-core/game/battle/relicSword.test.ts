import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createBattle, playerAttack, playerSkill, type BattleState, type EnemySpec } from './battleLogic';
import { World } from '../../core/world/world';
import { IdbMemoryStore } from '../../core/memory/idbStore';
import { statsForLevels } from '../../core/progression/levelStats';
import { weaponInBattle } from '../../content/equipment/equipment';
import { SHUNDAN } from '../../content/skills/heroSkills';

/**
 * 星紋の遺剣 IN BATTLE (2026-10-07): while he holds it, +2 to both ends
 * of his swing, and 先手の一閃 — his first swing of the fight, made at
 * full HP, times 1.25 (the last multiplier). Nothing else moves.
 */

const RELIC = 'weapon/star_crest_relic_sword';
const WORN = 'weapon/worn_long_sword';
const FLASH = weaponInBattle(RELIC).firstStrike!;

// A creature that never dies of one blow and is never anything but plain.
const DUMMY: EnemySpec = { name: 'かかし', hp: 999, attackMin: 1, attackMax: 1 };

/** The same dice every time: a fixed roll, and the enemy always attacks. */
const fixed = (r: number) => () => r;

const hpLost = (before: BattleState, after: BattleState) => before.enemyHp - after.enemyHp;

let dbCounter = 0;
const openWorld = () => World.open(new IdbMemoryStore(`relic-sword-test-${++dbCounter}`));

describe('星紋の遺剣 — the world hands the battle its numbers', () => {
  it('unequipped: the swing is the levels’ own, and there is no first strike', async () => {
    const world = await openWorld();
    expect(world.getEquipped('hero', 'WEAPON')).toBe(WORN);
    expect(world.getPartyStats()).toEqual(statsForLevels(world.getLevel('hero'), world.getLevel('kaos')));
    expect(world.getHeroFirstStrike()).toBeNull();
  });

  it('equipped: +2 to both ends of his swing, and 先手の一閃', async () => {
    const world = await openWorld();
    const base = world.getPartyStats();
    await world.grantEquipment(RELIC);
    expect(await world.setEquipped('hero', 'WEAPON', RELIC)).toBe(true);
    const held = world.getPartyStats();
    expect(held).toEqual({ ...base, attackMin: base.attackMin + 2, attackMax: base.attackMax + 2 });
    expect(world.getHeroFirstStrike()).toEqual({ name: '先手の一閃', multiplier: 1.25 });
  });

  it('unequipped again: both are gone', async () => {
    const world = await openWorld();
    const base = world.getPartyStats();
    await world.grantEquipment(RELIC);
    await world.setEquipped('hero', 'WEAPON', RELIC);
    expect(await world.setEquipped('hero', 'WEAPON', WORN)).toBe(true);
    expect(world.getPartyStats()).toEqual(base);
    expect(world.getHeroFirstStrike()).toBeNull();
  });

  it('owning it without holding it changes nothing', async () => {
    const world = await openWorld();
    const base = world.getPartyStats();
    await world.grantEquipment(RELIC);
    expect(world.getPartyStats()).toEqual(base);
    expect(world.getHeroFirstStrike()).toBeNull();
  });
});

describe('星紋の遺剣 — the fight', () => {
  const base = statsForLevels(1, 1);
  const held = { ...base, attackMin: base.attackMin + 2, attackMax: base.attackMax + 2 };

  it('+2: every roll lands two higher, to the point', () => {
    for (const r of [0, 0.5, 0.999]) {
      const plain = createBattle(DUMMY, undefined, { stats: base });
      const armed = createBattle(DUMMY, undefined, { stats: held });
      expect(hpLost(armed, playerAttack(armed, fixed(r))) - hpLost(plain, playerAttack(plain, fixed(r)))).toBe(2);
    }
  });

  it('×1.25: the first swing at full HP, worked out last', () => {
    for (const r of [0, 0.5, 0.999]) {
      const plain = createBattle(DUMMY, undefined, { stats: held });
      const flashing = createBattle(DUMMY, undefined, { stats: held, firstStrike: FLASH });
      const raw = hpLost(plain, playerAttack(plain, fixed(r)));
      const after = playerAttack(flashing, fixed(r));
      expect(hpLost(flashing, after)).toBe(Math.ceil(raw * 1.25));
      expect(after.log).toContain('《先手の一閃》！');
    }
  });

  it('applies once: the second swing is ordinary, and it is not double-counted', () => {
    const flashing = createBattle(DUMMY, undefined, { stats: held, firstStrike: FLASH });
    const plain = createBattle(DUMMY, undefined, { stats: held });
    const first = playerAttack(flashing, fixed(0.5));
    expect(first.firstStrike).toBeNull();
    // Heal back to full, so only "first" can stop it from applying again.
    const whole = { ...first, playerHp: first.playerMaxHp };
    const second = playerAttack(whole, fixed(0.5));
    expect(hpLost(whole, second)).toBe(hpLost(plain, playerAttack(plain, fixed(0.5))));
    expect(second.log.filter((l) => l === '《先手の一閃》！')).toHaveLength(1);
  });

  it('not at full HP: no ×1.25, and the chance is spent', () => {
    const hurt = createBattle(DUMMY, undefined, {
      stats: held,
      firstStrike: FLASH,
      condition: { hp: held.maxHp - 1, mp: held.maxMp },
    });
    const plainHurt = createBattle(DUMMY, undefined, { stats: held, condition: { hp: held.maxHp - 1, mp: held.maxMp } });
    const after = playerAttack(hurt, fixed(0.5));
    expect(hpLost(hurt, after)).toBe(hpLost(plainHurt, playerAttack(plainHurt, fixed(0.5))));
    expect(after.firstStrike).toBeNull();
    expect(after.log).not.toContain('《先手の一閃》！');
  });

  it('a skill as the first swing: 瞬断’s ×2, then ×1.25 last', () => {
    const plain = createBattle(DUMMY, undefined, { stats: held });
    const flashing = createBattle(DUMMY, undefined, { stats: held, firstStrike: FLASH });
    const r = 0.5;
    const roll = held.attackMin + Math.floor(r * (held.attackMax - held.attackMin + 1));
    expect(hpLost(plain, playerSkill(plain, SHUNDAN, fixed(r)))).toBe(Math.ceil(roll * 2));
    expect(hpLost(flashing, playerSkill(flashing, SHUNDAN, fixed(r)))).toBe(Math.ceil(roll * 2 * 1.25));
  });

  it('without it, the state is exactly what it was: no field, the same dice', () => {
    const plain = createBattle(DUMMY, undefined, { stats: base });
    expect('firstStrike' in plain).toBe(false);
    expect('firstStrike' in playerAttack(plain, fixed(0.5))).toBe(false);
  });
});

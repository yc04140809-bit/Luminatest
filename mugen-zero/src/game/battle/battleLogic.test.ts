import { describe, it, expect } from 'vitest';
import {
  NO_MODIFIERS,
  createBattle,
  grantWard,
  healPlayer,
  mendPlayer,
  playerAttack,
  playerDefend,
} from './battleLogic';

// rng() = 0 → always minimum rolls; rng() = 0.999 → maximum rolls.
const rngMin = () => 0;
const rngMax = () => 0.999;

describe('battleLogic', () => {
  it('creates a battle with full HP and ONGOING outcome', () => {
    const b = createBattle('盗賊');
    expect(b.playerHp).toBe(b.playerMaxHp);
    expect(b.enemyHp).toBe(b.enemyMaxHp);
    expect(b.outcome).toBe('ONGOING');
  });

  it('attack damages the enemy and the enemy counterattacks', () => {
    const b0 = createBattle('盗賊');
    const b1 = playerAttack(b0, rngMin);
    expect(b1.enemyHp).toBe(b0.enemyHp - 8);
    expect(b1.playerHp).toBe(b0.playerHp - 3);
  });

  it('reaches VICTORY when enemy HP hits 0, without killing (life choice comes next)', () => {
    let b = createBattle('盗賊');
    while (b.outcome === 'ONGOING') {
      b = playerAttack(b, rngMax);
    }
    expect(b.outcome).toBe('VICTORY');
    expect(b.enemyHp).toBe(0);
    // 敵HP0の後、こちらへの反撃は発生しない。
    expect(b.playerHp).toBeGreaterThan(0);
  });

  it('defend halves incoming damage (rounded up)', () => {
    const b0 = createBattle('盗賊');
    const b1 = playerDefend(b0, rngMax); // max enemy roll = 6 → halved = 3
    expect(b0.playerHp - b1.playerHp).toBe(3);
  });

  it('player can be defeated', () => {
    let b = createBattle('盗賊');
    // Never attack; take max damage until defeat.
    for (let i = 0; i < 20 && b.outcome === 'ONGOING'; i++) {
      b = { ...playerDefend(b, rngMax) };
    }
    expect(b.outcome).toBe('DEFEAT');
    expect(b.playerHp).toBe(0);
  });

  it('ignores commands once the battle is over', () => {
    let b = createBattle('盗賊');
    while (b.outcome === 'ONGOING') b = playerAttack(b, rngMax);
    const after = playerAttack(b, rngMax);
    expect(after).toEqual(b);
  });
});

describe('an enemy with a skill', () => {
  const spec = {
    name: 'モスラビット',
    hp: 22,
    attackMin: 2,
    attackMax: 5,
    attackName: 'リーフタックル',
    skill: {
      name: '苔かくれ',
      turns: 2,
      damageTaken: 0.5,
      chance: 0.4,
      cooldown: 3,
      maxUses: 2,
      line: 'モスラビットは身を低く丸めた。',
    },
  };

  it('fights with its own numbers, not the default ones', () => {
    const b = createBattle(spec);
    expect(b.enemyMaxHp).toBe(22);
    expect(b.enemyHp).toBe(22);
    expect(b.enemyName).toBe('モスラビット');
  });

  it('names its attack in the log', () => {
    const b = playerAttack(createBattle(spec), () => 0.99, 'ATTACK');
    expect(b.log.join('\n')).toContain('リーフタックル');
    expect(b.lastEnemyAction).toBe('ATTACK');
  });

  it('softens the next blows when it hides, and wears through', () => {
    // Roomy enough that the fourth blow is not the one that ends it.
    let b = playerAttack(createBattle({ ...spec, hp: 60 }), () => 0, 'SKILL');
    expect(b.lastEnemyAction).toBe('SKILL');
    expect(b.enemyGuardTurns).toBe(2);
    const before = b.enemyHp;
    // rng 0 => the player's minimum, 8; halved to 4.
    b = playerAttack(b, () => 0, 'ATTACK');
    expect(before - b.enemyHp).toBe(4);
    expect(b.enemyGuardTurns).toBe(1);
    const mid = b.enemyHp;
    b = playerAttack(b, () => 0, 'ATTACK');
    expect(mid - b.enemyHp).toBe(4);
    expect(b.enemyGuardTurns).toBe(0);
    const late = b.enemyHp;
    b = playerAttack(b, () => 0, 'ATTACK');
    expect(late - b.enemyHp).toBe(8);
  });

  it('never hides twice running, and never more than its ceiling', () => {
    // Ask for the skill on every single turn it could take one.
    let b = createBattle({ ...spec, hp: 500 });
    let used = 0;
    for (let i = 0; i < 20; i++) {
      const before = b.enemySkillUses;
      b = playerAttack(b, () => 0, 'SKILL');
      if (b.enemySkillUses > before) {
        used++;
        // It is never allowed to stack the skill on itself.
        expect(b.enemyGuardTurns).toBe(2);
      }
    }
    expect(used).toBe(spec.skill.maxUses);
  });

  it('is beaten rather than killed, like everything else here', () => {
    let b = createBattle({ ...spec, hp: 8 });
    b = playerAttack(b, () => 0.99, 'ATTACK');
    expect(b.outcome).toBe('VICTORY');
    expect(b.enemyHp).toBe(0);
  });

  it('leaves the fight winnable: a plain enemy still has no skill', () => {
    const b = createBattle('盗賊');
    expect(b.enemySkill).toBeNull();
    expect(playerAttack(b, () => 0.5).lastEnemyAction).toBe('ATTACK');
  });
});

describe('what Kaos changes about a fight', () => {
  const enemy = { name: 'モスラビット', hp: 200, attackMin: 4, attackMax: 4 };
  /** rng 0 gives the player's minimum, 8, and the enemy's only roll, 4. */
  const lowest = () => 0;

  const damageDealt = (mods?: Partial<import('./battleLogic').BattleModifiers>) => {
    const before = createBattle(enemy, { ...NO_MODIFIERS, ...mods });
    return before.enemyHp - playerAttack(before, lowest, 'ATTACK').enemyHp;
  };
  const damageTaken = (
    mods?: Partial<import('./battleLogic').BattleModifiers>,
    brace = false,
  ) => {
    const before = createBattle(enemy, { ...NO_MODIFIERS, ...mods });
    const after = brace
      ? playerDefend(before, lowest, 'ATTACK')
      : playerAttack(before, lowest, 'ATTACK');
    return before.playerHp - after.playerHp;
  };

  it('leaves a fight exactly as it was when she does nothing', () => {
    expect(damageDealt()).toBe(8);
    expect(damageTaken()).toBe(4);
    expect(createBattle(enemy).modifiers).toEqual(NO_MODIFIERS);
  });

  it('《ケイオスの加護》 makes his blows worth more', () => {
    expect(damageDealt({ playerAttack: 1.25 })).toBe(10);
  });

  it('《ケイオスの崩し》 makes the creature easier to hurt', () => {
    expect(damageDealt({ enemyDamageTaken: 1.3 })).toBe(11);
  });

  it('《ケイオスの弱体》 takes the weight out of its attacks', () => {
    expect(damageTaken({ enemyAttack: 0.7 })).toBe(3);
  });

  it('《ケイオスの守護》 takes something off what reaches him', () => {
    expect(damageTaken({ playerDamageTaken: 0.7 })).toBe(3);
  });

  it('stacks 「身構える」 with 《ケイオスの守護》 rather than one cancelling the other', () => {
    // 4 → braced alone: 2. Guarded alone: 3. Both, multiplied: 4 × 0.7 × 0.5
    // = 1.4, rounded up to 2 — better than bracing alone would have been
    // on a bigger hit, and never zero.
    expect(damageTaken({}, true)).toBe(2);
    expect(damageTaken({ playerDamageTaken: 0.7 }, true)).toBe(2);
    const big = { ...enemy, attackMin: 10, attackMax: 10 };
    const braced = createBattle(big, NO_MODIFIERS);
    const both = createBattle(big, { ...NO_MODIFIERS, playerDamageTaken: 0.7 });
    expect(braced.playerHp - playerDefend(braced, lowest, 'ATTACK').playerHp).toBe(5);
    expect(both.playerHp - playerDefend(both, lowest, 'ATTACK').playerHp).toBe(4);
  });

  it('never lets a stack of help reach zero, go negative, or stop being a number', () => {
    const absurd = {
      playerAttack: 0.0001,
      playerDamageTaken: 0.0001,
      enemyAttack: 0.0001,
      enemyDamageTaken: 0.0001,
    };
    expect(damageDealt(absurd)).toBe(1);
    expect(damageTaken(absurd, true)).toBe(1);
    // And rubbish in the numbers is ignored rather than propagated.
    const broken = {
      playerAttack: NaN,
      playerDamageTaken: -3,
      enemyAttack: Number.POSITIVE_INFINITY,
      enemyDamageTaken: 0,
    };
    const dealt = damageDealt(broken);
    const taken = damageTaken(broken);
    expect(Number.isFinite(dealt)).toBe(true);
    expect(dealt).toBeGreaterThan(0);
    expect(Number.isFinite(taken)).toBe(true);
    expect(taken).toBeGreaterThan(0);
  });

  it('belongs to this battle and no other', () => {
    const helped = createBattle(enemy, { ...NO_MODIFIERS, playerAttack: 1.25 });
    const after = playerAttack(helped, lowest, 'ATTACK');
    expect(after.modifiers.playerAttack).toBe(1.25);
    // A new fight starts from nothing unless it is told otherwise.
    expect(createBattle(enemy).modifiers).toEqual(NO_MODIFIERS);
  });
});

describe('something healing the player mid-fight', () => {
  const spec = { name: 'モスラビット', hp: 22, attackMin: 2, attackMax: 5 };

  it('puts health back, and says how much', () => {
    const hurt = { ...createBattle(spec), playerHp: 20 };
    const healed = healPlayer(hurt, 8, '《森の息吹》');
    expect(healed.playerHp).toBe(28);
    expect(healed.log.at(-2)).toBe('《森の息吹》');
    expect(healed.log.at(-1)).toContain('8回復');
  });

  it('never goes over full, and never silently over-heals', () => {
    const nearly = { ...createBattle(spec), playerHp: 38 };
    const healed = healPlayer(nearly, 8);
    expect(healed.playerHp).toBe(40);
    expect(healed.log.at(-1)).toContain('2回復');
  });

  it('at full health does nothing, and says so rather than lying', () => {
    // A player who spent their one summon on this deserves to be told
    // it did nothing, not left wondering whether the button worked.
    const full = createBattle(spec);
    const healed = healPlayer(full, 8);
    expect(healed.playerHp).toBe(40);
    expect(healed.log.at(-1)).toBe('HPはもう満ちている。');
  });

  it('does not take the player’s turn: the creature does not get to move', () => {
    const hurt = { ...createBattle(spec), playerHp: 20 };
    const healed = healPlayer(hurt, 5);
    expect(healed.lastEnemyAction).toBe(hurt.lastEnemyAction);
    expect(healed.enemyHp).toBe(hurt.enemyHp);
  });

  it('cannot reopen a fight that is already over', () => {
    const won = { ...createBattle(spec), playerHp: 10, outcome: 'VICTORY' as const };
    expect(healPlayer(won, 8)).toBe(won);
  });

  it('refuses a nonsense amount rather than breaking the number', () => {
    const hurt = { ...createBattle(spec), playerHp: 20 };
    for (const amount of [Number.NaN, -5, Number.POSITIVE_INFINITY]) {
      const healed = healPlayer(hurt, amount);
      expect(Number.isInteger(healed.playerHp)).toBe(true);
      expect(healed.playerHp).toBeGreaterThanOrEqual(20);
      expect(healed.playerHp).toBeLessThanOrEqual(40);
    }
  });
});


describe('a little green left behind — 《森の加護》', () => {
  const spec = { name: 'モスラビット', hp: 22, attackMin: 4, attackMax: 4 };
  const MEND = { heal: 8, ward: 0.2 };

  it('is what a summon does for somebody who is not hurt', () => {
    // The whole point of the change: arriving at full health used to
    // mean nothing happened. It now always leaves a mark.
    const full = createBattle(spec);
    const after = mendPlayer(full, MEND, 'やわらかな風が身体を包んだ。');
    expect(after.playerHp).toBe(40);
    expect(after.wardCut).toBeGreaterThan(0);
    expect(after.log.at(-2)).toBe('やわらかな風が身体を包んだ。');
    expect(after.log.at(-1)).toBe('《森の加護》を得た。');
  });

  it('heals instead, when there is anything to heal', () => {
    const hurt = { ...createBattle(spec), playerHp: 30 };
    const after = mendPlayer(hurt, MEND, 'やわらかな風が傷を包んだ。');
    expect(after.playerHp).toBe(38);
    expect(after.wardCut).toBe(0);
    expect(after.log.at(-1)).toContain('8回復');
  });

  it('softens exactly one blow, and then it is gone', () => {
    const warded = grantWard(createBattle(spec), 0.2);
    const first = playerAttack(warded, rngMin, 'ATTACK');
    expect(first.wardCut).toBe(0);
    expect(first.log.some((l) => l.includes('そっと解けた'))).toBe(true);
    const second = playerAttack(first, rngMin, 'ATTACK');
    expect(second.log.filter((l) => l.includes('そっと解けた')).length).toBe(1);
  });

  it('actually takes something off, even against a small animal', () => {
    // The failure this replaced: a fifth off a four-point blow is 3.2,
    // which rounds back up to four. A ward that changes no number is
    // the same nothing in nicer words.
    const plain = playerAttack(createBattle(spec), rngMin, 'ATTACK');
    const guarded = playerAttack(grantWard(createBattle(spec), 0.2), rngMin, 'ATTACK');
    expect(40 - guarded.playerHp).toBeLessThan(40 - plain.playerHp);
    expect(40 - guarded.playerHp).toBeGreaterThanOrEqual(1);
  });

  it('never softens a blow away to nothing', () => {
    const oneHit = { name: 'モスラビット', hp: 22, attackMin: 1, attackMax: 1 };
    const after = playerAttack(grantWard(createBattle(oneHit), 0.35), rngMin, 'ATTACK');
    expect(40 - after.playerHp).toBe(1);
  });

  it('waits for a blow: hiding does not spend it', () => {
    const skill = {
      name: '苔かくれ',
      turns: 2,
      damageTaken: 0.4,
      chance: 1,
      cooldown: 2,
      maxUses: 2,
      line: '苔にもぐった。',
    };
    const warded = grantWard(createBattle({ ...spec, skill }), 0.2);
    const hid = playerAttack(warded, rngMin, 'SKILL');
    expect(hid.lastEnemyAction).toBe('SKILL');
    expect(hid.wardCut).toBe(0.2);
  });

  it('never outclasses a spent turn', () => {
    // 《身構える》 halves a blow and costs the player their turn.
    // A ward that arrived for free must stay clearly worse, whatever
    // number content asks for.
    const greedy = grantWard(createBattle(spec), 5);
    expect(greedy.wardCut).toBeLessThan(0.5);
  });

  it('stacks with bracing and with her guard, rather than replacing them', () => {
    const spec8 = { name: 'モスラビット', hp: 22, attackMin: 8, attackMax: 8 };
    const bare = playerDefend(createBattle(spec8), rngMin, 'ATTACK');
    const both = playerDefend(grantWard(createBattle(spec8), 0.35), rngMin, 'ATTACK');
    expect(40 - both.playerHp).toBeLessThan(40 - bare.playerHp);

    const kaosGuard = { ...NO_MODIFIERS, playerDamageTaken: 0.5 };
    const withHer = playerDefend(
      grantWard(createBattle(spec8, kaosGuard), 0.35),
      rngMin,
      'ATTACK',
    );
    // Everything multiplies and the floor still holds: never zero,
    // never negative, never NaN.
    expect(withHer.playerHp).toBeLessThan(40);
    expect(Number.isInteger(withHer.playerHp)).toBe(true);
    expect(40 - withHer.playerHp).toBeGreaterThanOrEqual(1);
  });

  it('dies with the battle it was granted in', () => {
    const warded = grantWard(createBattle(spec), 0.2);
    const fresh = createBattle(spec);
    expect(fresh.wardCut).toBe(0);
    expect(warded.wardCut).toBe(0.2);
  });

  it('cannot be granted after the fight is over, and refuses nonsense', () => {
    const won = { ...createBattle(spec), outcome: 'VICTORY' as const };
    expect(grantWard(won, 0.2)).toBe(won);
    for (const cut of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const after = grantWard(createBattle(spec), cut);
      expect(after.wardCut).toBeGreaterThanOrEqual(0);
      expect(after.wardCut).toBeLessThanOrEqual(0.35);
    }
  });
});

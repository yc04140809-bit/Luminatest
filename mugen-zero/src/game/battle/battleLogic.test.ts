import { describe, it, expect } from 'vitest';
import { createBattle, playerAttack, playerDefend } from './battleLogic';

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

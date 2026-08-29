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

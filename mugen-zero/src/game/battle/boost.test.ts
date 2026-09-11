import { describe, it, expect } from 'vitest';
import {
  BOOST_MAX,
  BOOST_MIN,
  boostHeld,
  castMagic,
  createBattle,
  liveBoosts,
  playerAttack,
  pull,
  type BattleState,
  type EnemySpec,
} from './battleLogic';
import { STAR_HAZE, STARLIGHT_BOLT } from '../../content/magic/magicDefs';
import { decideTurn } from './magicChoice';
import { MAGIC_DEFS } from '../../content/magic/magicDefs';
import { isBoosting, needsTargetChoice, type MagicDef } from '../../core/magic/magic';

const rngMid = () => 0.5;

/** Something that will not fall over while a four-turn boost is measured. */
const DUMMY: EnemySpec = { name: 'かかし', hp: 400, attackMin: 10, attackMax: 10 };

function unlocked(spec: EnemySpec = DUMMY): BattleState {
  return createBattle(spec, undefined, { magicUnlocked: true });
}

describe('leaning on one of the numbers the fight already multiplies by', () => {
  it('is a turn spent, the same as any other', () => {
    const before = unlocked();
    const after = castMagic(before, STAR_HAZE, rngMid, 'ATTACK');
    expect(after.turnsTaken).toBe(before.turnsTaken + 1);
    expect(after.playerMp).toBe(before.playerMp - STAR_HAZE.mpCost);
    // And the creature answered, which is what makes it a turn rather
    // than a free action.
    expect(after.lastEnemyAction).toBe('ATTACK');
  });

  it('takes nothing off the creature: it is not a small attack', () => {
    const before = unlocked();
    expect(castMagic(before, STAR_HAZE, rngMid, 'GUARD').enemyHp).toBe(before.enemyHp);
  });

  it('is standing for the creature’s reply to the very turn it was cast', () => {
    // The point of the spell. If it only started on the NEXT turn it
    // would be a turn of free damage every time, and nobody would cast
    // it while anything was happening.
    const plain = castMagic(unlocked(), STARLIGHT_BOLT, rngMid, 'ATTACK');
    const hazed = castMagic(unlocked(), STAR_HAZE, rngMid, 'ATTACK');
    const plainTook = plain.playerMaxHp - plain.playerHp;
    const hazedTook = hazed.playerMaxHp - hazed.playerHp;
    expect(hazedTook).toBeLessThan(plainTook);
  });

  it('holds for the turns it says and then lets go, with nothing to tick', () => {
    let state = castMagic(unlocked(), STAR_HAZE, rngMid, 'GUARD');
    expect(boostHeld(state, 'enemyAttack')).toBe(true);
    // Four turns means four of the player's turns after the cast.
    for (let i = 0; i < 3; i++) {
      state = playerAttack(state, rngMid, 'GUARD');
      expect(boostHeld(state, 'enemyAttack'), `turn ${i}`).toBe(true);
    }
    state = playerAttack(state, rngMid, 'GUARD');
    expect(boostHeld(state, 'enemyAttack')).toBe(false);
    expect(pull(state, 'enemyAttack')).toBe(1);
  });

  it('says in the log what it did and how long for', () => {
    const after = castMagic(unlocked(), STAR_HAZE, rngMid, 'GUARD');
    const said = after.log.join('\n');
    expect(said).toContain('星霞');
    expect(said).toContain('鈍った');
    expect(said).toContain('4ターン');
  });
});

describe('what the boosts may and may not do to a number', () => {
  it('leaves a fight with none of them multiplying by exactly what it always did', () => {
    const state = unlocked();
    expect(state.boosts).toEqual([]);
    for (const stat of ['playerAttack', 'playerDamageTaken', 'enemyAttack', 'enemyDamageTaken'] as const) {
      expect(pull(state, stat)).toBe(state.modifiers[stat]);
    }
  });

  it('never lets a stack of them reach zero or run away', () => {
    const state = unlocked();
    const stacked: BattleState = {
      ...state,
      boosts: Array.from({ length: 12 }, () => ({
        stat: 'playerAttack' as const,
        factor: 0.1,
        until: 99,
        name: 'test',
        kind: 'DEBUFF' as const,
      })),
    };
    expect(pull(stacked, 'playerAttack')).toBe(BOOST_MIN);
    const raised: BattleState = {
      ...stacked,
      boosts: stacked.boosts.map((b) => ({ ...b, factor: 4 })),
    };
    expect(pull(raised, 'playerAttack')).toBe(BOOST_MAX);
  });

  it('does not clamp what the world set from outside the fight', () => {
    // The ceiling is on HER spells, not on a story beat that says this
    // fight is three times as dangerous. Clamping that here would be
    // this function overruling the thing that set it.
    const state = createBattle(
      DUMMY,
      { playerAttack: 3, playerDamageTaken: 1, enemyAttack: 1, enemyDamageTaken: 1 },
      { magicUnlocked: true },
    );
    expect(pull(state, 'playerAttack')).toBe(3);
  });

  it('drops the spent ones rather than growing a list across a long fight', () => {
    let state = castMagic(unlocked(), STAR_HAZE, rngMid, 'GUARD');
    for (let i = 0; i < 6; i++) state = playerAttack(state, rngMid, 'GUARD');
    state = castMagic(state, STAR_HAZE, rngMid, 'GUARD');
    expect(state.boosts).toHaveLength(1);
    expect(liveBoosts(state)).toHaveLength(1);
  });

  it('changes nothing when content writes a boost spell with no boost on it', () => {
    const broken: MagicDef = { ...STAR_HAZE, boost: undefined };
    const before = unlocked();
    const after = castMagic(before, broken, rngMid, 'GUARD');
    expect(after.boosts).toEqual([]);
    expect(after.playerMp).toBe(before.playerMp - broken.mpCost);
    expect(after.log.join('')).toContain('何も起こらなかった');
  });
});

describe('an unattended player, given something that pays out later', () => {
  it('does not open a fight with it: nobody knows yet how long it will be', () => {
    expect(decideTurn(unlocked(), MAGIC_DEFS).magicId).not.toBe('star_haze');
  });

  it('reaches for it once the fight has shown it has length to it', () => {
    const going: BattleState = { ...unlocked(), turnsTaken: 2 };
    expect(decideTurn(going, MAGIC_DEFS)).toEqual({ action: 'MAGIC', magicId: 'star_haze' });
  });

  it('does not cast a second one over the first', () => {
    const going: BattleState = { ...unlocked(), turnsTaken: 2 };
    const hazed = castMagic(going, STAR_HAZE, rngMid, 'GUARD');
    expect(decideTurn(hazed, MAGIC_DEFS).magicId).not.toBe('star_haze');
  });

  it('does not spend a turn on it with the creature nearly down', () => {
    const nearly: BattleState = { ...unlocked(), turnsTaken: 2, enemyHp: 20 };
    expect(decideTurn(nearly, MAGIC_DEFS).magicId).not.toBe('star_haze');
  });

  it('does not spend the last of her power on it', () => {
    const spent: BattleState = { ...unlocked(), turnsTaken: 2, playerMp: 10 };
    expect(decideTurn(spent, MAGIC_DEFS).magicId).not.toBe('star_haze');
  });
});

describe('the words a spell is written in', () => {
  it('calls the support one a support one', () => {
    expect(isBoosting(STAR_HAZE)).toBe(true);
    expect(isBoosting(STARLIGHT_BOLT)).toBe(false);
  });

  it('asks nobody to choose a target while there is only one of anything', () => {
    for (const spell of MAGIC_DEFS) expect(needsTargetChoice(spell, 1), spell.id).toBe(false);
  });

  it('would ask the day a field held two of them', () => {
    expect(needsTargetChoice(STARLIGHT_BOLT, 2)).toBe(true);
    // And still would not for one that reaches everybody anyway.
    expect(needsTargetChoice({ ...STARLIGHT_BOLT, target: 'ALL_ENEMIES' }, 2)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import {
  createBattle,
  itemRefusalLine,
  playerAttack,
  refuseItem,
  useItem,
  type BattleState,
} from './battleLogic';
import { itemDef } from '../../content/economy/itemDefs';
import type { ItemUse } from '../../core/economy/items';
import { statsForLevels } from '../../core/progression/levelStats';

/**
 * THE HERB, WHICH WAS A THING YOU SOLD.
 *
 * Until now the only thing a player could do with a herb was sell it,
 * which meant the shop was a place to turn one number into another.
 * This is the round that makes it a decision.
 */

const HERB = itemDef('FOREST_HERB')!;
const USE = HERB.use!;
/** Always the same fight: nothing here is about the dice. */
const fixed = (n: number) => () => n;

/**
 * SOMEBODY WHO BARELY HITS BACK.
 *
 * `forcedEnemyAction: 'NONE'` does NOT mean "the creature does
 * nothing" — the forcing only chooses between hiding and swinging, and
 * anything else leaves it to the dice. A test that wants to measure
 * healing and nothing else needs a creature whose blow is worth
 * nought, not a flag that was never going to stop it.
 *
 * Even then a blow is floored at one — a creature that swings and does
 * literally nothing reads as a bug — so what the creature took is
 * subtracted rather than assumed away.
 */
const HARMLESS = { name: 'かかし', hp: 500, attackMin: 0, attackMax: 0 };

function hurt(state: BattleState, by: number): BattleState {
  return { ...state, playerHp: Math.max(1, state.playerHp - by) };
}

describe('the herb itself', () => {
  it('says what it does, and where', () => {
    expect(USE.kind).toBe('HEAL');
    expect(USE.amount).toBeGreaterThan(0);
    // In a fight only, and that is the truth about the game rather
    // than a restriction: health is full at the start of every fight,
    // so a herb on the road would heal nothing and be gone.
    expect(USE.where).toBe('BATTLE_ONLY');
  });

  it('is worth less than it costs to buy, but only just', () => {
    // Otherwise the shop is a health vending machine and the fight is
    // a question of how much LUMI you brought.
    expect(USE.amount).toBeLessThan(createBattle('だれか').playerMaxHp / 2);
  });
});

describe('using one', () => {
  it('puts health back and spends the turn', () => {
    const start = hurt(createBattle(HARMLESS), 50);
    const after = useItem(start, USE, fixed(0.5), 'NONE');
    expect(after.playerHp).toBe(start.playerHp + USE.amount - after.lastEnemyDamage);
    expect(after.turnsTaken, 'using it IS the turn').toBe(start.turnsTaken + 1);
  });

  /**
   * The rule the whole thing rests on. A game where drinking a potion
   * is free is a game whose answer to being hurt is always "drink a
   * potion", and the fight stops being a sequence of decisions.
   */
  it('hands the creature its turn, exactly as a spell does', () => {
    const start = hurt(createBattle('だれか'), 50);
    const after = useItem(start, USE, fixed(0.5), 'ATTACK');
    expect(after.lastEnemyAction).toBe('ATTACK');
    expect(after.lastEnemyDamage).toBeGreaterThan(0);
  });

  it('never heals past full', () => {
    const start = hurt(createBattle(HARMLESS), 5);
    const after = useItem(start, USE, fixed(0.5), 'NONE');
    expect(after.playerHp).toBe(after.playerMaxHp - after.lastEnemyDamage);
  });

  it('does not swing — the creature is untouched', () => {
    const start = hurt(createBattle(HARMLESS), 50);
    const after = useItem(start, USE, fixed(0.5), 'NONE');
    expect(after.enemyHp).toBe(start.enemyHp);
  });

  it('says so in the log, in the item’s own words', () => {
    const start = hurt(createBattle(HARMLESS), 50);
    const after = useItem(start, USE, fixed(0.5), 'NONE');
    expect(after.log).toContain(USE.line);
    expect(after.log.some((l) => l.includes(`HPが${USE.amount}回復した`))).toBe(true);
  });
});

/** A refusal is a reason, never a silent nothing. */
describe('when it cannot be used', () => {
  it('because there are none left', () => {
    const state = hurt(createBattle('だれか'), 50);
    expect(refuseItem(state, USE, 0)).toBe('NONE_LEFT');
    expect(itemRefusalLine('NONE_LEFT', HERB.name)).toContain(HERB.name);
  });

  it('because there is no wound', () => {
    const state = createBattle('だれか');
    expect(refuseItem(state, USE, 3)).toBe('ALREADY_WELL');
  });

  it('because the fight is over', () => {
    const state: BattleState = { ...hurt(createBattle('だれか'), 50), outcome: 'VICTORY' };
    expect(refuseItem(state, USE, 3)).toBe('FIGHT_OVER');
  });

  it('because this is not a fight', () => {
    expect(refuseItem(null, USE, 3)).toBe('NOT_IN_A_FIGHT');
    const anywhere: ItemUse = { ...USE, where: 'ANYWHERE' };
    expect(refuseItem(null, anywhere, 3)).toBeNull();
  });

  it('and a refused use changes nothing at all', () => {
    const well = createBattle('だれか');
    expect(useItem(well, USE, fixed(0.5), 'ATTACK')).toBe(well);
  });

  it('every reason has something to say', () => {
    for (const reason of ['FIGHT_OVER', 'NOT_IN_A_FIGHT', 'NONE_LEFT', 'ALREADY_WELL'] as const) {
      expect(itemRefusalLine(reason, '薬草').length, reason).toBeGreaterThan(3);
    }
  });
});

describe('a herb at a higher level', () => {
  /**
   * Flat, not a share of the maximum — so the first herb a player buys
   * is not still the best answer at level twenty.
   */
  it('is worth relatively less, because the bar is longer', () => {
    const low = createBattle('だれか', undefined, { stats: statsForLevels(1, 1) });
    const high = createBattle('だれか', undefined, { stats: statsForLevels(10, 10) });
    const shareLow = USE.amount / low.playerMaxHp;
    const shareHigh = USE.amount / high.playerMaxHp;
    expect(shareHigh).toBeLessThan(shareLow);
  });
});

describe('levels in a real fight', () => {
  it('make the same swing hurt more', () => {
    const rabbit = { name: 'モスラビット', hp: 500, attackMin: 0, attackMax: 0 };
    const at = (level: number) => {
      const start = createBattle(rabbit, undefined, { stats: statsForLevels(level, 1) });
      const after = playerAttack(start, fixed(0.5), 'NONE');
      return start.enemyHp - after.enemyHp;
    };
    expect(at(5)).toBeGreaterThan(at(1));
    expect(at(1), 'and level one is what it always was').toBe(10);
  });

  it('give a longer bar and a deeper pool', () => {
    const one = createBattle('だれか', undefined, { stats: statsForLevels(1, 1) });
    const five = createBattle('だれか', undefined, { stats: statsForLevels(5, 5) });
    expect(five.playerMaxHp).toBeGreaterThan(one.playerMaxHp);
    expect(five.playerMaxMp).toBeGreaterThan(one.playerMaxMp);
    expect(five.playerHp, 'and a fight starts full, whatever the bar is').toBe(five.playerMaxHp);
  });
});

import { describe, it, expect } from 'vitest';
import {
  GUARD_MP_GAIN,
  createBattle,
  itemRefusalLine,
  playerAttack,
  refuseItem,
  useItem,
  useYield,
  type BattleState,
} from './battleLogic';
import { ITEM_DEFS, itemDef } from '../../content/economy/itemDefs';
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

const hurt50 = (state: BattleState): BattleState => hurt(state, 50);

function hurt(state: BattleState, by: number): BattleState {
  return { ...state, playerHp: Math.max(1, state.playerHp - by) };
}

describe('the herb itself', () => {
  it('says what it does, and where', () => {
    expect(USE.kind).toBe('HEAL');
    expect(USE.amount).toBeGreaterThan(0);
    // IT WAS BATTLE_ONLY, and that was the truth at the time rather
    // than a restriction: health was full at the start of every fight,
    // so a herb on the road would have healed nothing and been gone.
    // What changed is the game — the party carries what a fight cost
    // them out of it now — so the herb is worth drinking in both
    // places and says so.
    expect(USE.where).toBe('BOTH');
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

  it('because of where the player is standing, either way round', () => {
    // The herb is good in both places now, so the rule is tested with
    // the two shapes that are NOT: a thing only a fight is good for,
    // and a thing only the road is.
    const inFightsOnly: ItemUse = { ...USE, where: 'BATTLE_ONLY' };
    const onTheRoadOnly: ItemUse = { ...USE, where: 'FIELD_ONLY' };
    expect(refuseItem(null, inFightsOnly, 3)).toBe('NOT_IN_A_FIGHT');
    expect(refuseItem(null, USE, 3), 'and the herb is fine out here').toBeNull();

    const hurt = hurt50(createBattle(HARMLESS));
    expect(refuseItem(hurt, onTheRoadOnly, 3)).toBe('NOT_IN_THE_FIELD');
    expect(refuseItem(hurt, inFightsOnly, 3)).toBeNull();
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

describe('the second thing in the bag', () => {
  const WATER = itemDef('MANA_WATER')!;
  const DRINK = WATER.use!;

  it('fills the other bar', () => {
    const start: BattleState = { ...createBattle(HARMLESS), playerMp: 10 };
    const after = useItem(start, DRINK, fixed(0.5), 'NONE');
    expect(after.playerMp).toBe(10 + DRINK.amount);
    expect(after.playerHp, 'and leaves the first one alone').toBe(
      start.playerHp - after.lastEnemyDamage,
    );
  });

  it('is refused when the magic is already there', () => {
    const full = createBattle(HARMLESS);
    expect(refuseItem(full, DRINK, 2)).toBe('ALREADY_FULL');
    expect(itemRefusalLine('ALREADY_FULL', WATER.name).length).toBeGreaterThan(3);
    expect(useItem(full, DRINK, fixed(0.5), 'NONE'), 'and nothing happens').toBe(full);
  });

  it('never fills past the top', () => {
    const start: BattleState = { ...createBattle(HARMLESS), playerMp: 44 };
    const after = useItem(start, DRINK, fixed(0.5), 'NONE');
    expect(after.playerMp).toBe(after.playerMaxMp);
  });

  it('costs the turn, exactly as the herb does', () => {
    const start: BattleState = { ...createBattle(HARMLESS), playerMp: 10 };
    const after = useItem(start, DRINK, fixed(0.5), 'ATTACK');
    expect(after.turnsTaken).toBe(start.turnsTaken + 1);
    expect(after.lastEnemyAction).toBe('ATTACK');
  });

  /**
   * THE WHOLE OF THE BALANCE, in one assertion. Bracing costs a turn
   * and gathers eight, so a flask costs a turn and gives more than
   * that — it also cost LUMI and is finite — and not so much more that
   * bracing stops being the answer in a fight where nobody bought
   * anything.
   */
  it('is worth more than bracing and less than twice a fight\u2019s worth', () => {
    expect(DRINK.amount).toBeGreaterThan(GUARD_MP_GAIN);
    expect(DRINK.amount).toBeLessThanOrEqual(GUARD_MP_GAIN * 2);
    expect(DRINK.amount).toBeLessThan(createBattle(HARMLESS).playerMaxMp / 2);
  });

  it('says which bar it filled, in the log', () => {
    const start: BattleState = { ...createBattle(HARMLESS), playerMp: 10 };
    const after = useItem(start, DRINK, fixed(0.5), 'NONE');
    expect(after.log.some((l) => l.includes(`MPが${DRINK.amount}回復した`))).toBe(true);
    expect(after.log.some((l) => l.includes('HPが')), 'and not the other one').toBe(false);
  });

  it('is a real choice: two usable things, and only one of them is this turn', () => {
    const usable = ITEM_DEFS.filter((def) => def.use);
    expect(usable.length).toBeGreaterThanOrEqual(2);
    expect(new Set(usable.map((def) => def.use!.kind)).size, 'and they do different things').toBe(
      2,
    );
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

describe('what a fight is walked into with', () => {
  /**
   * NEW THIS ROUND, and the whole reason a herb can be drunk on the
   * road: the party carries what a fight cost them out of it, so there
   * is a wound out there for an item to close.
   */
  it('is whole when nothing says otherwise — every fight before this one', () => {
    const fresh = createBattle(HARMLESS);
    expect(fresh.playerHp).toBe(fresh.playerMaxHp);
    expect(fresh.playerMp).toBe(fresh.playerMaxMp);
  });

  it('is what the world carried in', () => {
    const carried = createBattle(HARMLESS, undefined, { condition: { hp: 42, mp: 7 } });
    expect(carried.playerHp).toBe(42);
    expect(carried.playerMp).toBe(7);
    expect(carried.playerMaxHp, 'and the ceiling is still the level’s').toBe(100);
  });

  /** A saved condition must never become a bigger bar than the level allows. */
  it('is never more than the party can hold', () => {
    const over = createBattle(HARMLESS, undefined, { condition: { hp: 9999, mp: 9999 } });
    expect(over.playerHp).toBe(over.playerMaxHp);
    expect(over.playerMp).toBe(over.playerMaxMp);
  });

  it('is never nothing: nobody walks into a fight at zero', () => {
    const ruined = createBattle(HARMLESS, undefined, { condition: { hp: 0, mp: -5 } });
    expect(ruined.playerHp).toBe(1);
    expect(ruined.playerMp).toBe(0);
  });

  it('and a herb drunk out there is worth exactly what it is worth in here', () => {
    const wounded = { hp: 40, maxHp: 100, mp: 0, maxMp: 48 };
    expect(useYield(USE, wounded).given).toBe(USE.amount);
    const nearlyWell = { hp: 95, maxHp: 100, mp: 0, maxMp: 48 };
    expect(useYield(USE, nearlyWell).given, 'only what there is room for').toBe(5);
  });
});

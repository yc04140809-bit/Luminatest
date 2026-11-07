import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { itemDef } from '../../content/economy/itemDefs';
import { BATTLE_HP_HOLDER, BATTLE_MP_HOLDER } from '../party/condition';

/**
 * USING SOMETHING OUT OF THE BAG, OUTSIDE A FIGHT.
 *
 * The thing and the effect are one commit, which is what these are
 * really about: the two ways it could come apart — a herb that
 * vanished without healing, and one that healed without being spent —
 * are both bugs a player would notice immediately.
 */

let dbCounter = 0;
const freshDbName = () => `bag-use-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));

const HERB = itemDef('FOREST_HERB')!;
const WATER = itemDef('MANA_WATER')!;

async function put(dbName: string, key: string, value: unknown) {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
  tx.objectStore(WORLD_STATE_STORE).put({ key, value });
  await txDone(tx);
  db.close();
}

/**
 * Someone carrying things, with something to spend them on.
 *
 * HURT WHERE THE ITEMS AIM. A herb goes to whoever holds the health
 * bar the fight uses and a flask to whoever holds the magic, so those
 * are the two rows that need a gap in them for any of this to be a
 * test of anything.
 */
async function aWoundedWorld(dbName: string): Promise<World> {
  const world = await open(dbName);
  await world.addItem('FOREST_HERB', 1);
  await world.addItem('MANA_WATER', 1);
  await world.addItem('ROUND_ACORN', 1);
  await world.setBattleCondition({
    hp: world.getBattleCondition().hp - 50,
    mp: world.getBattleCondition().mp - 20,
  });
  return world;
}

const hpOf = (world: World) => world.getCharacterCondition(BATTLE_HP_HOLDER).currentHp;
const mpOf = (world: World) => world.getCharacterCondition(BATTLE_MP_HOLDER).currentMp;

describe('a world nobody has fought in', () => {
  it('is whole, everybody, and has no row saying so', async () => {
    const world = await open(freshDbName());
    for (const row of Object.values(world.getPartyCondition())) {
      expect(row.currentHp).toBe(row.maxHp);
      expect(row.currentMp).toBe(row.maxMp);
    }
  });
});

describe('using a herb on the road', () => {
  it('heals, spends one, and says what it did', async () => {
    const world = await aWoundedWorld(freshDbName());
    const before = hpOf(world);
    const wasMp = mpOf(world);
    const result = await world.useItemFromBag('FOREST_HERB');
    expect(result.ok).toBe(true);
    expect(result.given).toBe(HERB.use!.amount);
    expect(result.stat).toBe('HP');
    expect(result.name).toBe(HERB.name);
    expect(result.targetId, 'to whoever holds the bar it fills').toBe(BATTLE_HP_HOLDER);
    expect(hpOf(world)).toBe(before + HERB.use!.amount);
    expect(world.getItemCount('FOREST_HERB'), 'and it is gone').toBe(0);
    expect(mpOf(world), 'the other bar is untouched').toBe(wasMp);
  });

  it('never heals past the top', async () => {
    const dbName = freshDbName();
    const world = await aWoundedWorld(dbName);
    const max = world.getCharacterCondition(BATTLE_HP_HOLDER).maxHp;
    await world.setBattleCondition({ hp: max - 5, mp: 0 });
    const result = await world.useItemFromBag('FOREST_HERB');
    expect(result.given, 'only what there was room for').toBe(5);
    expect(hpOf(world)).toBe(max);
  });

  it('is refused at full health, and costs nothing', async () => {
    const world = await aWoundedWorld(freshDbName());
    await world.restoreParty();
    const result = await world.useItemFromBag('FOREST_HERB');
    expect(result.ok).toBe(false);
    expect(result.refusal).toBe('ALREADY_WELL');
    expect(world.getItemCount('FOREST_HERB'), 'still there').toBe(1);
  });
});

describe('using a flask on the road', () => {
  it('fills the other bar', async () => {
    const world = await aWoundedWorld(freshDbName());
    const wasHp = hpOf(world);
    const wasMp = mpOf(world);
    const result = await world.useItemFromBag('MANA_WATER');
    expect(result.ok).toBe(true);
    expect(result.stat).toBe('MP');
    expect(result.targetId).toBe(BATTLE_MP_HOLDER);
    expect(mpOf(world)).toBe(wasMp + WATER.use!.amount);
    expect(hpOf(world)).toBe(wasHp);
    expect(world.getItemCount('MANA_WATER')).toBe(0);
  });

  it('is refused when the magic is already there', async () => {
    const dbName = freshDbName();
    const world = await aWoundedWorld(dbName);
    const maxMp = world.getCharacterCondition(BATTLE_MP_HOLDER).maxMp;
    await world.setBattleCondition({ hp: 10, mp: maxMp });
    const result = await world.useItemFromBag('MANA_WATER');
    expect(result.refusal).toBe('ALREADY_FULL');
    expect(world.getItemCount('MANA_WATER')).toBe(1);
  });
});

describe('everything that must not happen', () => {
  it('an acorn is not a potion', async () => {
    const world = await aWoundedWorld(freshDbName());
    const result = await world.useItemFromBag('ROUND_ACORN');
    expect(result.ok).toBe(false);
    expect(world.getItemCount('ROUND_ACORN'), 'and it is still an acorn').toBe(1);
  });

  it('nothing in the bag is nothing to use', async () => {
    const world = await open(freshDbName());
    await world.setBattleCondition({ hp: 10, mp: 0 });
    const result = await world.useItemFromBag('FOREST_HERB');
    expect(result.refusal).toBe('NONE_LEFT');
    expect(hpOf(world), 'and nothing was healed').toBe(10);
  });

  it('an itemId nobody has heard of does not take the game down', async () => {
    const world = await aWoundedWorld(freshDbName());
    const before = world.getPartyCondition();
    const result = await world.useItemFromBag('A_THING_THAT_DOES_NOT_EXIST');
    expect(result.ok).toBe(false);
    expect(world.getPartyCondition()).toEqual(before);
  });

  it('a quantity can never go below nought', async () => {
    const dbName = freshDbName();
    const world = await aWoundedWorld(dbName);
    await world.useItemFromBag('FOREST_HERB');
    const again = await world.useItemFromBag('FOREST_HERB');
    expect(again.refusal).toBe('NONE_LEFT');
    expect(world.getItemCount('FOREST_HERB')).toBe(0);
    const bag = world.getInventory();
    expect(bag.every((stack) => stack.quantity > 0), 'no zero rows either').toBe(true);
  });
});

describe('what the save is left holding', () => {
  it('the healing and the spending, together, after a reload', async () => {
    const dbName = freshDbName();
    const world = await aWoundedWorld(dbName);
    const wanted = hpOf(world) + HERB.use!.amount;
    await world.useItemFromBag('FOREST_HERB');

    const reopened = await open(dbName);
    expect(hpOf(reopened)).toBe(wanted);
    expect(reopened.getItemCount('FOREST_HERB')).toBe(0);
    expect(reopened.getItemCount('MANA_WATER'), 'and nothing else moved').toBe(1);
    expect(reopened.getSaveHealth().health).toBe('ok');
  });

  it('a refusal leaves no trace at all', async () => {
    const dbName = freshDbName();
    const world = await aWoundedWorld(dbName);
    await world.restoreParty();
    await world.useItemFromBag('FOREST_HERB');
    const reopened = await open(dbName);
    expect(reopened.getItemCount('FOREST_HERB')).toBe(1);
  });

  /** A level gained raises the ceiling; the stored number is absolute. */
  it('is read against the party they are now', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setBattleCondition({ hp: 60, mp: 10 });
    const before = world.getCharacterCondition(BATTLE_HP_HOLDER);
    await world.grantExp('hero', 400);
    const reopened = await open(dbName);
    const after = reopened.getCharacterCondition(BATTLE_HP_HOLDER);
    expect(after.maxHp).toBeGreaterThan(before.maxHp);
    // NOT still sixty: the gap is carried up, so levelling neither
    // heals nor wounds. See the level tests for the rule itself.
    expect(after.maxHp - after.currentHp).toBe(before.maxHp - before.currentHp);
  });

  it('a nonsense row reads as whole rather than as damage', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, 'party_condition', 'very hurt');
    const world = await open(dbName);
    for (const row of Object.values(world.getPartyCondition())) {
      expect(row.currentHp).toBe(row.maxHp);
      expect(row.currentMp).toBe(row.maxMp);
    }
  });

  it('a stored condition above the ceiling is clamped down, never up', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, 'party_condition', { hero: { hp: 9999, mp: 9999 } });
    const world = await open(dbName);
    for (const row of Object.values(world.getPartyCondition())) {
      expect(row.currentHp).toBe(row.maxHp);
      expect(row.currentMp).toBe(row.maxMp);
    }
  });
});

describe('a night’s rest', () => {
  /**
   * THE FREE WAY BACK, and it has to stay free: a wound carried out of
   * a fight means a player can be left too hurt to win the next one,
   * and the answer to that must never be "buy a herb".
   */
  it('puts everything back without costing anything', async () => {
    const dbName = freshDbName();
    const world = await aWoundedWorld(dbName);
    await world.restoreParty();
    for (const row of Object.values(world.getPartyCondition())) {
      expect(row.currentHp).toBe(row.maxHp);
      expect(row.currentMp).toBe(row.maxMp);
    }
    expect(world.getItemCount('FOREST_HERB'), 'and the bag is untouched').toBe(1);
    for (const row of Object.values((await open(dbName)).getPartyCondition())) {
      expect(row.currentHp).toBe(row.maxHp);
    }
  });
});

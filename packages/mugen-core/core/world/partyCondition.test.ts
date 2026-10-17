import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { BATTLE_HP_HOLDER, BATTLE_MP_HOLDER, carryUp } from '../party/condition';
import { createBattle, playerAttack } from '../../game/battle/battleLogic';
import { statsForLevels } from '../progression/levelStats';
import { expForLevel } from '../progression/levelCurve';

/**
 * WHAT A FIGHT COSTS, AFTER THE FIGHT.
 *
 * The line this round completes: a wound is a fact about a person that
 * outlives the battle it happened in. Everything here is one link in
 * that line — carried out, carried back in, healed, saved, and carried
 * UP when somebody levels.
 */

let dbCounter = 0;
const freshDbName = () => `party-condition-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));
const hero = (world: World) => world.getCharacterCondition(BATTLE_HP_HOLDER);
const kaos = (world: World) => world.getCharacterCondition(BATTLE_MP_HOLDER);

async function put(dbName: string, key: string, value: unknown) {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
  tx.objectStore(WORLD_STATE_STORE).put({ key, value });
  await txDone(tx);
  db.close();
}

describe('the shape of it', () => {
  /** A fact about PEOPLE, never one shared number. */
  it('is kept per character, with a ceiling each', async () => {
    const world = await open(freshDbName());
    const party = world.getPartyCondition();
    expect(Object.keys(party).sort()).toEqual([BATTLE_HP_HOLDER, BATTLE_MP_HOLDER].sort());
    for (const row of Object.values(party)) {
      expect(row).toHaveProperty('currentHp');
      expect(row).toHaveProperty('maxHp');
      expect(row).toHaveProperty('currentMp');
      expect(row).toHaveProperty('maxMp');
    }
  });

  it('hurts one of them without touching the other', async () => {
    const world = await open(freshDbName());
    const wasKaos = kaos(world).currentHp;
    await world.setCharacterCondition(BATTLE_HP_HOLDER, { hp: 30, mp: 5 });
    expect(hero(world).currentHp).toBe(30);
    expect(kaos(world).currentHp, 'she was not in that blow').toBe(wasKaos);
  });

  /** A fourth person is a fourth row, and the fight does not care. */
  it('carries somebody the battle has no bar for', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, 'party_condition', {
      hero: { hp: 40, mp: 10 },
      kaos: { hp: 44, mp: 12 },
      somebody_new: { hp: 7, mp: 3 },
      and_another: { hp: 9, mp: 1 },
    });
    const world = await open(dbName);
    // The two in the fight read exactly as they were stored...
    expect(hero(world).currentHp).toBe(40);
    expect(kaos(world).currentMp).toBe(12);
    // ...and the fight is unbothered by the other two.
    const battle = world.getBattleCondition();
    expect(battle).toEqual({ hp: 40, mp: 12 });
    expect(createBattle('だれか', undefined, { condition: battle }).playerHp).toBe(40);
  });

  /** Never stored: a second copy of what the level already says. */
  it('keeps no maximum on disk', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setBattleCondition({ hp: 50, mp: 20 });
    const db = await openDatabase(dbName);
    const row = await new Promise<{ value: unknown }>((resolve, reject) => {
      const rq = db
        .transaction(WORLD_STATE_STORE, 'readonly')
        .objectStore(WORLD_STATE_STORE)
        .get('party_condition');
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });
    db.close();
    expect(JSON.stringify(row.value)).not.toMatch(/max/i);
  });
});

describe('out of a fight and back into the next one', () => {
  it('walks out with what the fight left, and starts there', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    const full = world.getBattleCondition();
    expect(full.hp).toBe(hero(world).maxHp);

    await world.setBattleCondition({ hp: 70, mp: full.mp });
    expect(hero(world).currentHp, 'and it is still true at HOME').toBe(70);

    const next = createBattle('だれか', undefined, {
      stats: statsForLevels(world.getLevel('hero'), world.getLevel('kaos')),
      condition: world.getBattleCondition(),
    });
    expect(next.playerHp, 'the next fight starts where the last one ended').toBe(70);
    expect(next.playerMaxHp, 'on the same bar as ever').toBe(hero(world).maxHp);
  });

  it('starts whole when nothing has happened yet', async () => {
    const world = await open(freshDbName());
    const fresh = createBattle('だれか', undefined, { condition: world.getBattleCondition() });
    expect(fresh.playerHp).toBe(fresh.playerMaxHp);
    expect(fresh.playerMp).toBe(fresh.playerMaxMp);
  });

  /** An old save, and a broken one, both read as whole rather than dead. */
  it('starts whole for a save that has never heard of this', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, 'world_clock', { worldYear: 2, worldDay: 4 });
    const world = await open(dbName);
    expect(world.getBattleCondition().hp).toBe(hero(world).maxHp);
    expect(world.getSaveHealth().unreadableKeys).toEqual([]);
  });

  /**
   * LAST ROUND'S SHAPE. Anybody who played that build has one shared
   * `{ hp, mp }` on disk, and it is not discarded: the health it holds
   * was the front rank's and the magic was hers.
   */
  it('reads the shared row a previous build wrote', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, 'party_condition', { hp: 55, mp: 9 });
    const world = await open(dbName);
    expect(hero(world).currentHp).toBe(55);
    expect(kaos(world).currentMp).toBe(9);
    expect(kaos(world).currentHp, 'and what it never held is whole').toBe(kaos(world).maxHp);
  });

  it('is what a real fight leaves behind', async () => {
    const world = await open(freshDbName());
    let battle = createBattle(
      { name: 'かかし', hp: 400, attackMin: 4, attackMax: 4 },
      undefined,
      { condition: world.getBattleCondition() },
    );
    for (let i = 0; i < 4; i++) battle = playerAttack(battle, () => 0.5, 'ATTACK');
    expect(battle.playerHp).toBeLessThan(battle.playerMaxHp);

    await world.setBattleCondition({ hp: battle.playerHp, mp: battle.playerMp });
    expect(hero(world).currentHp).toBe(battle.playerHp);
    expect(kaos(world).currentMp).toBe(battle.playerMp);
  });
});

describe('a level, on somebody who is already hurt', () => {
  /** The rule, on its own, before any of the plumbing. */
  it('carries the gap up rather than healing or wounding', () => {
    const before = statsForLevels(1, 1);
    const after = statsForLevels(2, 2);
    expect(carryUp({ hp: 100, mp: 48 }, before, after)).toEqual({
      hp: after.maxHp,
      mp: after.maxMp,
    });
    expect(carryUp({ hp: 70, mp: 20 }, before, after)).toEqual({
      hp: 70 + (after.maxHp - before.maxHp),
      mp: 20 + (after.maxMp - before.maxMp),
    });
  });

  it('leaves a whole party whole', async () => {
    const world = await open(freshDbName());
    await world.grantExp('hero', expForLevel(2));
    await world.grantExp('kaos', expForLevel(2));
    for (const row of Object.values(world.getPartyCondition())) {
      expect(row.currentHp).toBe(row.maxHp);
      expect(row.currentMp).toBe(row.maxMp);
    }
  });

  it('leaves a hurt party hurt by exactly as much', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setBattleCondition({ hp: 70, mp: 20 });
    const was = hero(world);
    const wasHers = kaos(world);

    await world.grantExp('hero', expForLevel(2));
    await world.grantExp('kaos', expForLevel(2));

    const now = hero(world);
    const hers = kaos(world);
    expect(now.maxHp, 'a longer bar').toBeGreaterThan(was.maxHp);
    expect(now.currentHp, 'and the same gap in it').toBe(
      was.currentHp + (now.maxHp - was.maxHp),
    );
    expect(hers.currentMp).toBe(wasHers.currentMp + (hers.maxMp - wasHers.maxMp));
    // And it survives the game being closed.
    expect(hero(await open(dbName)).currentHp).toBe(now.currentHp);
  });

  /** The same rule, through the door the game actually uses. */
  it('does it through a fight’s winnings too, in the same commit', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setBattleCondition({ hp: 70, mp: 20 });
    const was = hero(world);
    const paid = await world.applyBattleReward('fight-1', {
      exp: expForLevel(2),
      lumi: 0,
      items: [],
    });
    expect(paid.levels.length).toBeGreaterThan(0);
    const now = hero(world);
    expect(now.maxHp).toBeGreaterThan(was.maxHp);
    expect(now.currentHp).toBe(was.currentHp + (now.maxHp - was.maxHp));
    expect(hero(await open(dbName)).currentHp).toBe(now.currentHp);
  });

  it('never lets the carry push anybody past their own ceiling', async () => {
    const world = await open(freshDbName());
    await world.setBattleCondition({ hp: hero(world).maxHp, mp: kaos(world).maxMp });
    await world.grantExp('hero', expForLevel(9));
    const now = hero(world);
    expect(now.currentHp).toBe(now.maxHp);
  });
});

describe('closing the game on a wound', () => {
  it('opens on the same wound', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setBattleCondition({ hp: 61, mp: 13 });
    const reopened = await open(dbName);
    expect(reopened.getBattleCondition()).toEqual({ hp: 61, mp: 13 });
    expect(reopened.getSaveHealth().health).toBe('ok');
  });

  it('and a reset takes the wound with everything else', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setBattleCondition({ hp: 12, mp: 0 });
    await world.resetWorld();
    expect(world.getBattleCondition().hp).toBe(hero(world).maxHp);
    expect((await open(dbName)).getBattleCondition().hp).toBe(hero(world).maxHp);
  });
});

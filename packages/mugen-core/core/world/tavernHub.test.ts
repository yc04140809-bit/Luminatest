import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import { tavernTrade } from '../../content/economy/tavernTrades';
import { SAVE_VERSION } from './saveSchema';

/**
 * 酒場ハブ化 Phase 1 (2026-10-09), on the world's side: a swap is the bag
 * and the night's record in one commit, refused touching nothing, once a
 * night; the music heard is kept (and a save from before reads what it
 * certainly heard); the village's piece is kept, and only a heard one.
 */

let n = 0;
const fresh = () => `tavern-hub-${++n}`;
const open = (db: string) => World.open(new IdbMemoryStore(db));
const ORE = tavernTrade('TRADE_ORE_FOR_COIN')!;
const RELICS = tavernTrade('RARE_RELICS_FOR_SHARD')!;

async function put(db: string, key: string, value: unknown) {
  const d = await openDatabase(db);
  const tx = d.transaction(WORLD_STATE_STORE, 'readwrite');
  tx.objectStore(WORLD_STATE_STORE).put({ key, value });
  await txDone(tx);
  d.close();
}

describe('a swap', () => {
  it('with enough: what is asked goes, what is given comes, and it is made', async () => {
    const w = await open(fresh());
    await w.addItem('IRON_ORE', 3);
    expect(await w.tradeItems(ORE, 1)).toBe('OK');
    expect(w.getItemCount('IRON_ORE')).toBe(1);
    expect(w.getItemCount('OLD_COIN')).toBe(1);
    expect(w.getTradesDone(1)).toEqual(['TRADE_ORE_FOR_COIN']);
  });

  it('short: refused, touching nothing', async () => {
    const w = await open(fresh());
    await w.addItem('IRON_ORE', 1);
    expect(await w.tradeItems(ORE, 1)).toBe('SHORT');
    expect(w.getItemCount('IRON_ORE')).toBe(1);
    expect(w.getItemCount('OLD_COIN')).toBe(0);
    expect(w.getTradesDone(1)).toEqual([]);
  });

  it('two things asked: both must be there', async () => {
    const w = await open(fresh());
    await w.addItem('OLD_ARROWHEAD', 1);
    expect(await w.tradeItems(RELICS, 7)).toBe('SHORT');
    await w.addItem('BROKEN_CLASP', 1);
    expect(await w.tradeItems(RELICS, 7)).toBe('OK');
    expect(w.getItemCount('OLD_ARROWHEAD')).toBe(0);
    expect(w.getItemCount('BROKEN_CLASP')).toBe(0);
    expect(w.getItemCount('MANA_SHARD')).toBe(1);
  });

  it('once a night: not again the same day, not after a reload — and again on another day', async () => {
    const db = fresh();
    const w = await open(db);
    await w.addItem('IRON_ORE', 6);
    expect(await w.tradeItems(ORE, 1)).toBe('OK');
    expect(await w.tradeItems(ORE, 1)).toBe('DONE');
    const again = await open(db);
    expect(await again.tradeItems(ORE, 1)).toBe('DONE');
    expect(again.getItemCount('IRON_ORE')).toBe(4);
    expect(again.getTradesDone(15)).toEqual([]);
    expect(await again.tradeItems(ORE, 15)).toBe('OK');
    expect(again.getTradesDone(15)).toEqual(['TRADE_ORE_FOR_COIN']);
  });

  it('a save from before, or a broken row, has made none', async () => {
    const db = fresh();
    await (await open(db)).addItem('IRON_ORE', 2);
    await put(db, 'tavernTrades', 'x');
    const w = await open(db);
    expect(w.getTradesDone(1)).toEqual([]);
    expect(await w.tradeItems(ORE, 1)).toBe('OK');
  });
});

describe('the music heard', () => {
  it('a world nobody has played has heard nothing', async () => {
    const w = await open(fresh());
    expect(w.getHeardMusic()).toEqual([]);
  });

  it('is kept as it is played, once each, in the archive’s order, across a reload', async () => {
    const db = fresh();
    const w = await open(db);
    expect(await w.markMusicHeard('TAVERN')).toBe(true);
    expect(await w.markMusicHeard('TAVERN')).toBe(false);
    await Promise.all([w.markMusicHeard('GREENWOOD_FOREST'), w.markMusicHeard('NORMAL_BATTLE')]);
    expect(await w.markMusicHeard('NOT_A_PIECE')).toBe(false);
    const again = await open(db);
    expect(again.getHeardMusic()).toEqual(['TAVERN', 'GREENWOOD_FOREST', 'NORMAL_BATTLE']);
  });

  it('a save from before reads what it certainly heard — a named hero came through the title, the opening, Kaos and the village', async () => {
    const db = fresh();
    const w = await open(db);
    await w.setHeroName('アレン');
    const again = await open(db);
    expect(again.getHeardMusic()).toEqual(['TITLE_MAIN', 'OPENING', 'KAOS_EVENT', 'ALDEN_VILLAGE']);
    // Grave met: the tavern; Gald's piece won: his.
    await again.markRead(['talk:GRAVE_MEETING']);
    await again.unlockBattleBgm('BOSS_BATTLE');
    expect(again.getHeardMusic()).toEqual(['TITLE_MAIN', 'OPENING', 'KAOS_EVENT', 'ALDEN_VILLAGE', 'TAVERN', 'BOSS_BATTLE']);
    // Not guessed: the ordinary fight's piece, the forest.
    expect(again.getHeardMusic()).not.toContain('NORMAL_BATTLE');
    expect(again.getSaveHealth().version).toBe(SAVE_VERSION);
  });
});

describe('the village’s piece', () => {
  it('only a piece heard; kept across a reload; its own again with null (or its own piece)', async () => {
    const db = fresh();
    const w = await open(db);
    expect(w.getVillageBgm()).toBeNull();
    expect(await w.setVillageBgm('BOSS_BATTLE')).toBe(false);
    await w.markMusicHeard('TAVERN');
    expect(await w.setVillageBgm('TAVERN')).toBe(true);
    expect((await open(db)).getVillageBgm()).toBe('TAVERN');
    await w.markMusicHeard('ALDEN_VILLAGE');
    expect(await w.setVillageBgm('ALDEN_VILLAGE')).toBe(true);
    expect(w.getVillageBgm()).toBeNull();
    await w.setVillageBgm('TAVERN');
    expect(await w.setVillageBgm(null)).toBe(true);
    expect((await open(db)).getVillageBgm()).toBeNull();
  });

  it('a broken row is the village’s own', async () => {
    const db = fresh();
    await open(db);
    await put(db, 'villageBgm', 'RUINS_THEME');
    await put(db, 'musicUnlocks', ['TAVERN', 'X', 3]);
    const w = await open(db);
    expect(w.getVillageBgm()).toBeNull();
    expect(w.getHeardMusic()).toEqual(['TAVERN']);
  });

  it('a reset world has heard nothing and plays the village’s own', async () => {
    const w = await open(fresh());
    await w.markMusicHeard('TAVERN');
    await w.setVillageBgm('TAVERN');
    await w.resetWorld();
    expect(w.getHeardMusic()).toEqual([]);
    expect(w.getVillageBgm()).toBeNull();
  });
});

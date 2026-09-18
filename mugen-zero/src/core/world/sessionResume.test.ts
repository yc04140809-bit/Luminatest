import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World, resumeAreaOf } from './world';
import { IdbMemoryStore, WORLD_STATE_STORE } from '../memory/idbStore';
import { openDatabase, txDone } from '../memory/idbSchema';
import type { Screen } from '../flow/types';

/**
 * WHERE THE PLAYER WAS.
 *
 * The thing the save was not keeping: a player who closed the game in
 * the middle of the map came back to the village every time.
 */

let dbCounter = 0;
const freshDbName = () => `resume-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));

async function put(dbName: string, key: string, value: unknown) {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readwrite');
  tx.objectStore(WORLD_STATE_STORE).put({ key, value });
  await txDone(tx);
  db.close();
}

async function sessionRow(dbName: string): Promise<unknown> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(WORLD_STATE_STORE, 'readonly');
  const row = await new Promise<unknown>((resolve, reject) => {
    const rq = tx.objectStore(WORLD_STATE_STORE).get('session');
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
  db.close();
  return row;
}

describe('which places a screen counts as', () => {
  it('puts everything inside the forest back on the map', () => {
    const inForest: Screen[] = [
      'GREENWOOD',
      'ENCOUNTER',
      'BATTLE',
      'BATTLE_RESULT',
      'CREATURE_LIFE_CHOICE',
    ];
    for (const screen of inForest) expect(resumeAreaOf(screen), screen).toBe('EXPLORE');
  });

  it('puts the village rooms back in the village', () => {
    for (const screen of ['HOME', 'WORLD_MEMORY', 'ARCANA', 'SETTINGS'] as Screen[]) {
      expect(resumeAreaOf(screen), screen).toBe('HOME');
    }
  });

  /**
   * The ways INTO a world rather than places in one. Nobody should come
   * back from lunch into DEV ADMIN, and resuming into the title would
   * be resuming into the question of whether to resume.
   */
  it('refuses to resume into a doorway', () => {
    for (const screen of [
      'THEME_CHOICE',
      'TITLE',
      'PROLOGUE',
      'DEV_ADMIN',
      'DEV_LOCK',
      'BATTLE_UI_PROTOTYPE',
      'CINEMATIC_PREVIEW',
    ] as Screen[]) {
      expect(resumeAreaOf(screen), screen).toBeNull();
    }
  });
});

describe('the doorway a world remembers', () => {
  it('is the village until somebody goes anywhere', async () => {
    const world = await open(freshDbName());
    expect(world.getResumeArea()).toBe('HOME');
  });

  it('survives closing the game and opening it again', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setResumeArea('EXPLORE');
    expect((await open(dbName)).getResumeArea()).toBe('EXPLORE');
  });

  it('survives being saved and reopened twice over', async () => {
    const dbName = freshDbName();
    const first = await open(dbName);
    await first.setResumeArea('EXPLORE');
    const second = await open(dbName);
    expect(second.getResumeArea()).toBe('EXPLORE');
    await second.setResumeArea('HOME');
    const third = await open(dbName);
    expect(third.getResumeArea()).toBe('HOME');
    expect(third.getSaveHealth().health).toBe('ok');
  });

  it('writes nothing when it is already where it says', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setResumeArea('EXPLORE');
    const before = await sessionRow(dbName);
    await world.setResumeArea('EXPLORE');
    // The timestamp would have moved if it had been written again.
    expect(await sessionRow(dbName)).toEqual(before);
  });

  it('is the village again after a reset', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setResumeArea('EXPLORE');
    await world.resetWorld();
    expect(world.getResumeArea()).toBe('HOME');
    expect((await open(dbName)).getResumeArea()).toBe('HOME');
  });

  /** The row where being wrong costs the least: it lands in the village. */
  it('falls back to the village when the row is nonsense', async () => {
    const dbName = freshDbName();
    await open(dbName);
    await put(dbName, 'session', 'somewhere');
    const world = await open(dbName);
    expect(world.getResumeArea()).toBe('HOME');
    await put(dbName, 'session', { screen: 'BATTLE' });
    expect((await open(dbName)).getResumeArea()).toBe('HOME');
  });

  /**
   * A doorway is not a playthrough. Somebody who opened the map once
   * and nothing else has not started a game worth offering back.
   */
  it('is not on its own a reason to offer the world back', async () => {
    const dbName = freshDbName();
    const world = await open(dbName);
    await world.setResumeArea('EXPLORE');
    expect((await open(dbName)).hasProgress()).toBe(false);
  });
});

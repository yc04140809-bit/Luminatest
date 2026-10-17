import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { READ_MARKS_CAP, readReadMarks, withMarks } from './readMarks';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { SAVE_VERSION } from './saveSchema';

/** WHAT THE PLAYER HAS LOOKED AT — the one row behind every NEW. */

let n = 0;
const fresh = () => `read-marks-test-${++n}`;
const open = (name: string) => World.open(new IdbMemoryStore(name));

describe('the row', () => {
  it('absent is nothing read; junk is repaired; never fails', () => {
    expect(readReadMarks(undefined)).toEqual({ value: [], health: 'ok' });
    for (const junk of [null, 1, 'x', {}]) expect(readReadMarks(junk)).toEqual({ value: [], health: 'repaired' });
    expect(readReadMarks(['rumor:A', 'rumor:A', 42, 'no kind', 'dest:X'])).toEqual({
      value: ['rumor:A', 'dest:X'],
      health: 'repaired',
    });
  });

  it('adds in order, never twice, and keeps the newest past its cap', () => {
    expect(withMarks(['a:1'], ['a:2', 'a:1', 'a:2', 'bad'])).toEqual(['a:1', 'a:2']);
    const full = Array.from({ length: READ_MARKS_CAP }, (_, i) => `a:${i}`);
    const next = withMarks(full, ['b:new']);
    expect(next.length).toBe(READ_MARKS_CAP);
    expect(next[next.length - 1]).toBe('b:new');
    expect(next[0]).toBe('a:1');
  });

  it('the save version did not move for it', () => {
    expect(SAVE_VERSION).toBe(3);
  });
});

describe('a world', () => {
  it('has read nothing; marks survive a restart; marking again writes nothing; WORLD MEMORY untouched', async () => {
    const name = fresh();
    const world = await open(name);
    expect(world.isRead('rumor:FOREST_GLOW')).toBe(false);
    const events = world.getKnownEvents().length;
    expect(await world.markRead(['rumor:FOREST_GLOW'])).toBe(true);
    expect(await world.markRead(['rumor:FOREST_GLOW'])).toBe(false);
    expect(world.isRead('rumor:FOREST_GLOW')).toBe(true);
    expect((await open(name)).isRead('rumor:FOREST_GLOW')).toBe(true);
    expect(world.getKnownEvents().length).toBe(events);
  });

  it('many marked at once, none lost', async () => {
    const name = fresh();
    const world = await open(name);
    const ids = Array.from({ length: 12 }, (_, i) => `rumor:R${i}`);
    await Promise.all(ids.map((id) => world.markRead([id])));
    for (const id of ids) expect(world.isRead(id)).toBe(true);
    const again = await open(name);
    for (const id of ids) expect(again.isRead(id)).toBe(true);
  });

  it('erasing the world forgets them', async () => {
    const name = fresh();
    const world = await open(name);
    await world.markRead(['note:auto_battle']);
    await world.resetWorld();
    expect(world.isRead('note:auto_battle')).toBe(false);
    expect((await open(name)).isRead('note:auto_battle')).toBe(false);
  });
});

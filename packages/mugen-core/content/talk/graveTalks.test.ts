import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { GRAVE_MEETING_ID, GRAVE_MEETING_MARK, hasMetGrave } from './graveTalks';
import { World } from '../../core/world/world';
import { IdbMemoryStore } from '../../core/memory/idbStore';

/**
 * グレイヴ's first meeting, once in a save (2026-10-07): readMarks
 * `talk:GRAVE_MEETING`, and a save from before the mark still opens.
 */

let dbCounter = 0;
const freshDbName = () => `grave-meeting-test-${++dbCounter}`;
const open = (dbName: string) => World.open(new IdbMemoryStore(dbName));

describe('his meeting, once in a save', () => {
  it('is the talk mark of his meeting', () => {
    expect(GRAVE_MEETING_MARK).toBe(`talk:${GRAVE_MEETING_ID}`);
  });

  it('a new save has not met him', async () => {
    const world = await open(freshDbName());
    expect(hasMetGrave((id) => world.isRead(id), world.getSekiryugaStage())).toBe(false);
  });

  it('once marked, he is met — and still met after the game is closed and opened', async () => {
    const name = freshDbName();
    const world = await open(name);
    expect(await world.markRead([GRAVE_MEETING_MARK])).toBe(true);
    expect(hasMetGrave((id) => world.isRead(id), world.getSekiryugaStage())).toBe(true);
    const reopened = await open(name);
    expect(hasMetGrave((id) => reopened.isRead(id), reopened.getSekiryugaStage())).toBe(true);
    // Marking it again writes nothing.
    expect(await reopened.markRead([GRAVE_MEETING_MARK])).toBe(false);
  });

  it('a save from before the mark: nothing read, no crash — met only if his story was told', () => {
    const none = () => false;
    expect(hasMetGrave(none, 'NONE')).toBe(false);
    expect(hasMetGrave(none, 'RUMOR')).toBe(false);
    expect(hasMetGrave(none, 'TOLD')).toBe(true);
    expect(hasMetGrave(none, 'BEATEN')).toBe(true);
    expect(hasMetGrave(none, 'SETTLED')).toBe(true);
  });
});

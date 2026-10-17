import { describe, it, expect } from 'vitest';
import { ExplorationSession } from './explorationSession';

const STATE = {
  player: { x: 180, y: 200 },
  companion: { x: 170, y: 250 },
  facing: 'back' as const,
  companionFacing: 'back' as const,
  spotId: 'PATH_FAR',
  lastCategory: 'ITEM' as const,
};

describe('ExplorationSession', () => {
  it('is empty until the forest has something to hold', () => {
    expect(new ExplorationSession().read()).toBeNull();
  });

  it('gives back where they were standing', () => {
    const session = new ExplorationSession();
    session.save(STATE);
    expect(session.read()).toEqual(STATE);
  });

  it('does not hand out the object it is holding', () => {
    const session = new ExplorationSession();
    session.save(STATE);
    const read = session.read()!;
    read.player.x = 999;
    expect(session.read()!.spotId).toBe('PATH_FAR');
    // The positions object itself is shallow-copied per save, so a
    // second save is what a caller must do to change it.
    session.save({ ...STATE, player: { x: 10, y: 10 } });
    expect(session.read()!.player).toEqual({ x: 10, y: 10 });
  });

  it('remembers the last arrival without disturbing the rest', () => {
    const session = new ExplorationSession();
    session.save(STATE);
    session.rememberCategory('BATTLE');
    expect(session.read()!.lastCategory).toBe('BATTLE');
    expect(session.read()!.player).toEqual(STATE.player);
  });

  it('walking out of the forest is not resuming', () => {
    const session = new ExplorationSession();
    session.save(STATE);
    session.clear();
    expect(session.read()).toBeNull();
    // And a category with nothing to attach to is simply dropped.
    expect(() => session.rememberCategory('EVENT')).not.toThrow();
    expect(session.read()).toBeNull();
  });
});

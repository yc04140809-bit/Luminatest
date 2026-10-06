import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { advanceStage, arcOpen, readSekiryugaStage, stageReached, SEKIRYUGA_STAGES } from './storyArc';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { SAVE_VERSION } from './saveSchema';
import { GALD_FUTURE_VISION_ID } from '../../content/events/galdLifeChoice';
import type { LifeChoiceId } from '../flow/types';

/**
 * THE FIRST BOSS ROUTE'S ONE ROW: the furthest stage reached. Absent in
 * an old save (reads as NONE, no schema version moved), forward only,
 * shut until Gald's four answers and the look ahead are behind the
 * player — and open after any one of the four.
 */

let n = 0;
const fresh = () => `story-arc-test-${++n}`;
const open = (name: string) => World.open(new IdbMemoryStore(name));

async function pastGald(world: World, choice: LifeChoiceId = 'SPARE') {
  await world.recordGaldLifeChoice(choice);
  await world.markExperienceSeen(GALD_FUTURE_VISION_ID);
}

describe('the row out of a save', () => {
  it('absent is NONE and healthy; junk is NONE and repaired; never fails', () => {
    expect(readSekiryugaStage(undefined)).toEqual({ value: 'NONE', health: 'ok' });
    for (const junk of [null, 42, 'LATER', [], {}, true]) {
      expect(readSekiryugaStage(junk)).toEqual({ value: 'NONE', health: 'repaired' });
    }
    for (const stage of SEKIRYUGA_STAGES) expect(readSekiryugaStage(stage)).toEqual({ value: stage, health: 'ok' });
  });

  it('moves forward only', () => {
    expect(advanceStage('NONE', 'RUMOR')).toBe('RUMOR');
    expect(advanceStage('TOLD', 'RUMOR')).toBe('TOLD');
    expect(advanceStage('RUMOR', 'BEATEN')).toBe('BEATEN');
    expect(stageReached('TOLD', 'RUMOR')).toBe(true);
    expect(stageReached('RUMOR', 'TOLD')).toBe(false);
  });

  it('opens only after the four answers AND the look ahead (or an old three-years save)', () => {
    expect(arcOpen({ galdDecided: false, visionSeen: false, oldShift: false })).toBe(false);
    expect(arcOpen({ galdDecided: true, visionSeen: false, oldShift: false })).toBe(false);
    expect(arcOpen({ galdDecided: true, visionSeen: true, oldShift: false })).toBe(true);
    expect(arcOpen({ galdDecided: true, visionSeen: false, oldShift: true })).toBe(true);
  });

  it('the save version did not move for it', () => {
    expect(SAVE_VERSION).toBe(3);
  });
});

describe('a world on the route', () => {
  it('a new world has heard nothing, and nothing can be heard before Gald', async () => {
    const world = await open(fresh());
    expect(world.getSekiryugaStage()).toBe('NONE');
    expect(world.isSekiryugaArcOpen()).toBe(false);
    expect(await world.advanceSekiryugaArc('RUMOR')).toBe(false);
    expect(world.getSekiryugaStage()).toBe('NONE');
    // Decided, but the look ahead not yet seen: still shut.
    await world.recordGaldLifeChoice('SPARE');
    expect(world.isSekiryugaArcOpen()).toBe(false);
  });

  for (const choice of ['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const) {
    it(`opens after ${choice}, like after any of the four`, async () => {
      const world = await open(fresh());
      await pastGald(world, choice);
      expect(world.isSekiryugaArcOpen()).toBe(true);
      expect(world.getGaldLifeChoice()).toBe(choice);
    });
  }

  it('moves forward, survives closing the game, and never goes back', async () => {
    const name = fresh();
    const world = await open(name);
    await pastGald(world);
    expect(await world.advanceSekiryugaArc('RUMOR')).toBe(true);
    expect(await world.advanceSekiryugaArc('RUMOR')).toBe(false);
    expect(await world.advanceSekiryugaArc('TOLD')).toBe(true);
    expect((await open(name)).getSekiryugaStage()).toBe('TOLD');
    // A rumour heard again after the master has talked cannot undo him.
    expect(await world.advanceSekiryugaArc('RUMOR')).toBe(false);
    expect((await open(name)).getSekiryugaStage()).toBe('TOLD');
  });

  it('writes no memory event: WORLD MEMORY is exactly as it was', async () => {
    const name = fresh();
    const world = await open(name);
    await pastGald(world);
    const before = world.getKnownEvents().map((e) => e.id);
    await world.advanceSekiryugaArc('RUMOR');
    await world.advanceSekiryugaArc('TOLD');
    await world.advanceSekiryugaArc('BEATEN');
    await world.advanceSekiryugaArc('SETTLED');
    expect(world.getKnownEvents().map((e) => e.id)).toEqual(before);
    expect((await open(name)).getKnownEvents().map((e) => e.id)).toEqual(before);
  });

  it('erasing the world forgets it', async () => {
    const name = fresh();
    const world = await open(name);
    await pastGald(world);
    await world.advanceSekiryugaArc('TOLD');
    await world.resetWorld();
    expect(world.getSekiryugaStage()).toBe('NONE');
    expect((await open(name)).getSekiryugaStage()).toBe('NONE');
  });
});

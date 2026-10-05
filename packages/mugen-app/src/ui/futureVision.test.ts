import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { World } from '@mugen/core/world/world';
import { IdbMemoryStore } from '@mugen/core/memory/idbStore';
import { GALD_FUTURE_VISION_YEARS } from '@mugen/content/events/galdLifeChoice';
import type { LifeChoiceId } from '@mugen/core/flow/types';
import { visionCgOf } from './futureVision';

/**
 * THE PICTURE IN THE LOOK AHEAD IS THE PLAYER'S OWN FUTURE.
 *
 * Driven through the real world and the real chains: answer, preview
 * exactly as the App's TIME SHIFT does, and ask which picture it shows.
 * One answer, one picture.
 */

let n = 0;
const openWorld = () => World.open(new IdbMemoryStore(`vision-cg-${++n}`));

const EXPECTED: Record<LifeChoiceId, string> = {
  SPARE: 'GALD_BAKER',
  HELP: 'GALD_HEALER',
  CAPTURE: 'GALD_WORKER',
  KILL: 'GALD_GRAVE',
};

describe('the look ahead shows one picture — the chosen route’s', () => {
  for (const [choice, key] of Object.entries(EXPECTED) as [LifeChoiceId, string][]) {
    it(`${choice} → ${key}, and only that`, async () => {
      const world = await openWorld();
      await world.recordGaldLifeChoice(choice);
      const before = world.getEvents().length;
      const cg = visionCgOf(world.previewLifeEvents(GALD_FUTURE_VISION_YEARS));
      expect(cg?.key).toBe(key);
      // Looking wrote nothing.
      expect(world.getEvents().length).toBe(before);
    });
  }

  it('no answer yet, no picture', async () => {
    const world = await openWorld();
    expect(visionCgOf(world.previewLifeEvents(GALD_FUTURE_VISION_YEARS))).toBeNull();
  });

  it('never guesses between two: an ambiguous preview shows nothing', () => {
    const fake = (type: string) => ({ type }) as unknown as Parameters<typeof visionCgOf>[0][number];
    expect(visionCgOf([fake('GALD_BECOMES_BAKER'), fake('GALD_BECOMES_HEALER')])).toBeNull();
    expect(visionCgOf([fake('GALD_BECOMES_BAKER')])?.key).toBe('GALD_BAKER');
  });
});

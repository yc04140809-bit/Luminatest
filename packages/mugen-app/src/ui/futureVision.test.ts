import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { World } from '@mugen/core/world/world';
import { IdbMemoryStore } from '@mugen/core/memory/idbStore';
import { GALD_FUTURE_VISION_YEARS } from '@mugen/content/events/galdLifeChoice';
import type { LifeChoiceId } from '@mugen/core/flow/types';
import { visionCgOf, visionListOf } from './futureVision';

/**
 * THE PICTURE IN THE LOOK AHEAD IS THE PLAYER'S OWN FUTURE.
 *
 * Driven through the real world and the real chains: answer, preview
 * exactly as the App's TIME SHIFT does, and ask which picture it shows.
 * One answer, one picture.
 */

let n = 0;
const openWorld = () => World.open(new IdbMemoryStore(`vision-cg-${++n}`));

const EXPECTED: Record<LifeChoiceId, string | undefined> = {
  // ROUTE D (作者 2026-10-20): outside the village, his own years draw nothing —
  // a possibility is shown instead, the roadside healer (作者 2026-11-01).
  SPARE: 'GALD_HEALER',
  // The bakery route (TIGS2027 STEP ①): the road no longer comes in the look ahead.
  HELP: 'GALD_BAKER',
  CAPTURE: 'GALD_WORKER',
  KILL: 'GALD_GRAVE',
};

describe('the look ahead shows one picture — the chosen route’s', () => {
  for (const [choice, key] of Object.entries(EXPECTED) as [LifeChoiceId, string | undefined][]) {
    it(`${choice} → ${key ?? 'no picture'}, and only that`, async () => {
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

  it('the bakery route shows its picture without the list; the other answers keep theirs', async () => {
    const help = await openWorld();
    await help.recordGaldLifeChoice('HELP');
    expect(visionCgOf(help.previewLifeEvents(GALD_FUTURE_VISION_YEARS))).toMatchObject({ key: 'GALD_BAKER', log: false });
    const capture = await openWorld();
    await capture.recordGaldLifeChoice('CAPTURE');
    expect(visionCgOf(capture.previewLifeEvents(GALD_FUTURE_VISION_YEARS))).toMatchObject({ key: 'GALD_WORKER', log: true });
  });

  it('見逃す: a possibility, still a picture (作者 2026-11-01) — the roadside healer, its line added; the merchants are not narrated', async () => {
    const spare = await openWorld();
    await spare.recordGaldLifeChoice('SPARE');
    const before = spare.getEvents().length;
    const future = spare.previewLifeEvents(GALD_FUTURE_VISION_YEARS);
    expect(future.map((e) => e.type)).toContain('GALD_SAVES_MERCHANTS');
    expect(visionCgOf(future)).toEqual({ key: 'GALD_HEALER', alt: '街道の休憩所で、旅人の腕に包帯を巻く男', log: true, possible: 'GALD_BECOMES_HEALER' });
    expect(visionListOf(future).map((e) => e.type)).toEqual(['GALD_LEAVES_BANDITS']);
    // Shown, not lived: nothing written.
    expect(spare.getEvents().length).toBe(before);
  });

  it('every answer shows a picture of him, or of his grave', async () => {
    for (const choice of ['SPARE', 'HELP', 'CAPTURE', 'KILL'] as LifeChoiceId[]) {
      const world = await openWorld();
      await world.recordGaldLifeChoice(choice);
      expect(visionCgOf(world.previewLifeEvents(GALD_FUTURE_VISION_YEARS)), choice).not.toBeNull();
    }
  });
});

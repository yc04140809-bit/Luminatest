import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { advanceFinale, eveDue, finaleBeat, finaleReached, finaleWorld, readFinaleStage, FINALE_STAGES } from './chapterFinale';

describe('第1章終盤 — the stage (2026-10-12)', () => {
  it('forward only; a stage from a save repaired if it is not one this build knows', () => {
    expect(advanceFinale('RAID', 'EVE')).toBe('RAID');
    expect(advanceFinale('RAID', 'FORM1_WON')).toBe('FORM1_WON');
    expect(readFinaleStage(undefined)).toEqual({ value: 'NONE', health: 'ok' });
    expect(readFinaleStage('STOPPED')).toEqual({ value: 'STOPPED', health: 'ok' });
    expect(readFinaleStage('LATER')).toEqual({ value: 'NONE', health: 'repaired' });
    expect(readFinaleStage(3)).toEqual({ value: 'NONE', health: 'repaired' });
    expect(finaleReached('REBUILDING', 'STOPPED')).toBe(true);
    expect(finaleReached('EVE', 'RAID')).toBe(false);
  });

  it('the night before: at a rest, once the signs are at their heaviest (PHASE 3), and only once', () => {
    expect(eveDue({ phase: 2, stage: 'NONE' })).toBe(false);
    expect(eveDue({ phase: 3, stage: 'NONE' })).toBe(true);
    expect(eveDue({ phase: 3, stage: 'EVE' })).toBe(false);
    expect(finaleBeat('NONE')).toMatchObject({ trigger: 'REST', scenes: ['EVE'], reaches: 'EVE' });
  });

  it('the beats: the morning in one go; each form after its village moment; the second form only after the first is down (not on a BREAK)', () => {
    expect(finaleBeat('EVE')).toMatchObject({ trigger: 'AUTO', scenes: ['RUINS_SEAL', 'MORNING', 'RAID', 'LURE'], then: null, reaches: 'RAID' });
    // A lost fight replays from here: Mirei's moment and the grassland's few words, not the morning.
    expect(finaleBeat('RAID')).toMatchObject({ scenes: ['VILLAGE_MIREI', 'FORM1_START'], then: 'VALSHEEL_FORM1', reaches: 'FORM1_WON' });
    expect(finaleBeat('FORM1_WON')).toMatchObject({ scenes: ['VILLAGE_RIZEL', 'SHELL_BREAK'], then: 'VALSHEEL_FORM2', reaches: 'STOPPED' });
    expect(finaleBeat('STOPPED')).toMatchObject({ trigger: 'AUTO', scenes: ['REBUILD'], reaches: 'REBUILDING' });
    // Leaving is the player's choice, from the village being rebuilt.
    expect(finaleBeat('REBUILDING')).toMatchObject({ trigger: 'DEPART', scenes: ['DEPARTURE'], then: 'END_SCREEN', reaches: 'ENDED' });
    expect(finaleBeat('ENDED')).toBeNull();
  });

  it('what each stage means: the road shut from the night before; the village broken, Kaos staying and the oven cracked from the stop on; after the end the village only', () => {
    const before = finaleWorld('NONE');
    expect(before).toMatchObject({ inSequence: false, villageBroken: false, kaosTravels: true, roadOpen: true, bakeryBakes: true, graveAtTavern: true, departure: 'NONE' });
    for (const stage of ['EVE', 'RAID', 'FORM1_WON'] as const) {
      expect(finaleWorld(stage)).toMatchObject({ inSequence: true, roadOpen: false, graveAtTavern: false, villageBroken: false, kaosTravels: true });
    }
    for (const stage of ['STOPPED', 'REBUILDING', 'ENDED'] as const) {
      expect(finaleWorld(stage)).toMatchObject({ inSequence: false, villageBroken: true, kaosTravels: false, bakeryBakes: false, roadOpen: false, graveAtTavern: true });
    }
    expect(finaleWorld('REBUILDING').departure).toBe('DEPART');
    expect(finaleWorld('ENDED').departure).toBe('NOT_YET');
    expect(FINALE_STAGES.at(-1)).toBe('ENDED');
  });
});

describe('第1章終盤 — kept in the save', () => {
  const open = (name: string) => World.open(new IdbMemoryStore(name));

  it('a new world is at NONE; a stage reached is there after reopening; never back', async () => {
    const name = `finale-${Math.random()}`;
    const w = await open(name);
    expect(w.getFinaleStage()).toBe('NONE');
    expect(await w.advanceFinaleStage('RAID')).toBe(true);
    expect(await w.advanceFinaleStage('EVE')).toBe(false);
    expect(w.getFinaleStage()).toBe('RAID');
    const again = await open(name);
    expect(again.getFinaleStage()).toBe('RAID');
  });
});

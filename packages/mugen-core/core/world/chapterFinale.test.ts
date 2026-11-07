import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { AFTER_FORM2_SCENES, advanceFinale, eveDue, finaleBeat, finaleReached, finaleWorld, readFinaleStage, FINALE_STAGES } from './chapterFinale';

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

  it('the beats (作者指示 2026-10-12): ruins→raid; the lure; the fight from the grassland’s words; the second form only after the first is down (not on a BREAK)', () => {
    expect(finaleBeat('EVE')).toMatchObject({ trigger: 'AUTO', scenes: ['RUINS_SEAL', 'MORNING', 'RAID'], then: null, reaches: 'RAID' });
    expect(finaleBeat('RAID')).toMatchObject({ trigger: 'AUTO', scenes: ['LURE', 'VILLAGE_MIREI'], then: null, reaches: 'LURED' });
    // A lost fight replays from here: the grassland's few words, never the raid.
    expect(finaleBeat('LURED')).toMatchObject({ scenes: ['FORM1_START'], then: 'VALSHEEL_FORM1', reaches: 'FORM1_WON' });
    expect(finaleBeat('FORM1_WON')).toMatchObject({ scenes: ['SHELL_BREAK'], then: 'VALSHEEL_FORM2', reaches: 'FORM2_WON' });
    expect(finaleBeat('FORM2_WON')).toMatchObject({ trigger: 'AUTO', scenes: AFTER_FORM2_SCENES, then: null, reaches: 'STOPPED' });
    expect(AFTER_FORM2_SCENES.slice(0, 3)).toEqual(['KAOS_FINISHER', 'HERO_FINISHER', 'STOPPED']);
    expect(finaleBeat('STOPPED')).toMatchObject({ trigger: 'AUTO', scenes: ['REBUILD'], reaches: 'REBUILDING' });
    // Leaving is the player's choice, from the village being rebuilt.
    expect(finaleBeat('REBUILDING')).toMatchObject({ trigger: 'DEPART', scenes: ['DEPARTURE'], then: 'END_SCREEN', reaches: 'ENDED' });
    expect(finaleBeat('ENDED')).toBeNull();
  });

  it('what each stage means: the road shut from the night before; the village broken, Kaos staying and the oven cracked from the stop on; after the end the village only', () => {
    const before = finaleWorld('NONE');
    expect(before).toMatchObject({ inSequence: false, villageBroken: false, kaosTravels: true, roadOpen: true, bakeryBakes: true, graveAtTavern: true, departure: 'NONE' });
    for (const stage of ['EVE', 'RAID', 'LURED', 'FORM1_WON', 'FORM2_WON'] as const) {
      expect(finaleWorld(stage)).toMatchObject({ inSequence: true, roadOpen: false, graveAtTavern: false, villageBroken: false, kaosTravels: true });
    }
    for (const stage of ['STOPPED', 'REBUILDING', 'ENDED'] as const) {
      expect(finaleWorld(stage)).toMatchObject({ inSequence: false, villageBroken: true, kaosTravels: false, bakeryBakes: false, roadOpen: false, graveAtTavern: true });
    }
    expect(finaleWorld('REBUILDING').departure).toBe('DEPART');
    expect(finaleWorld('ENDED').departure).toBe('NOT_YET');
    expect(FINALE_STAGES.at(-1)).toBe('ENDED');
  });

  it('the saved points, in order (作者指示: 襲撃開始前・襲撃発生済み・草原誘導済み・第2形態移行済み・戦闘終了済み); a word written before them still reads as itself', () => {
    expect(FINALE_STAGES).toEqual(['NONE', 'EVE', 'RAID', 'LURED', 'FORM1_WON', 'FORM2_WON', 'STOPPED', 'REBUILDING', 'ENDED']);
    for (const old of ['NONE', 'EVE', 'RAID', 'FORM1_WON', 'STOPPED', 'REBUILDING', 'ENDED']) expect(readFinaleStage(old)).toEqual({ value: old, health: 'ok' });
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

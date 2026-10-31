import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import {
  CUT_IN_BRIEF_FLOOR_MS,
  CUT_IN_BRIEF_MS,
  CUT_IN_FLOOR_MS,
  CUT_IN_PACE_FLOOR_MS,
  CUT_IN_PACE_MS,
  CUT_IN_MS,
  NAME_SHOWN_FROM,
  NAME_SHOWN_UNTIL,
  cutInMs,
  nameReadableMs,
} from './cutInTiming';

describe('how long a cut-in lasts', () => {
  it('is inside the lengths asked for, at ×1', () => {
    expect(CUT_IN_MS.SKILL).toBeGreaterThanOrEqual(1100);
    expect(CUT_IN_MS.SKILL).toBeLessThanOrEqual(1500);
    expect(CUT_IN_MS.FINISHER).toBeGreaterThanOrEqual(1500);
    expect(CUT_IN_MS.FINISHER).toBeLessThanOrEqual(2500);
  });

  it("keeps v18 Aria's fixed timing for a finisher: 2500ms, never under 1800ms", () => {
    expect(cutInMs('FINISHER', 1)).toBe(2500);
    expect(cutInMs('FINISHER', 2)).toBe(1800);
    // v18's own report: the name whole for ~1775ms at ×1, ~1278ms at ×2.
    expect(nameReadableMs('FINISHER', 1)).toBe(1775);
    expect(nameReadableMs('FINISHER', 2)).toBe(1278);
  });

  it('is shorter at ×2, but never below its floor', () => {
    for (const tier of ['SKILL', 'FINISHER'] as const) {
      expect(cutInMs(tier, 2)).toBeLessThan(cutInMs(tier, 1));
      for (const speed of BATTLE_SPEEDS) {
        expect(cutInMs(tier, speed)).toBeGreaterThanOrEqual(CUT_IN_FLOOR_MS[tier]);
      }
    }
  });

  it('always leaves the name readable — never the 0.38s that could not be read', () => {
    for (const tier of ['SKILL', 'FINISHER'] as const) {
      for (const speed of BATTLE_SPEEDS) {
        expect(nameReadableMs(tier, speed)).toBeGreaterThanOrEqual(750);
      }
    }
  });

  it('a party finisher (作者 2026-10-25/26): its first cut-in in a fight a little shorter, every one after shorter still — readable, never under its floor', () => {
    expect(cutInMs('FINISHER', 1, 'brisk')).toBe(CUT_IN_PACE_MS.brisk);
    expect(cutInMs('FINISHER', 1, 'brief')).toBe(CUT_IN_BRIEF_MS);
    expect(CUT_IN_PACE_MS.brisk).toBeLessThan(CUT_IN_MS.FINISHER);
    expect(CUT_IN_BRIEF_MS).toBeLessThan(CUT_IN_PACE_MS.brisk);
    for (const speed of BATTLE_SPEEDS) {
      const whole = cutInMs('FINISHER', speed);
      const brisk = cutInMs('FINISHER', speed, 'brisk');
      const brief = cutInMs('FINISHER', speed, 'brief');
      expect(brisk).toBeLessThan(whole);
      expect(brief).toBeLessThan(brisk);
      expect(brisk).toBeGreaterThanOrEqual(CUT_IN_PACE_FLOOR_MS.brisk);
      expect(brief).toBeGreaterThanOrEqual(CUT_IN_BRIEF_FLOOR_MS);
      // Still a finisher's: never shorter than an ordinary skill's; its name read whole long enough for a
      // short spoken 「彼岸花」 (well over 750ms).
      expect(brief).toBeGreaterThanOrEqual(cutInMs('SKILL', speed));
      expect(nameReadableMs('FINISHER', speed, 'brief')).toBeGreaterThanOrEqual(850);
      expect(nameReadableMs('FINISHER', speed, 'brisk')).toBeGreaterThanOrEqual(1100);
    }
    // Only a finisher has a quicker one.
    expect(cutInMs('SKILL', 1, 'brief')).toBe(cutInMs('SKILL', 1));
  });

  it("uses the stylesheet's own hold curve for the name", () => {
    const css = readFileSync(new URL('./cutin.css', import.meta.url), 'utf8');
    const copy = css.match(/@keyframes ci-copy-hold \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const shown = copy.match(/(\d+)%, (\d+)% \{ opacity: 1;/);
    expect(shown, "the name's fully-shown stretch").toBeTruthy();
    expect(Number(shown![1]) / 100).toBe(NAME_SHOWN_FROM);
    expect(Number(shown![2]) / 100).toBe(NAME_SHOWN_UNTIL);
  });
});

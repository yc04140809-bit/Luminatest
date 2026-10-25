import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import {
  CUT_IN_BRIEF_FLOOR_MS,
  CUT_IN_BRIEF_MS,
  CUT_IN_FLOOR_MS,
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

  it('a finisher seen already in this fight is the short one (作者 2026-10-25 ブラッシュアップ §4) — shorter, still readable, never under its floor', () => {
    expect(cutInMs('FINISHER', 1, true)).toBe(CUT_IN_BRIEF_MS);
    expect(CUT_IN_BRIEF_MS).toBeLessThan(CUT_IN_MS.FINISHER);
    for (const speed of BATTLE_SPEEDS) {
      expect(cutInMs('FINISHER', speed, true)).toBeLessThan(cutInMs('FINISHER', speed));
      expect(cutInMs('FINISHER', speed, true)).toBeGreaterThanOrEqual(CUT_IN_BRIEF_FLOOR_MS);
      // Still a finisher's: longer than an ordinary skill's, and its name read whole for well over 750ms.
      expect(cutInMs('FINISHER', speed, true)).toBeGreaterThanOrEqual(cutInMs('SKILL', speed));
      expect(nameReadableMs('FINISHER', speed, true)).toBeGreaterThanOrEqual(850);
    }
    // Only a finisher has a short one.
    expect(cutInMs('SKILL', 1, true)).toBe(cutInMs('SKILL', 1));
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

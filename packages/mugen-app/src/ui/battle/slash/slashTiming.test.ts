import { describe, expect, it } from 'vitest';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import { SLASH_FLOOR_MS, SLASH_MS, slashMs } from './slashTiming';

describe('how long his sword is seen', () => {
  it('is v18-length at ×1, shorter at ×2, and never below its floor', () => {
    for (const part of ['ARC', 'BITE'] as const) {
      expect(slashMs(part, 1)).toBe(SLASH_MS[part]);
      expect(slashMs(part, 2)).toBeLessThan(slashMs(part, 1));
      for (const speed of BATTLE_SPEEDS)
        expect(slashMs(part, speed)).toBeGreaterThanOrEqual(SLASH_FLOOR_MS[part]);
    }
  });

  it('stays an ordinary swing — well under a second, nothing like a cut-in', () => {
    for (const speed of BATTLE_SPEEDS) {
      expect(slashMs('ARC', speed)).toBeLessThan(500);
      expect(slashMs('BITE', speed)).toBeLessThan(500);
    }
  });
});

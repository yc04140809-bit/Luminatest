import { describe, expect, it } from 'vitest';
import {
  BATTLE_SPEEDS,
  DEFAULT_BATTLE_SPEED,
  MIN_BEAT_MS,
  beatMs,
  nextSpeed,
  speedLabel,
  type BattleSpeed,
} from './battleSpeed';

describe('watching the fight faster', () => {
  it('changes nothing at all at ×1', () => {
    // The guarantee that adopting this is invisible. Every beat the
    // battle screen holds today, unchanged.
    for (const ms of [0, 90, 300, 460, 620, 1200, 1500]) {
      expect(beatMs(ms, 1)).toBe(ms);
    }
    expect(DEFAULT_BATTLE_SPEED).toBe(1);
  });

  it('shortens a beat by the speed', () => {
    expect(beatMs(600, 2)).toBe(300);
    expect(beatMs(600, 3)).toBe(200);
  });

  it('never shortens one past being seen', () => {
    // 300 / 3 is 100, which is above the floor; 120 / 3 is 40, which is
    // not, and a blow nobody can see is not a faster fight.
    expect(beatMs(300, 3)).toBe(100);
    expect(beatMs(120, 3)).toBe(MIN_BEAT_MS);
  });

  it('leaves a beat that was never held at nought', () => {
    expect(beatMs(0, 3)).toBe(0);
  });

  it('is monotonic: faster is never slower', () => {
    for (const ms of [90, 300, 460, 620, 1500]) {
      const held = BATTLE_SPEEDS.map((s) => beatMs(ms, s));
      for (let i = 1; i < held.length; i += 1) {
        expect(held[i]).toBeLessThanOrEqual(held[i - 1]);
      }
    }
  });

  it('cycles back to the start', () => {
    let speed: BattleSpeed = DEFAULT_BATTLE_SPEED;
    const seen: BattleSpeed[] = [];
    for (let i = 0; i < BATTLE_SPEEDS.length; i += 1) {
      seen.push(speed);
      speed = nextSpeed(speed);
    }
    expect(seen).toEqual([...BATTLE_SPEEDS]);
    expect(speed).toBe(DEFAULT_BATTLE_SPEED);
  });

  it('says which one it is', () => {
    expect(BATTLE_SPEEDS.map(speedLabel)).toEqual(['×1', '×2', '×3']);
  });
});

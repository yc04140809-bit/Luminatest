import { describe, expect, it } from 'vitest';
import {
  BATTLE_SPEEDS,
  DEFAULT_BATTLE_SPEED,
  MIN_BEAT_MS,
  beatMs,
  nextSpeed,
  speedLabel,
  visualMs,
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
  });

  it('already holds a beat at a speed nobody is offered yet', () => {
    // Adding ×3 is appending it to BATTLE_SPEEDS. The timing does not
    // need to learn anything, and this is what says so.
    expect(beatMs(600, 3)).toBe(200);
    expect(speedLabel(3)).toBe('×3');
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

  it('offers normal and twice, and says which one it is', () => {
    expect(BATTLE_SPEEDS).toEqual([1, 2]);
    expect(BATTLE_SPEEDS.map(speedLabel)).toEqual(['×1', '×2']);
  });
});

/**
 * THE OTHER HALF OF SPEED.
 *
 * `beatMs` is for waiting and `visualMs` is for watching, and the
 * difference is what the ×2 fix turned on: a wait halved loses nothing,
 * a motion halved past a point loses the thing the player was reading.
 */
describe('holding a motion long enough to be seen', () => {
  it('is exactly the authored length at ×1, floor or no floor', () => {
    expect(visualMs(320, 1, 110)).toBe(320);
    expect(visualMs(320, 1, 9999)).toBe(320);
    expect(visualMs(0, 1, 500)).toBe(0);
  });

  it('shortens with speed while the shortened length is still readable', () => {
    // 320 halved is 160, and 160 is well over its floor: speed wins.
    expect(visualMs(320, 2, 110)).toBe(160);
    expect(visualMs(460, 2, 140)).toBe(230);
  });

  it('stops shortening at the floor', () => {
    // 200 halved is 100, which is under 140: the floor wins.
    expect(visualMs(200, 2, 140)).toBe(140);
    expect(visualMs(300, 3, 140)).toBe(140);
  });

  /**
   * A "minimum" that made ×2 SLOWER than ×1 would be a bug wearing the
   * word minimum. Something authored shorter than its own floor is left
   * exactly as it was.
   */
  it('never stretches a motion past the length it was authored at', () => {
    expect(visualMs(120, 2, 300)).toBe(120);
    expect(visualMs(120, 1, 300)).toBe(120);
    for (const speed of [1, 2, 3] as const) {
      expect(visualMs(90, speed, 400), `×${speed}`).toBeLessThanOrEqual(90);
    }
  });

  it('is never longer at a higher speed than at a lower one', () => {
    for (const ms of [0, 90, 120, 200, 300, 320, 460, 560, 1800]) {
      for (const floor of [0, 55, 110, 140, 180, 1200]) {
        const one = visualMs(ms, 1, floor);
        const two = visualMs(ms, 2, floor);
        const three = visualMs(ms, 3, floor);
        expect(two, `${ms}/${floor}`).toBeLessThanOrEqual(one);
        expect(three, `${ms}/${floor}`).toBeLessThanOrEqual(two);
      }
    }
  });

  it('refuses nonsense rather than producing it', () => {
    expect(visualMs(Number.NaN, 2, 140)).toBe(0);
    expect(visualMs(-500, 2, 140)).toBe(0);
    expect(visualMs(320, 2, Number.NaN)).toBe(160);
    expect(visualMs(320, 2, -99)).toBe(160);
  });

  /** Her moment, which ×2 is allowed to shorten but not to swallow. */
  it('keeps Kaos readable at speed: 1800 becomes 1200, not 900', () => {
    expect(visualMs(1800, 1, 1200)).toBe(1800);
    expect(visualMs(1800, 2, 1200)).toBe(1200);
    expect(beatMs(1800, 2)).toBe(900); // what it would have been
  });
});

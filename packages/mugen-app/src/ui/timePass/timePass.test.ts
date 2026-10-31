import { describe, it, expect } from 'vitest';
import { flipDates, minuteTurns, skyAt, skyStops, ticksAt, timePassFrame, timePassTimes, TIME_PASS_MS } from './timePass';

describe('時が流れる — the clock while a night passes (タスクH)', () => {
  it('a night: dark 0.25s, the clock to 1.15s, the date to 1.45s, light again by 1.6s', () => {
    expect(timePassTimes(1)).toEqual({ clockAt: 250, flipAt: 1150, stepMs: 300, outAt: 1450, end: 1600 });
    // Three nights: the date turns three times, one after another, a little longer.
    const three = timePassTimes(3);
    expect(three.outAt - three.flipAt).toBe(TIME_PASS_MS.flip + 2 * TIME_PASS_MS.flipMore);
    expect(three.stepMs).toBe(180);
  });

  it('the dates shown: each day of several, the year turning over; a long time in larger steps', () => {
    expect(flipDates({ worldYear: 1, worldDay: 5 }, 1)).toEqual([
      { worldYear: 1, worldDay: 5 },
      { worldYear: 1, worldDay: 6 },
    ]);
    expect(flipDates({ worldYear: 1, worldDay: 364 }, 3).map((c) => `${c.worldYear}-${c.worldDay}`)).toEqual(['1-364', '1-365', '2-1', '2-2']);
    const year = flipDates({ worldYear: 1, worldDay: 1 }, 365);
    expect(year).toHaveLength(7);
    expect(year.at(-1)).toEqual({ worldYear: 2, worldDay: 1 });
  });

  it('the hands: slow, fast, slow — about twice round, more for more days — stopping at seven in the morning', () => {
    expect(minuteTurns(1)).toBe(2);
    expect(minuteTurns(3)).toBe(4);
    expect(minuteTurns(100)).toBe(6);
    const at = (t: number) => timePassFrame(t, 1, null).minuteDeg;
    expect(at(250)).toBe(0);
    expect(at(1150)).toBe(720);
    // Slow at the ends, fast in the middle: the same 90ms moves the hand far more at the middle.
    expect(at(745) - at(655)).toBeGreaterThan(4 * (at(340) - at(250)));
    expect(timePassFrame(1150, 1, null).hourDeg).toBe(210);
    expect(timePassFrame(0, 1, null).hourDeg).toBe(150);
    // A tick at each quarter-turn of the minute hand.
    expect(ticksAt(720)).toBe(8);
    expect(ticksAt(89.9)).toBe(0);
  });

  it('dark, then the clock up; the old date until the hands stop, the new by the end of its turn', () => {
    const dark = timePassFrame(125, 1, null);
    expect(dark.veil).toBeCloseTo(0.5);
    expect(dark.clock).toBe(0);
    expect(timePassFrame(250 + 180, 1, null).clock).toBe(1);
    expect(timePassFrame(1100, 1, null)).toMatchObject({ step: 0, stepIn: 1 });
    expect(timePassFrame(1300, 1, null)).toMatchObject({ step: 1, stepIn: 0.5 });
    expect(timePassFrame(1450, 1, null)).toMatchObject({ step: 1, stepIn: 1 });
    // Three days: one after another.
    const t3 = timePassTimes(3);
    expect(timePassFrame(t3.flipAt + 90, 3, null).step).toBe(1);
    expect(timePassFrame(t3.flipAt + 270, 3, null).step).toBe(2);
    expect(timePassFrame(t3.flipAt + 450, 3, null).step).toBe(3);
    expect(timePassFrame(t3.outAt + 500, 3, null)).toMatchObject({ step: 3, stepIn: 1, veil: 1 });
  });

  it('held on the new date until the night is kept; then light again; a skip is the last frame at once', () => {
    expect(timePassFrame(5000, 1, null).veil).toBe(1);
    expect(timePassFrame(5075, 1, 5000).veil).toBeCloseTo(0.5);
    expect(timePassFrame(5150, 1, 5000).veil).toBe(0);
    expect(timePassFrame(300, 3, null, true)).toMatchObject({ veil: 1, clock: 1, run: 1, step: 3, stepIn: 1, minuteDeg: 4 * 360, hourDeg: 210 });
  });

  it('the sky with the hands: evening → night → morning; again for each further day', () => {
    expect(skyStops(1)).toHaveLength(3);
    expect(skyStops(3)).toHaveLength(9);
    const stops = skyStops(1);
    expect(skyAt(stops, 0).foot).toBe('rgb(168, 96, 72)');
    expect(skyAt(stops, 0.5).top).toBe('rgb(4, 8, 28)');
    expect(skyAt(stops, 1).foot).toBe('rgb(214, 170, 112)');
    expect(timePassFrame(1150, 1, null).sky).toEqual(skyAt(stops, 1));
  });
});

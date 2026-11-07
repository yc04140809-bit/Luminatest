import { addDays, type WorldClock } from '@mugen/core/time/calendar';

/**
 * 時が流れる — THE CLOCK BETWEEN ONE DAY AND THE NEXT (2026-10-31 タスクH, 師匠決定).
 *
 * Resting used to change the date with nothing in between, and the game is about life going on while it is
 * not watched — so the moment time passes is shown, briefly and well: dark, a clock (a thin gold ring and its
 * marks, a gold hour hand and a white minute hand) whose hands run slow → fast → slow while the sky behind it
 * moves from evening through night to morning, the date turning over, then the village again. Its frames are
 * meant to be filmed as they are (the selection PV's 「世界の早回し」).
 *
 *   0.00–0.25  dark
 *   0.25–1.15  the clock: the minute hand about twice round (more for more days), the sky with it
 *   1.15–1.45  the date turns over (each day of several, one after another)
 *   1.45–1.60  light again
 *
 * Everything on screen is worked out here from the time since it began, so a frame is the same however it is
 * reached (and a skip is simply the last one).
 */
export const TIME_PASS_MS = {
  dark: 250,
  clock: 900,
  /** One day turning over. */
  flip: 300,
  /** Each further day of several. */
  flipMore: 120,
  out: 150,
} as const;

/** At most this many turns of the date are shown; more days than that are turned over in larger steps. */
export const MAX_FLIPS = 6;

/** Where the hands stop: seven in the morning, on the hour. */
const HOUR_END_DEG = 210;

export interface TimePassTimes {
  /** The dark is complete; the clock begins to come up. */
  clockAt: number;
  /** The hands have stopped; the date begins to turn. */
  flipAt: number;
  /** One turn of the date. */
  stepMs: number;
  /** The date is the new one; light again from here (once the night has actually been kept). */
  outAt: number;
  /** All of it, when nothing has to be waited for. */
  end: number;
}

/** The dates shown, the first being the one before: one per day, or larger steps beyond `MAX_FLIPS`. */
export function flipDates(from: WorldClock, days: number): WorldClock[] {
  const steps = Math.max(1, Math.min(days, MAX_FLIPS));
  return Array.from({ length: steps + 1 }, (_, k) => addDays(from, Math.round((days * k) / steps)));
}

/** The minute hand's turns: twice for a night, once more for each further day (no more than six). */
export function minuteTurns(days: number): number {
  return Math.min(1 + Math.max(1, days), 6);
}

export function timePassTimes(days: number): TimePassTimes {
  const flips = flipDates({ worldYear: 1, worldDay: 1 }, days).length - 1;
  const clockAt = TIME_PASS_MS.dark;
  const flipAt = clockAt + TIME_PASS_MS.clock;
  const outAt = flipAt + TIME_PASS_MS.flip + TIME_PASS_MS.flipMore * (flips - 1);
  return { clockAt, flipAt, stepMs: (outAt - flipAt) / flips, outAt, end: outAt + TIME_PASS_MS.out };
}

/** Slow, fast, slow. */
export const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

type Rgb = readonly [number, number, number];
/** The sky at one time of day: its top and its foot. Navy throughout, warmed at the ends of the day. */
interface Sky {
  top: Rgb;
  foot: Rgb;
}
const EVENING: Sky = { top: [38, 32, 78], foot: [168, 96, 72] };
const NIGHT: Sky = { top: [4, 8, 28], foot: [14, 24, 60] };
const MORNING: Sky = { top: [30, 50, 104], foot: [214, 170, 112] };

/** Evening, night, morning — and for each further day, evening, night and morning again (three at most). */
export function skyStops(days: number): Sky[] {
  const nights = Math.max(1, Math.min(days, 3));
  return [EVENING, ...Array.from({ length: nights }, (_, i) => (i === 0 ? [NIGHT, MORNING] : [EVENING, NIGHT, MORNING])).flat()];
}

const mix = (a: Rgb, b: Rgb, k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k)) as unknown as Rgb;
const css = (c: Rgb) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

/** The sky `at` (0 = the evening before, 1 = the morning after) along `stops`. */
export function skyAt(stops: readonly Sky[], at: number): { top: string; foot: string } {
  const span = Math.max(0, Math.min(1, at)) * (stops.length - 1);
  const i = Math.min(Math.floor(span), stops.length - 2);
  const k = span - i;
  return { top: css(mix(stops[i].top, stops[i + 1].top, k)), foot: css(mix(stops[i].foot, stops[i + 1].foot, k)) };
}

export interface TimePassFrame {
  /** The whole of it over the screen: 0 → 1 in the dark, 1 → 0 at the end. */
  veil: number;
  /** The clock and the date. */
  clock: number;
  /** How far the hands (and the sky) have come, 0–1. */
  run: number;
  minuteDeg: number;
  hourDeg: number;
  sky: { top: string; foot: string };
  /** Which of `flipDates` is shown (0: the day before), and how far into turning to it (1: turned). */
  step: number;
  stepIn: number;
}

/**
 * The frame `t` ms in. `outFrom` is when the light began to come back (null: not yet — the last date is held
 * until the night has been kept); `skipped`, the last of it at once.
 */
export function timePassFrame(t: number, days: number, outFrom: number | null, skipped = false): TimePassFrame {
  const at = timePassTimes(days);
  const flips = flipDates({ worldYear: 1, worldDay: 1 }, days).length - 1;
  const turns = minuteTurns(days);
  const run = skipped ? 1 : easeInOutCubic(clamp01((t - at.clockAt) / TIME_PASS_MS.clock));
  const into = skipped ? flips : clamp01((t - at.flipAt) / (at.outAt - at.flipAt)) * flips;
  const step = Math.min(flips, t >= at.flipAt || skipped ? Math.floor(into) + (into < flips ? 1 : 0) : 0);
  const stepIn = step === 0 ? 1 : skipped || into >= flips ? 1 : into - (step - 1);
  const veil = skipped
    ? 1
    : outFrom !== null
      ? 1 - clamp01((t - outFrom) / TIME_PASS_MS.out)
      : clamp01(t / TIME_PASS_MS.dark);
  return {
    veil,
    clock: skipped ? 1 : clamp01((t - at.clockAt) / 180),
    run,
    minuteDeg: run * turns * 360,
    hourDeg: HOUR_END_DEG - turns * 30 * (1 - run),
    sky: skyAt(skyStops(days), run),
    step,
    stepIn,
  };
}

/** The minute hand's quarter-turns so far: a tick as each one is passed. */
export const ticksAt = (minuteDeg: number) => Math.floor(minuteDeg / 90 + 1e-6);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

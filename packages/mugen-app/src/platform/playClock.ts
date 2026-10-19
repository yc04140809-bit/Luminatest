/**
 * THE PLAY'S STOPWATCH (TIGS2027: a play is 7〜10 minutes, 15 at most —
 * docs/TIGS2027_BUILD.md §1; STEP ① asks that the time to Kaos's look
 * ahead be checkable).
 *
 * Four marks, in wall-clock time, each the first time it happens after
 * はじめから:
 *
 *   START   はじめから was pressed (the opening begins)
 *   CHOICE  the four answers were written to WORLD MEMORY
 *   VISION  Kaos began to show the three years (TIME SHIFT)
 *   BACK    現在へもどる — the look is over
 *
 * Kept in this browser's own storage so a reload mid-play does not lose
 * it, and nothing depends on it: storage that throws or comes back empty
 * means no times, never a broken game. It is read only by the debug
 * panel (src/dev/ChainPanel.tsx) and the e2e — never drawn in play.
 */

export type PlayMark = 'START' | 'CHOICE' | 'VISION' | 'BACK';
export type PlayTimes = Partial<Record<PlayMark, number>>;

const KEY = 'mugen.playClock';

function read(): PlayTimes {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    const out: PlayTimes = {};
    for (const mark of ['START', 'CHOICE', 'VISION', 'BACK'] as const) {
      const at = (parsed as Record<string, unknown>)[mark];
      if (typeof at === 'number' && Number.isFinite(at)) out[mark] = at;
    }
    return out;
  } catch {
    return {};
  }
}

function write(times: PlayTimes): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(times));
  } catch {
    // No storage, no stopwatch. The game does not notice.
  }
}

/** Marks a moment of the play; START begins a new play, the rest only once each. */
export function markPlay(mark: PlayMark, now: number = Date.now()): void {
  if (mark === 'START') return write({ START: now });
  const times = read();
  if (times.START === undefined || times[mark] !== undefined) return;
  write({ ...times, [mark]: now });
}

export function playTimes(): PlayTimes {
  return read();
}

/** m:ss from START to a mark, or null when either is missing. */
export function sinceStart(times: PlayTimes, mark: PlayMark): string | null {
  const start = times.START;
  const at = times[mark];
  if (start === undefined || at === undefined || at < start) return null;
  const seconds = Math.round((at - start) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Forgets the play's times (the save was thrown away: src/dev/ResetSave.tsx). */
export function resetPlayClock(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing kept, nothing to forget.
  }
}

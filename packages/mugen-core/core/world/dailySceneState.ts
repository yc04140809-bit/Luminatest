// THE VILLAGE'S SMALL THINGS (襲撃前の日常, 2026-10-10) — the day the last one
// was seen to its end, so no more than one happens in a day
// (content/story/dailyScenes.ts). Which have been seen is readMarks
// (`talk:DAILY_<id>`), not this.
//
//   dailyScene  { lastDay: number | null }
//
// Absent reads as none yet, so no schema version moved.

export interface DailySceneRow {
  lastDay: number | null;
}

export const NO_DAILY_SCENE: DailySceneRow = { lastDay: null };

type Read<T> = { value: T; health: 'ok' | 'repaired' };

export function readDailyScene(raw: unknown): Read<DailySceneRow> {
  if (raw === undefined || raw === null) return { value: NO_DAILY_SCENE, health: 'ok' };
  const day = (raw as Partial<DailySceneRow>)?.lastDay;
  if (typeof raw === 'object' && (day === null || (typeof day === 'number' && Number.isInteger(day) && day >= 0))) {
    return { value: { lastDay: day }, health: 'ok' };
  }
  return { value: NO_DAILY_SCENE, health: 'repaired' };
}

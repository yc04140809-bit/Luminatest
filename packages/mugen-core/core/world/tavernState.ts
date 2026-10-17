// THE TAVERN'S ROWS (酒場ハブ化 Phase 1, 2026-10-09) — read back repaired.
//
//   tavernTrades  { day, done }  the swaps made on that day (one per
//                                stranger per night; another day, none)
//   musicUnlocks  BgmId[]        the pieces the game has played in this world
//   villageBgm    BgmId | null   the piece Alden's ordinary places play
//                                instead of its own (null: its own)
//
// Absent rows read as nothing done, nothing heard and the village's own
// piece, so no schema version moved.

import type { BgmId } from '@mugen/assets';
import { isArchivedPiece } from '../../content/audio/musicArchive';

export interface TavernTradesRow {
  day: number;
  done: readonly string[];
}

export const NO_TRADES: TavernTradesRow = { day: 0, done: [] };

type Read<T> = { value: T; health: 'ok' | 'repaired' };

export function readTavernTrades(raw: unknown): Read<TavernTradesRow> {
  if (raw === undefined || raw === null) return { value: NO_TRADES, health: 'ok' };
  const r = raw as Partial<TavernTradesRow>;
  if (
    typeof r !== 'object' ||
    typeof r.day !== 'number' ||
    !Number.isInteger(r.day) ||
    r.day < 0 ||
    !Array.isArray(r.done)
  ) {
    return { value: NO_TRADES, health: 'repaired' };
  }
  const done = [...new Set(r.done.filter((id): id is string => typeof id === 'string'))];
  return { value: { day: r.day, done }, health: done.length === r.done.length ? 'ok' : 'repaired' };
}

export function readMusicUnlocks(raw: unknown): Read<BgmId[]> {
  if (raw === undefined || raw === null) return { value: [], health: 'ok' };
  if (!Array.isArray(raw)) return { value: [], health: 'repaired' };
  const kept = [...new Set(raw.filter(isArchivedPiece))];
  return { value: kept, health: kept.length === raw.length ? 'ok' : 'repaired' };
}

export function readVillageBgm(raw: unknown): Read<BgmId | null> {
  if (raw === undefined || raw === null) return { value: null, health: 'ok' };
  return isArchivedPiece(raw) ? { value: raw, health: 'ok' } : { value: null, health: 'repaired' };
}

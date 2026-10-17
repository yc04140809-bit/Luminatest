// PLAYER KNOWLEDGE — what the player has come to know of the world's truth,
// kept apart from that truth (docs/OFF_SCREEN_LIFE_SYSTEM.md §13, 2026-10-17).
//
//   WORLD TRUTH      what happened: WORLD MEMORY's events (World.getEvents).
//                    Written by the world — the night's LIFE TICK, a choice.
//   PLAYER KNOWLEDGE what the player knows of it: this row. Written only when
//                    the player is TOLD — a scene read to its end, a rumour
//                    opened, a thing seen at a place — never because it is true.
//
// So the two can differ, and do: リナ was saved last night (truth) and the
// player has not been to the bakery yet (knowledge: nothing). Or they know a
// man has started working there (seen) without knowing who (not told).
//
// A FACT CAN ONLY BE KNOWN ONCE IT IS TRUE. Learning a fact whose truth has
// not happened is refused, so no screen can tell the player something the
// world has not done.
//
// One row (`playerKnowledge`): fact id → the day it was learned and how.
// NO SCHEMA CHANGE: a save from before has no row, which reads as knowing
// nothing of this kind. SAVE_VERSION does not move.

import type { MemoryEventType } from '../memory/types';

/** A thing the player can come to know, and the fact of the world it is about. */
export interface KnowableFact {
  id: string;
  /** The event in WORLD MEMORY it is about. Until that exists, it cannot be known. */
  truth: MemoryEventType;
  /**
   * Whether knowing it lists that event in WORLD MEMORY's screen (and the
   * life record) — the whole of it. False: only part of it is known (a new
   * face at the bakery, not whose), and the event stays unlisted.
   */
  listsEvent: boolean;
}

/** How a fact reached the player: what they read or saw (`talk:…`, `rumor:…`, `seen:…`). */
export interface KnownFact {
  /** The absolute world day it was learned. */
  day: number;
  via: string;
}

export type PlayerKnowledgeRow = Readonly<Record<string, KnownFact>>;

const FACT_ID = /^[A-Z][A-Z0-9_]{0,63}$/;
const VIA = /^[a-z]+:[^\s]{1,120}$/;

/** The row out of a save, repaired. Never fails; drops what it cannot read. */
export function readPlayerKnowledge(raw: unknown): { value: PlayerKnowledgeRow; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: {}, health: 'ok' };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value: {}, health: 'repaired' };
  const out: Record<string, KnownFact> = {};
  let changed = false;
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    const e = entry as Partial<KnownFact> | null;
    if (
      !FACT_ID.test(id) ||
      !e ||
      typeof e !== 'object' ||
      !Number.isInteger(e.day) ||
      (e.day as number) < 0 ||
      typeof e.via !== 'string' ||
      !VIA.test(e.via)
    ) {
      changed = true;
      continue;
    }
    out[id] = { day: e.day as number, via: e.via };
  }
  return { value: out, health: changed ? 'repaired' : 'ok' };
}

/**
 * The facts among `ids` that can be learned now: known to the table, true in
 * the world, and not yet known. In the order asked.
 */
export function learnable(
  ids: readonly string[],
  facts: readonly KnowableFact[],
  known: PlayerKnowledgeRow,
  isTrue: (type: MemoryEventType) => boolean,
): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (out.includes(id) || known[id]) continue;
    const fact = facts.find((f) => f.id === id);
    if (fact && isTrue(fact.truth)) out.push(id);
  }
  return out;
}

/** The event types the player knows the whole of (`listsEvent`), from what they know. */
export function knownTruths(facts: readonly KnowableFact[], known: PlayerKnowledgeRow): Set<MemoryEventType> {
  return new Set(facts.filter((f) => f.listsEvent && known[f.id]).map((f) => f.truth));
}

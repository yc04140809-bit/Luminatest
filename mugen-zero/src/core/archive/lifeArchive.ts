// MUGEN CORE — LIFE ARCHIVE projection.
//
// The archive is NOT a second database. It is a pure projection:
//
//   WORLD MEMORY  ->  PLAYER KNOWLEDGE (World.getKnownEvents)
//                 ->  this projection + content chapter defs
//                 ->  player UI
//
// It never writes, never invents facts, and — fed only known events —
// can never spoil an undiscovered life. Fed the FULL truth (dev admin),
// the same function projects the complete canon.

import type { MemoryEvent } from '../memory/types';
import {
  GALD_FIRST_ENCOUNTER_CHAPTER,
  GALD_LIFE_CHAPTERS,
} from '../../content/archive/galdChapters';
import { GALD_LIFE_CHOICE_EVENT_ID } from '../../content/events/galdLifeChoice';
import { GALD } from '../../content/characters/gald';

export type ChapterStatus = 'KNOWN' | 'UNKNOWN';

export interface LifeArchiveChapter {
  id: string;
  characterId: string;
  title: string;
  summary: string;
  /** World date taken from the sourcing MEMORY_EVENT — never hardcoded. */
  worldYear: number;
  worldDay: number;
  location?: string;
  sourceEventIds: string[];
  sourceEventTypes: MemoryEvent['type'][];
  status: ChapterStatus;
}

export interface LifeArchiveEntry {
  characterId: string;
  displayName: string;
  firstKnownAt: { worldYear: number; worldDay: number };
  /** Chronological, one chapter per sourcing event the player knows. */
  chapters: LifeArchiveChapter[];
  /**
   * Whether to show the single 「？？？」 continuation card. Depends ONLY
   * on what the player knows (choice + reunion), never on world truth —
   * so its presence can never leak that something has already happened.
   * A life the player watched end (KILL) shows no continuation.
   */
  hasUnknownContinuation: boolean;
}

function chapterDefFor(event: MemoryEvent) {
  if (event.id === GALD_LIFE_CHOICE_EVENT_ID) {
    return GALD_FIRST_ENCOUNTER_CHAPTER[
      event.type as keyof typeof GALD_FIRST_ENCOUNTER_CHAPTER
    ];
  }
  return GALD_LIFE_CHAPTERS[event.type];
}

/**
 * Builds Gald's life record from a list of events (already in
 * world-chronological order). Pass known events for the player view,
 * or the full history for the dev-admin truth view.
 */
export function buildGaldLifeArchive(events: MemoryEvent[]): LifeArchiveEntry | null {
  const chapters: LifeArchiveChapter[] = [];
  for (const event of events) {
    if (!event.actors.includes(GALD.id)) continue;
    const def = chapterDefFor(event);
    if (!def) continue;
    chapters.push({
      id: def.id,
      characterId: GALD.id,
      title: def.title,
      summary: def.summary,
      worldYear: event.worldYear,
      worldDay: event.worldDay,
      location: event.location,
      sourceEventIds: [event.id],
      sourceEventTypes: [event.type],
      status: 'KNOWN',
    });
  }
  if (chapters.length === 0) return null;

  const choice = events.find((e) => e.id === GALD_LIFE_CHOICE_EVENT_ID);
  const lifeEnded = choice?.type === 'PLAYER_KILLED_GALD';
  const reunited = events.some((e) => e.type === 'PLAYER_REUNITED_WITH_GALD');

  return {
    characterId: GALD.id,
    // The player files him under what they know him as; the reunion is
    // when the name truly belongs to a person.
    displayName: reunited ? GALD.name : GALD.unknownName,
    firstKnownAt: { worldYear: chapters[0].worldYear, worldDay: chapters[0].worldDay },
    chapters,
    hasUnknownContinuation: !lifeEnded && !reunited,
  };
}

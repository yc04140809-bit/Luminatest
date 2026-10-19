// MUGEN CORE — EVENT ENGINE types.
// A LifeEventDef is data describing when a life event may occur and what
// it changes. Phase C keeps this deliberately small: one required past
// memory, an elapsed-days threshold, and character-state effects.
// This is not a general-purpose DSL and must not grow into one yet.

import type { CharacterState } from '../characters/types';
import type { EventImportance, LifeEventType, MemoryEventType } from '../memory/types';

export type { WorldClock } from '../time/calendar';

export interface LifeEventDef {
  /** Also used as the MEMORY_EVENT type when the event occurs. */
  type: LifeEventType;
  /** Fixed MEMORY_EVENT id — with once:true this makes double-firing impossible at the DB level. */
  eventId: string;
  /** The past fact that must exist in WORLD MEMORY. Also recorded as causedBy. */
  requiredMemory: MemoryEventType;
  /** Days that must have elapsed since the required memory occurred. */
  minElapsedDays: number;
  /**
   * A life that went another way: if any of these happened first — by the
   * day this one would — this one never does. (A man who stayed to carry a
   * girl home does not also walk out onto the road.) Absent: nothing stops it.
   */
  unless?: readonly MemoryEventType[];
  /**
   * WHAT HAS TO BE TRUE OF THE PEOPLE, not only that time has passed: the id
   * of a world-life bloom (core/life, WorldBloomDef) that must be a candidate
   * on the day this would happen. The bloom asks about seeds an earlier event
   * planted in somebody — so A happening changes B, and only a changed B can
   * do the next thing (TIGS2027 STEP ①, 2026-10-19). The resolver is told how
   * to ask (`BloomPossible`); asked nothing, an event with a condition never
   * happens. Absent: requiredMemory and the wait are the whole condition.
   */
  bloom?: string;
  /** Phase C: all life events fire at most once per world. */
  once: true;
  location: string;
  actors: string[];
  importance: EventImportance;
  /** Current-state changes applied atomically with the new MEMORY_EVENT. */
  characterEffects: Array<{
    characterId: string;
    changes: Partial<CharacterState>;
  }>;
}

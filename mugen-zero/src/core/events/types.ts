// MUGEN CORE — EVENT ENGINE types.
// A LifeEventDef is data describing when a life event may occur and what
// it changes. Phase C keeps this deliberately small: one required past
// memory, an elapsed-days threshold, and character-state effects.
// This is not a general-purpose DSL and must not grow into one yet.

import type { CharacterState } from '../characters/types';
import type { EventImportance, LifeEventType, MemoryEventType } from '../memory/types';

export interface WorldClock {
  worldYear: number;
  worldDay: number;
}

export interface LifeEventDef {
  /** Also used as the MEMORY_EVENT type when the event occurs. */
  type: LifeEventType;
  /** Fixed MEMORY_EVENT id — with once:true this makes double-firing impossible at the DB level. */
  eventId: string;
  /** The past fact that must exist in WORLD MEMORY. Also recorded as causedBy. */
  requiredMemory: MemoryEventType;
  /** Days that must have elapsed since the required memory occurred. */
  minElapsedDays: number;
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

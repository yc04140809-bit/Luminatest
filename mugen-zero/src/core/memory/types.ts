// MUGEN CORE — WORLD MEMORY types.
// MEMORY_EVENT is an immutable fact of the past (world truth).
// It must never be edited to reflect "current" state — that belongs
// to CHARACTER_STATE (src/core/characters).

export type EventImportance = 'CRITICAL' | 'MAJOR' | 'NORMAL' | 'AMBIENT';

/** The four canonical outcomes of Gald's first-encounter life choice. */
export type GaldLifeChoiceEventType =
  | 'PLAYER_KILLED_GALD'
  | 'PLAYER_SPARED_GALD'
  | 'PLAYER_HELPED_GALD'
  | 'PLAYER_CAPTURED_GALD';

/** Life events produced by the EVENT ENGINE. */
export type LifeEventType = 'GALD_LEAVES_BANDITS';

export type MemoryEventType = GaldLifeChoiceEventType | LifeEventType;

export interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  worldYear: number;
  worldDay: number;
  location: string;
  actors: string[];
  importance: EventImportance;
  /** Real-world ISO timestamp of when the event was recorded. */
  createdAt: string;
  /**
   * Event types of the past facts that caused this event
   * (e.g. GALD_LEAVES_BANDITS is causedBy ['PLAYER_SPARED_GALD']).
   * Absent on player-originated root events.
   */
  causedBy?: MemoryEventType[];
}

/** Current world state persisted alongside history (clock, character states). */
export interface WorldStateRow {
  key: string;
  value: unknown;
}

/**
 * Storage abstraction for WORLD MEMORY.
 * UI and Phaser must never touch this directly — only WorldMemory does.
 */
export interface MemoryEventStore {
  init(): Promise<void>;
  getAll(): Promise<MemoryEvent[]>;
  /**
   * Adds a new event. Rejects if an event with the same id already exists
   * (write-once history: important past facts are never overwritten).
   * Resolves only after the write is durably committed.
   */
  add(event: MemoryEvent): Promise<void>;
  /**
   * Atomically commits new events and current-state rows in ONE transaction:
   * either everything is written or nothing is. A duplicate event id aborts
   * the whole commit (write-once history still holds).
   */
  commit(changes: { addEvents?: MemoryEvent[]; putState?: WorldStateRow[] }): Promise<void>;
  /** Reads one current-state row (world clock, character state, …). */
  getStateValue(key: string): Promise<unknown | undefined>;
  /** Deletes all saved world data (NEW GAME / RESET WORLD). */
  clearAll(): Promise<void>;
  close(): void;
}

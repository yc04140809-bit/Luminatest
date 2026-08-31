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

/**
 * Life events produced by the EVENT ENGINE.
 * One chain per life choice — the four are mutually exclusive because
 * their root causes are (only one first-encounter outcome can exist).
 */
export type LifeEventType =
  // SPARE — a life let go finds another one.
  | 'GALD_LEAVES_BANDITS'
  | 'GALD_ARRIVES_IN_ALDEN'
  | 'GALD_BECOMES_BAKER'
  // HELP — a hand offered is a hand passed on.
  | 'GALD_WALKS_THE_ROAD'
  | 'GALD_BECOMES_HEALER'
  // CAPTURE — the life that follows being held to account.
  | 'GALD_STANDS_TRIAL'
  | 'GALD_COMPLETES_SENTENCE'
  | 'GALD_WORKS_FOR_ALDEN'
  // KILL — the man's own time stopped; the world's did not.
  | 'GALD_IS_BURIED'
  | 'GALD_GRAVE_TENDED';

/**
 * Events the player takes part in outside the first-encounter choice.
 * One per route: the moment the player finds, with their own feet, what
 * became of the choice they made three years ago.
 */
export type PlayerEventType =
  | 'PLAYER_REUNITED_WITH_GALD'
  | 'PLAYER_MET_GALD_ON_THE_ROAD'
  | 'PLAYER_MET_GALD_IN_ALDEN'
  | 'PLAYER_FOUND_GALD_GRAVE';

/** World-scale events (large passages of time, …). */
export type WorldEventType = 'WORLD_TIME_SHIFTED';

export type MemoryEventType =
  | GaldLifeChoiceEventType
  | LifeEventType
  | PlayerEventType
  | WorldEventType;

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
  /** WORLD_TIME_SHIFTED only: where the shift started. */
  from?: { worldYear: number; worldDay: number };
  /** WORLD_TIME_SHIFTED only: where the shift landed. */
  to?: { worldYear: number; worldDay: number };
  /** WORLD_TIME_SHIFTED only: whole years skipped. */
  yearsElapsed?: number;
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
   * Atomically commits new events, current-state rows, and (DEV tooling
   * only) event deletions in ONE transaction: either everything is written
   * or nothing is. A duplicate event id aborts the whole commit (write-once
   * history still holds). deleteEventIds exists solely for the dev-admin
   * RESET SCENARIO path — gameplay code must never delete history.
   */
  commit(changes: {
    addEvents?: MemoryEvent[];
    putState?: WorldStateRow[];
    deleteEventIds?: string[];
  }): Promise<void>;
  /** Reads one current-state row (world clock, character state, …). */
  getStateValue(key: string): Promise<unknown | undefined>;
  /** Deletes all saved world data (NEW GAME / RESET WORLD). */
  clearAll(): Promise<void>;
  close(): void;
}

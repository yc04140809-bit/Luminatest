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

export type MemoryEventType = GaldLifeChoiceEventType;

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
  /** Deletes all saved world data (NEW GAME / RESET WORLD). */
  clearAll(): Promise<void>;
  close(): void;
}

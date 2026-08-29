// MUGEN CORE — WORLD MEMORY.
// The DB is the single source of truth for the world's history.
// React / Phaser state only mirrors what is stored here.

import type { LifeChoiceId } from '../flow/types';
import type { MemoryEvent, MemoryEventStore } from './types';
import {
  GALD_LIFE_CHOICE_EVENT_ID,
  GALD_LIFE_CHOICE_EVENT_TYPE,
  GALD_LIFE_CHOICE_TYPE_TO_CHOICE,
} from '../../content/events/galdLifeChoice';

export class WorldMemory {
  private constructor(
    private readonly store: MemoryEventStore,
    private cache: MemoryEvent[],
  ) {}

  /** Opens the store and loads all recorded history. */
  static async open(store: MemoryEventStore): Promise<WorldMemory> {
    await store.init();
    const events = await store.getAll();
    return new WorldMemory(store, events);
  }

  /** All recorded events, oldest first. */
  getEvents(): MemoryEvent[] {
    return [...this.cache].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  hasEventOfType(type: MemoryEvent['type']): boolean {
    return this.cache.some((e) => e.type === type);
  }

  /** The final life choice made for Gald's first encounter, if any. */
  getGaldLifeChoice(): LifeChoiceId | null {
    const event = this.cache.find((e) => e.id === GALD_LIFE_CHOICE_EVENT_ID);
    return event ? GALD_LIFE_CHOICE_TYPE_TO_CHOICE[event.type] : null;
  }

  /**
   * Records Gald's life choice as world truth.
   * - Exclusive: only one of the four outcomes can ever exist per world
   *   (all four share one fixed event id, and the store rejects duplicates).
   * - Idempotent for the same choice (double-tap safety).
   * - Resolves only after the write is durably committed; the caller must
   *   not advance the game until this resolves.
   */
  async recordGaldLifeChoice(choice: LifeChoiceId): Promise<MemoryEvent> {
    const existing = this.getGaldLifeChoice();
    if (existing !== null) {
      if (existing === choice) {
        return this.cache.find((e) => e.id === GALD_LIFE_CHOICE_EVENT_ID)!;
      }
      throw new Error(
        `Gald's life choice is already recorded as ${existing}; refusing contradictory ${choice}`,
      );
    }

    const event: MemoryEvent = {
      id: GALD_LIFE_CHOICE_EVENT_ID,
      type: GALD_LIFE_CHOICE_EVENT_TYPE[choice],
      // TIME SYSTEM arrives in Phase D; until then the world is at year 1, day 1.
      worldYear: 1,
      worldDay: 1,
      location: 'GREENWOOD_FOREST',
      actors: ['PLAYER', 'GALD'],
      importance: 'MAJOR',
      createdAt: new Date().toISOString(),
    };
    await this.store.add(event);
    this.cache = [...this.cache, event];
    return event;
  }

  /** NEW GAME / RESET WORLD: deletes all saved world data. */
  async resetWorld(): Promise<void> {
    await this.store.clearAll();
    this.cache = [];
  }
}

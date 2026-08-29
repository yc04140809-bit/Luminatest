// MUGEN CORE — the world aggregate.
// Owns WORLD MEMORY (past facts), WORLD CLOCK and CHARACTER STATE (current),
// and runs the EVENT ENGINE on day advance. The DB is the single source of
// truth; React / Phaser only mirror what lives here.

import type { LifeChoiceId } from '../flow/types';
import type { MemoryEvent, MemoryEventStore, WorldStateRow } from '../memory/types';
import type { CharacterState } from '../characters/types';
import type { WorldClock } from '../events/types';
import { findDueLifeEvents } from '../events/eventEngine';
import {
  GALD_LIFE_CHOICE_EVENT_ID,
  GALD_LIFE_CHOICE_EVENT_TYPE,
  GALD_LIFE_CHOICE_TYPE_TO_CHOICE,
} from '../../content/events/galdLifeChoice';
import { LIFE_EVENT_DEFS } from '../../content/events/lifeEvents';
import { INITIAL_GALD_STATE } from '../../content/characters/gald';

const CLOCK_KEY = 'world_clock';
const INITIAL_CLOCK: WorldClock = { worldYear: 1, worldDay: 1 };

function characterKey(id: string): string {
  return `character_${id}`;
}

const INITIAL_CHARACTERS: Record<string, CharacterState> = {
  GALD: INITIAL_GALD_STATE,
};

type Listener = () => void;

export class World {
  private events: MemoryEvent[];
  private clock: WorldClock;
  private characters: Record<string, CharacterState>;
  private listeners = new Set<Listener>();
  private version = 0;

  private constructor(
    private readonly store: MemoryEventStore,
    events: MemoryEvent[],
    clock: WorldClock,
    characters: Record<string, CharacterState>,
  ) {
    this.events = events;
    this.clock = clock;
    this.characters = characters;
  }

  /** Opens the store and restores history, clock and character states. */
  static async open(store: MemoryEventStore): Promise<World> {
    await store.init();
    const events = await store.getAll();
    const clock =
      ((await store.getStateValue(CLOCK_KEY)) as WorldClock | undefined) ?? INITIAL_CLOCK;
    const characters: Record<string, CharacterState> = {};
    for (const [id, initial] of Object.entries(INITIAL_CHARACTERS)) {
      characters[id] =
        ((await store.getStateValue(characterKey(id))) as CharacterState | undefined) ?? initial;
    }
    return new World(store, events, clock, characters);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.version++;
    for (const l of this.listeners) l();
  }

  /** Monotonic change counter — a stable snapshot for UI subscriptions. */
  getVersion(): number {
    return this.version;
  }

  // ---- WORLD MEMORY (past facts) ----

  /** All recorded events, oldest first. */
  getEvents(): MemoryEvent[] {
    return [...this.events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  hasEventOfType(type: MemoryEvent['type']): boolean {
    return this.events.some((e) => e.type === type);
  }

  /** The final life choice made for Gald's first encounter, if any. */
  getGaldLifeChoice(): LifeChoiceId | null {
    const event = this.events.find((e) => e.id === GALD_LIFE_CHOICE_EVENT_ID);
    if (!event) return null;
    return GALD_LIFE_CHOICE_TYPE_TO_CHOICE[event.type as keyof typeof GALD_LIFE_CHOICE_TYPE_TO_CHOICE];
  }

  // ---- WORLD CLOCK / CHARACTER STATE (current) ----

  getClock(): WorldClock {
    return { ...this.clock };
  }

  getCharacter(id: string): CharacterState | undefined {
    const state = this.characters[id];
    return state ? { ...state } : undefined;
  }

  // ---- mutations ----

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
        return this.events.find((e) => e.id === GALD_LIFE_CHOICE_EVENT_ID)!;
      }
      throw new Error(
        `Gald's life choice is already recorded as ${existing}; refusing contradictory ${choice}`,
      );
    }

    const event: MemoryEvent = {
      id: GALD_LIFE_CHOICE_EVENT_ID,
      type: GALD_LIFE_CHOICE_EVENT_TYPE[choice],
      worldYear: this.clock.worldYear,
      worldDay: this.clock.worldDay,
      location: 'GREENWOOD_FOREST',
      actors: ['PLAYER', 'GALD'],
      importance: 'MAJOR',
      createdAt: new Date().toISOString(),
    };
    await this.store.commit({ addEvents: [event] });
    this.events = [...this.events, event];
    this.emit();
    return event;
  }

  /**
   * Advances the world by one day, runs the EVENT ENGINE, and atomically
   * commits the new clock, any due life events, and their character-state
   * effects in a single transaction.
   * Returns the life events that occurred (world truth — the UI decides
   * separately what the player gets to notice; no automatic popups).
   */
  async advanceDay(): Promise<MemoryEvent[]> {
    const nextClock: WorldClock = { ...this.clock, worldDay: this.clock.worldDay + 1 };

    const due = findDueLifeEvents(LIFE_EVENT_DEFS, this.events, nextClock);

    const newEvents: MemoryEvent[] = due.map(({ def }) => ({
      id: def.eventId,
      type: def.type,
      worldYear: nextClock.worldYear,
      worldDay: nextClock.worldDay,
      location: def.location,
      actors: [...def.actors],
      importance: def.importance,
      createdAt: new Date().toISOString(),
      causedBy: [def.requiredMemory],
    }));

    const nextCharacters = { ...this.characters };
    const stateRows: WorldStateRow[] = [{ key: CLOCK_KEY, value: nextClock }];
    for (const { def } of due) {
      for (const effect of def.characterEffects) {
        const current = nextCharacters[effect.characterId];
        if (!current) continue;
        nextCharacters[effect.characterId] = { ...current, ...effect.changes };
        stateRows.push({
          key: characterKey(effect.characterId),
          value: nextCharacters[effect.characterId],
        });
      }
    }

    await this.store.commit({ addEvents: newEvents, putState: stateRows });

    this.clock = nextClock;
    this.characters = nextCharacters;
    this.events = [...this.events, ...newEvents];
    this.emit();
    return newEvents;
  }

  /** NEW GAME / RESET WORLD: deletes all saved world data and restores defaults. */
  async resetWorld(): Promise<void> {
    await this.store.clearAll();
    this.events = [];
    this.clock = INITIAL_CLOCK;
    this.characters = { ...INITIAL_CHARACTERS };
    this.emit();
  }
}

// MUGEN CORE — the world aggregate.
// Owns WORLD MEMORY (past facts), WORLD CLOCK and CHARACTER STATE (current),
// and runs the EVENT ENGINE when time passes. The DB is the single source of
// truth; React / Phaser only mirror what lives here.

import type { LifeChoiceId } from '../flow/types';
import type { MemoryEvent, MemoryEventStore, WorldStateRow } from '../memory/types';
import type { CharacterState } from '../characters/types';
import type { LifeEventDef } from '../events/types';
import { findDueLifeEvents } from '../events/eventEngine';
import { buildGaldLifeArchive, type LifeArchiveEntry } from '../archive/lifeArchive';
import {
  type WorldClock,
  INITIAL_CLOCK,
  addDays,
  addYears,
  toAbsoluteDay,
  fromAbsoluteDay,
} from '../time/calendar';
import {
  GALD_LIFE_CHOICE_EVENT_ID,
  GALD_LIFE_CHOICE_EVENT_TYPE,
  GALD_LIFE_CHOICE_TYPE_TO_CHOICE,
  GALD_LIFE_CHOICE_STATE_EFFECTS,
} from '../../content/events/galdLifeChoice';
import { LIFE_EVENT_DEFS } from '../../content/events/lifeEvents';
import { INITIAL_GALD_STATE } from '../../content/characters/gald';

const CLOCK_KEY = 'world_clock';

function characterKey(id: string): string {
  return `character_${id}`;
}

const INITIAL_CHARACTERS: Record<string, CharacterState> = {
  GALD: INITIAL_GALD_STATE,
};

interface ResolvedLifeEvent {
  event: MemoryEvent;
  def: LifeEventDef;
}

type Listener = () => void;

export class World {
  private events: MemoryEvent[];
  private clock: WorldClock;
  private characters: Record<string, CharacterState>;
  private listeners = new Set<Listener>();
  private version = 0;
  private timePassing = false;

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

  /** All recorded events, in world-chronological order. */
  getEvents(): MemoryEvent[] {
    return [...this.events].sort((a, b) => {
      const dayDiff =
        toAbsoluteDay({ worldYear: a.worldYear, worldDay: a.worldDay }) -
        toAbsoluteDay({ worldYear: b.worldYear, worldDay: b.worldDay });
      if (dayDiff !== 0) return dayDiff;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  hasEventOfType(type: MemoryEvent['type']): boolean {
    return this.events.some((e) => e.type === type);
  }

  /**
   * Minimal PLAYER KNOWLEDGE approximation (full system arrives in a later
   * phase): the player-facing WORLD MEMORY view shows only events the
   * player took part in, plus world-scale time passage. Gald's off-screen
   * life stays hidden until the player actually reunites with him — world
   * truth must never spoil itself through the UI.
   */
  getKnownEvents(): MemoryEvent[] {
    const reunited = this.hasEventOfType('PLAYER_REUNITED_WITH_GALD');
    return this.getEvents().filter(
      (e) =>
        e.actors.includes('PLAYER') ||
        e.type === 'WORLD_TIME_SHIFTED' ||
        (reunited && e.actors.includes('GALD')),
    );
  }

  /**
   * LIFE ARCHIVE — a pure projection over PLAYER KNOWLEDGE.
   * Nothing is stored for it; RESET and save compatibility come for free.
   */
  getLifeArchive(): LifeArchiveEntry[] {
    const gald = buildGaldLifeArchive(this.getKnownEvents());
    return gald ? [gald] : [];
  }

  /** World truth: a bakery exists in Alden. (Not player knowledge.) */
  isBakeryOpen(): boolean {
    return this.hasEventOfType('GALD_BECOMES_BAKER');
  }

  /** The player has actually met the baker. */
  hasReunitedWithGald(): boolean {
    return this.hasEventOfType('PLAYER_REUNITED_WITH_GALD');
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
   * Records Gald's life choice as world truth, together with its immediate
   * current-state consequence (KILL → alive: false) in one transaction.
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

    const stateRows: WorldStateRow[] = [];
    const effect = GALD_LIFE_CHOICE_STATE_EFFECTS[choice];
    let nextGald = this.characters.GALD;
    if (effect && nextGald) {
      nextGald = { ...nextGald, ...effect };
      stateRows.push({ key: characterKey('GALD'), value: nextGald });
    }

    await this.store.commit({ addEvents: [event], putState: stateRows });
    this.events = [...this.events, event];
    if (nextGald) this.characters = { ...this.characters, GALD: nextGald };
    this.emit();
    return event;
  }

  /**
   * Finds every life event due at `atClock`, chains included: an event fired
   * in one pass can satisfy another def's requiredMemory in the next pass.
   * Bounded by the number of defs (each pass must fire at least one new
   * once-event), so it cannot loop forever.
   * Each event is dated the day its condition actually came true (its
   * cause's day + minElapsedDays, capped at `atClock`) — a TIME SHIFT never
   * swallows in-between history.
   */
  private resolveLifeEvents(atClock: WorldClock): ResolvedLifeEvent[] {
    const all = [...this.events];
    const resolved: ResolvedLifeEvent[] = [];
    const maxPasses = LIFE_EVENT_DEFS.length + 1;
    for (let pass = 0; pass < maxPasses; pass++) {
      const due = findDueLifeEvents(LIFE_EVENT_DEFS, all, atClock);
      if (due.length === 0) break;
      for (const { def, cause } of due) {
        const dueAbsolute =
          toAbsoluteDay({ worldYear: cause.worldYear, worldDay: cause.worldDay }) +
          def.minElapsedDays;
        const recordedAt = fromAbsoluteDay(Math.min(dueAbsolute, toAbsoluteDay(atClock)));
        const event: MemoryEvent = {
          id: def.eventId,
          type: def.type,
          worldYear: recordedAt.worldYear,
          worldDay: recordedAt.worldDay,
          location: def.location,
          actors: [...def.actors],
          importance: def.importance,
          createdAt: new Date().toISOString(),
          causedBy: [def.requiredMemory],
        };
        all.push(event);
        resolved.push({ event, def });
      }
    }
    return resolved;
  }

  /** Applies life-event character effects; returns the new map + changed ids. */
  private applyCharacterEffects(
    base: Record<string, CharacterState>,
    resolved: ResolvedLifeEvent[],
  ): { characters: Record<string, CharacterState>; changedIds: Set<string> } {
    const characters = { ...base };
    const changedIds = new Set<string>();
    for (const { def } of resolved) {
      for (const effect of def.characterEffects) {
        const current = characters[effect.characterId];
        if (!current) continue;
        characters[effect.characterId] = { ...current, ...effect.changes };
        changedIds.add(effect.characterId);
      }
    }
    return { characters, changedIds };
  }

  private async commitTimePassage(
    nextClock: WorldClock,
    extraEvents: MemoryEvent[],
    resolved: ResolvedLifeEvent[],
    characters: Record<string, CharacterState>,
    changedIds: Set<string>,
  ): Promise<void> {
    const stateRows: WorldStateRow[] = [{ key: CLOCK_KEY, value: nextClock }];
    for (const id of changedIds) {
      stateRows.push({ key: characterKey(id), value: characters[id] });
    }
    await this.store.commit({
      addEvents: [...resolved.map((r) => r.event), ...extraEvents],
      putState: stateRows,
    });
    this.clock = nextClock;
    this.characters = characters;
    this.events = [...this.events, ...resolved.map((r) => r.event), ...extraEvents];
    this.emit();
  }

  /**
   * REST: advances the world by one day (year rollover included), runs the
   * EVENT ENGINE, and atomically commits the new clock, any due life events,
   * and their character-state effects in a single transaction.
   * Returns the life events that occurred (world truth — the UI decides
   * separately what the player gets to notice; no automatic popups).
   */
  async advanceDay(): Promise<MemoryEvent[]> {
    const nextClock = addDays(this.clock, 1);
    const resolved = this.resolveLifeEvents(nextClock);
    const { characters, changedIds } = this.applyCharacterEffects(this.characters, resolved);
    await this.commitTimePassage(nextClock, [], resolved, characters, changedIds);
    return resolved.map((r) => r.event);
  }

  /**
   * TIME SHIFT: skips whole years at once.
   * - Catches up every life event that became due inside the skipped span,
   *   dated the day it actually happened (see resolveLifeEvents) — nothing
   *   is swallowed, causal order is preserved.
   * - Ages every LIVING character by the elapsed years (the dead do not age).
   * - Records the shift itself as a WORLD_TIME_SHIFTED memory event.
   * - Everything lands in one transaction. Re-entrant calls are refused
   *   (double-tap cannot shift twice).
   */
  async timeShift(years: number): Promise<{ shift: MemoryEvent; lifeEvents: MemoryEvent[] }> {
    if (!Number.isInteger(years) || years <= 0) {
      throw new Error(`Invalid TIME SHIFT length: ${years}`);
    }
    if (this.timePassing) {
      throw new Error('TIME SHIFT already in progress');
    }
    this.timePassing = true;
    try {
      const from = { ...this.clock };
      const to = addYears(this.clock, years);

      const resolved = this.resolveLifeEvents(to);
      const { characters, changedIds } = this.applyCharacterEffects(this.characters, resolved);

      // NPC AGE: living characters walk their own years; the dead stay still.
      for (const [id, state] of Object.entries(characters)) {
        if (!state.alive) continue;
        characters[id] = { ...state, age: state.age + years };
        changedIds.add(id);
      }

      const shift: MemoryEvent = {
        id: `evt_world_time_shifted_y${to.worldYear}d${to.worldDay}`,
        type: 'WORLD_TIME_SHIFTED',
        worldYear: to.worldYear,
        worldDay: to.worldDay,
        location: 'WORLD',
        actors: ['WORLD'],
        importance: 'MAJOR',
        createdAt: new Date().toISOString(),
        from,
        to: { ...to },
        yearsElapsed: years,
      };

      await this.commitTimePassage(to, [shift], resolved, characters, changedIds);
      return { shift, lifeEvents: resolved.map((r) => r.event) };
    } finally {
      this.timePassing = false;
    }
  }

  /**
   * Records the moment the player actually meets Gald in the bakery.
   * Only callable in a world whose truth contains GALD_BECOMES_BAKER;
   * a TIME SHIFT alone never creates this event. Once per world
   * (idempotent on revisit).
   */
  async recordGaldReunion(): Promise<MemoryEvent> {
    const existing = this.events.find((e) => e.type === 'PLAYER_REUNITED_WITH_GALD');
    if (existing) return existing;
    if (!this.isBakeryOpen()) {
      throw new Error('Reunion requires GALD_BECOMES_BAKER in world truth');
    }
    const event: MemoryEvent = {
      id: 'evt_player_reunited_with_gald',
      type: 'PLAYER_REUNITED_WITH_GALD',
      worldYear: this.clock.worldYear,
      worldDay: this.clock.worldDay,
      location: 'ALDEN_BAKERY',
      actors: ['PLAYER', 'GALD'],
      importance: 'MAJOR',
      createdAt: new Date().toISOString(),
      causedBy: ['GALD_BECOMES_BAKER'],
    };
    await this.store.commit({ addEvents: [event] });
    this.events = [...this.events, event];
    this.emit();
    return event;
  }

  /** Advances the world day by day, n times (each day fully resolved). */
  async advanceDays(n: number): Promise<MemoryEvent[]> {
    const fired: MemoryEvent[] = [];
    for (let i = 0; i < n; i++) {
      fired.push(...(await this.advanceDay()));
    }
    return fired;
  }

  /**
   * DEV TOOLING ONLY (dev-admin RESET SCENARIO).
   * Removes Gald's life-choice and life events from history and restores
   * his initial CHARACTER STATE, atomically, so the Gald scenario can be
   * re-tested. The WORLD CLOCK and non-Gald history (e.g. time shifts) are
   * preserved. This is the single sanctioned exception to write-once
   * history; gameplay code must never call it.
   */
  async devResetGaldScenario(): Promise<void> {
    // Everything Gald took part in — choice events, his life events, and
    // the reunion — while world-scale history (time shifts) survives.
    const removeIds = this.events.filter((e) => e.actors.includes('GALD')).map((e) => e.id);
    const initialGald = INITIAL_CHARACTERS.GALD;
    await this.store.commit({
      deleteEventIds: removeIds,
      putState: [{ key: characterKey('GALD'), value: initialGald }],
    });
    this.events = this.events.filter((e) => !removeIds.includes(e.id));
    this.characters = { ...this.characters, GALD: initialGald };
    this.emit();
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

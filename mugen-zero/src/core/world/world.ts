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
import {
  FUTURE_SITE_DEFS,
  FUTURE_DISCOVERY_TYPES,
  futureSiteDef,
  type FutureSiteDef,
} from '../../content/world/futureSites';
import { INITIAL_GALD_STATE } from '../../content/characters/gald';
import type { ExperienceWorldView } from '../experience/types';
import { recentEmotionsOf } from '../experience/experienceEngine';
import { ALDEN_EXPERIENCE_EVENTS } from '../../content/experience/aldenExperience';
import { ALDEN_NARRATIVE_SEEDS } from '../../content/narrative/aldenSeeds';
import { seedStatuses, unresolvedSeedCount } from '../narrative/narrativeSeeds';
import {
  mintIndividualId,
  rollIndividualStory,
  type Rng,
  type StoryTriggerConfig,
} from '../enemies/enemyEncounters';
import { CREATURE_LIFE_CHOICE_EVENT_TYPE } from '../../content/events/creatureLifeChoice';
import {
  applyArcanaConditions,
  emptyArcanaRecord,
  isComplete,
  readArcanaRecord,
  type ArcanaConditionId,
  type ArcanaGain,
  type ArcanaRecord,
} from '../arcana/arcana';
import { ARCANA_DEFS, arcanaDef } from '../../content/arcana/arcanaDefs';
import { SUMMON_ACCIDENTS } from '../../content/summon/accidents';
import {
  emptyAccidentRecord,
  observed as observedAccident,
  type AccidentRecord,
  type AccidentState,
} from '../summon/summonAccident';
import type { NarrativeSeedStatus } from '../narrative/types';

const CLOCK_KEY = 'world_clock';
/**
 * Which NOW / NEXT experience events the player has already met.
 *
 * This is engine bookkeeping, not world canon: bumping into a villager
 * is not a fact of history the way sparing a man is, and it must never
 * appear in the LIFE ARCHIVE. It lives as one more key in the existing
 * key/value state store — no new store, no new index, no DB version
 * change, and a save written before this build simply has no such key.
 */
const SEEN_EXPERIENCE_KEY = 'experience_seen';
/**
 * Pacing bookkeeping: when each event last played, and the order they
 * were met in. A separate key from experience_seen on purpose — a save
 * written before this build has no such row, reads as empty, and every
 * "have I seen this?" answer still comes from the older key.
 */
const EXPERIENCE_LOG_KEY = 'experience_log';
/**
 * How many of each species the player has beaten, and how long it has
 * been since one of them turned out to be somebody.
 *
 * Current state, not history: WORLD MEMORY does not record that a moss
 * rabbit was fought on the path, because nothing about the world
 * changed when it was. Absent in an older save, which reads as none.
 */
const ENEMY_PROGRESS_KEY = 'enemy_progress';
/** The creatures that DID turn out to be somebody, and what became of them. */
const ENEMY_INDIVIDUALS_KEY = 'enemy_individuals';
/**
 * ARCANA — how much the player has come to know about each thing.
 *
 * Kept as one row of arcanaId -> the conditions that have been met, and
 * deliberately NOT as percentages: the number is worked out from the
 * conditions every time it is asked for, so a save can never disagree
 * with the rules and rebalancing them rewrites nobody's history.
 *
 * Absent in a save written before this build, which reads as "nothing
 * is known yet" — the same answer a new world gives.
 */
const ARCANA_KEY = 'arcana_records';
/**
 * SUMMONING ACCIDENTS: where the player stands with each thing that
 * has ever crossed them.
 *
 * One row per candidate — how far along it is, how many times it has
 * been seen, and when — which is everything the pool needs to decide
 * whether it may happen again. Deliberately NOT a WORLD MEMORY event:
 * killing a man changes the world and glimpsing something you cannot
 * name does not, and the archive must not fill up with sightings.
 *
 * Absent in a save written before this build, which reads as "nothing
 * has crossed yet" — the same answer a new world gives.
 */
const ACCIDENTS_KEY = 'summon_accidents';

interface ExperienceLog {
  /** eventId -> absolute day it last played. */
  lastSeenDay: Record<string, number>;
  /** Event ids in the order they were met, newest last. */
  order: string[];
}

const EMPTY_LOG: ExperienceLog = { lastSeenDay: {}, order: [] };
/** Enough history to keep two or three beats from repeating a feeling. */
const LOG_ORDER_LIMIT = 12;

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

/** A future site that world truth has put on the map, and whether the
 *  player has actually been there. */
export interface OpenFutureSite {
  def: FutureSiteDef;
  discovered: boolean;
}

/**
 * How the player is getting on with one species.
 *
 * `defeated` is the whole count; `sinceStory` is how many of them have
 * been beaten since one of them turned out to be somebody, which is what
 * the chance of the next one being somebody is read off.
 */
export interface EnemyProgress {
  defeated: number;
  sinceStory: number;
  /** How many of this species have been named so far. */
  named: number;
}

/**
 * One creature that stopped being a species and became somebody.
 *
 * Minted only when a fight ends in a story, which is why an ordinary
 * moss rabbit has no row here and killing one changes nothing about
 * whether Greenwood has moss rabbits in it.
 */
export interface EnemyIndividual {
  individualId: string;
  speciesId: string;
  status: 'alive' | 'dead';
  /** What the player chose to be to it. 'unknown' until they choose. */
  relationship: 'unknown' | 'spared' | 'helped' | 'captured' | 'ended';
  firstMetYear: number;
  lastMetYear: number;
  /** Whether meeting them again years from now is possible at all. */
  reunionAvailable: boolean;
}

const EMPTY_PROGRESS: EnemyProgress = { defeated: 0, sinceStory: 0, named: 0 };

/** What the four answers make a creature to the player, afterwards. */
const CREATURE_RELATIONSHIP: Record<LifeChoiceId, EnemyIndividual['relationship']> = {
  KILL: 'ended',
  SPARE: 'spared',
  HELP: 'helped',
  CAPTURE: 'captured',
};

type Listener = () => void;

export class World {
  private events: MemoryEvent[];
  private clock: WorldClock;
  private characters: Record<string, CharacterState>;
  private listeners = new Set<Listener>();
  private version = 0;
  private timePassing = false;

  private seenExperience: Set<string>;
  private experienceLog: ExperienceLog;
  private enemyProgress: Record<string, EnemyProgress>;
  private enemyIndividuals: EnemyIndividual[];
  private arcana: Record<string, ArcanaRecord>;
  private accidents: Record<string, AccidentRecord>;

  private constructor(
    private readonly store: MemoryEventStore,
    events: MemoryEvent[],
    clock: WorldClock,
    characters: Record<string, CharacterState>,
    seenExperience: string[],
    experienceLog: ExperienceLog,
    enemyProgress: Record<string, EnemyProgress>,
    enemyIndividuals: EnemyIndividual[],
    arcana: Record<string, ArcanaRecord>,
    accidents: Record<string, AccidentRecord>,
  ) {
    this.events = events;
    this.clock = clock;
    this.characters = characters;
    this.seenExperience = new Set(seenExperience);
    this.experienceLog = experienceLog;
    this.enemyProgress = enemyProgress;
    this.enemyIndividuals = enemyIndividuals;
    this.arcana = arcana;
    this.accidents = accidents;
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
    const seen = ((await store.getStateValue(SEEN_EXPERIENCE_KEY)) as string[] | undefined) ?? [];
    const log =
      ((await store.getStateValue(EXPERIENCE_LOG_KEY)) as ExperienceLog | undefined) ?? EMPTY_LOG;
    const enemyProgress =
      ((await store.getStateValue(ENEMY_PROGRESS_KEY)) as Record<string, EnemyProgress> | undefined) ??
      {};
    const enemyIndividuals =
      ((await store.getStateValue(ENEMY_INDIVIDUALS_KEY)) as EnemyIndividual[] | undefined) ?? [];
    const arcanaRaw =
      ((await store.getStateValue(ARCANA_KEY)) as Record<string, unknown> | undefined) ?? {};
    const accidentsRaw = await store.getStateValue(ACCIDENTS_KEY);
    return new World(
      store,
      events,
      clock,
      characters,
      seen,
      { lastSeenDay: { ...log.lastSeenDay }, order: [...log.order] },
      enemyProgress,
      enemyIndividuals,
      readArcanaRows(arcanaRaw),
      readAccidentRows(accidentsRaw),
    );
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
   * Whether this world has been lived in at all — recorded history OR a
   * clock that has moved. Resting for a few days is progress too, so the
   * title must offer to continue rather than silently starting over.
   */
  hasProgress(): boolean {
    return (
      this.events.length > 0 ||
      this.seenExperience.size > 0 ||
      // Having come to know something is progress too. A player who met
      // a moss rabbit and closed the game must be offered their world
      // back, not a new one.
      Object.values(this.arcana).some((record) => record.met.length > 0) ||
      Object.keys(this.accidents).length > 0 ||
      this.clock.worldYear !== INITIAL_CLOCK.worldYear ||
      this.clock.worldDay !== INITIAL_CLOCK.worldDay
    );
  }

  /**
   * Minimal PLAYER KNOWLEDGE approximation (full system arrives in a later
   * phase): the player-facing WORLD MEMORY view shows only events the
   * player took part in, plus world-scale time passage. Gald's off-screen
   * life stays hidden until the player finds him (or, on the KILL route,
   * finds his grave) — world truth must never spoil itself through the UI.
   */
  getKnownEvents(): MemoryEvent[] {
    // Whatever the route, the player learns Gald's off-screen history at
    // one moment only: when they go to the place the world put on the map
    // and see for themselves.
    const discovered = this.hasDiscoveredGaldFuture();
    return this.getEvents().filter(
      (e) =>
        e.actors.includes('PLAYER') ||
        e.type === 'WORLD_TIME_SHIFTED' ||
        (discovered && e.actors.includes('GALD')),
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

  /**
   * FUTURE SITES the world has opened, whichever route this world took —
   * the bakery, the waystation, the workyard or the grave. World truth
   * decides that a place exists; `discovered` is player knowledge and is
   * the only thing that may put a name on it.
   */
  getOpenFutureSites(): OpenFutureSite[] {
    return FUTURE_SITE_DEFS.filter((def) => this.hasEventOfType(def.requiredMemory)).map(
      (def) => ({ def, discovered: this.hasEventOfType(def.discovery.type) }),
    );
  }

  /** Whether the player has been to this particular place. */
  hasDiscoveredSite(siteId: string): boolean {
    const def = futureSiteDef(siteId);
    return def ? this.hasEventOfType(def.discovery.type) : false;
  }

  /**
   * Whether the player has seen what became of their choice — on ANY
   * route. Gates the LIFE ARCHIVE and the player-facing WORLD MEMORY.
   */
  hasDiscoveredGaldFuture(): boolean {
    return FUTURE_DISCOVERY_TYPES.some((type) => this.hasEventOfType(type));
  }

  // ---- EXPERIENCE (NOW / NEXT events) ----

  /**
   * A read-only window for the EXPERIENCE ENGINE. The engine never sees
   * the world itself — only this.
   */
  getExperienceView(): ExperienceWorldView {
    const hasSeen = (eventId: string) => this.seenExperience.has(eventId);
    return {
      hasMemory: (type) => this.events.some((e) => e.type === type),
      hasSeen,
      worldYear: this.clock.worldYear,
      worldDay: this.clock.worldDay,
      // EXPERIENCE CONTROL v0.2 — pacing, never gating.
      today: toAbsoluteDay(this.clock),
      lastSeenDay: (eventId) => this.experienceLog.lastSeenDay[eventId] ?? null,
      recentEmotions: recentEmotionsOf(
        ALDEN_EXPERIENCE_EVENTS,
        [...this.experienceLog.order].reverse(),
        3,
      ),
      unresolvedSeeds: unresolvedSeedCount(ALDEN_NARRATIVE_SEEDS, hasSeen),
      // EXPERIENCE DIRECTOR v0.1 — the recent past, newest first, and
      // whether a life is waiting to be found. Both derived on the spot.
      recentEventIds: [...this.experienceLog.order].reverse(),
      lifeEventAvailable: this.getOpenFutureSites().some((site) => !site.discovered),
    };
  }

  /**
   * What the experience layer has actually done so far, for DEV REVIEW
   * HUB. Read-only, derived, and never world canon — none of it belongs
   * in the LIFE ARCHIVE.
   */
  getExperienceSummary(): {
    seenEventIds: string[];
    recentEventIds: string[];
    lastSeenDay: Record<string, number>;
  } {
    return {
      seenEventIds: [...this.seenExperience],
      recentEventIds: [...this.experienceLog.order].reverse(),
      lastSeenDay: { ...this.experienceLog.lastSeenDay },
    };
  }

  /**
   * NARRATIVE SEEDS, derived from what the player has met. Nothing is
   * stored for this and none of it is world canon.
   */
  getNarrativeSeeds(): NarrativeSeedStatus[] {
    return seedStatuses(ALDEN_NARRATIVE_SEEDS, (id) => this.seenExperience.has(id));
  }

  hasSeenExperience(eventId: string): boolean {
    return this.seenExperience.has(eventId);
  }

  /**
   * Remembers that the player met this event, and when.
   *
   * The "seen" set is idempotent; the log is not — a repeatable event
   * plays again, and the pacing needs to know it just did.
   */
  async markExperienceSeen(eventId: string): Promise<void> {
    const seen = this.seenExperience.has(eventId) ? [...this.seenExperience] : [...this.seenExperience, eventId];
    const log: ExperienceLog = {
      lastSeenDay: { ...this.experienceLog.lastSeenDay, [eventId]: toAbsoluteDay(this.clock) },
      order: [...this.experienceLog.order, eventId].slice(-LOG_ORDER_LIMIT),
    };
    await this.store.commit({
      putState: [
        { key: SEEN_EXPERIENCE_KEY, value: seen },
        { key: EXPERIENCE_LOG_KEY, value: log },
      ],
    });
    this.seenExperience = new Set(seen);
    this.experienceLog = log;
    this.emit();
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
   * Records the moment the player actually goes to a future site and sees
   * what became of their choice — the bakery, the waystation, the workyard
   * or the grave.
   *
   * Only callable in a world whose truth already contains the site's
   * required memory: a TIME SHIFT alone never creates this event, and no
   * route can produce another route's discovery. Once per world
   * (idempotent on revisit).
   */
  // ---- ORDINARY ENEMIES (species, and the rare individual) ----

  /** How the player is getting on with one species. Never null. */
  getEnemyProgress(speciesId: string): EnemyProgress {
    return this.enemyProgress[speciesId] ?? EMPTY_PROGRESS;
  }

  /** The creatures that turned out to be somebody. */
  getEnemyIndividuals(): EnemyIndividual[] {
    return this.enemyIndividuals.map((one) => ({ ...one }));
  }

  getEnemyIndividual(individualId: string): EnemyIndividual | null {
    const found = this.enemyIndividuals.find((one) => one.individualId === individualId);
    return found ? { ...found } : null;
  }

  /**
   * A fight in the forest is over. Was that one just an animal, or was
   * it somebody?
   *
   * Beating an ordinary creature is not a fact the world keeps — it only
   * moves the count, which is what makes the next one a little more
   * likely to have a story. When one does, it is named here and now, and
   * the count starts again.
   *
   * Returns the newly named individual, or null for an ordinary victory.
   * Resolves only once the write is committed.
   */
  async resolveEnemyVictory(
    speciesId: string,
    options: { rng?: Rng; forced?: boolean | null; config?: StoryTriggerConfig } = {},
  ): Promise<EnemyIndividual | null> {
    const before = this.getEnemyProgress(speciesId);
    const sinceStory = before.sinceStory + 1;
    const becomesSomebody = rollIndividualStory({
      victoriesSinceStory: sinceStory,
      rng: options.rng,
      config: options.config,
      forced: options.forced ?? null,
    });

    const individual: EnemyIndividual | null = becomesSomebody
      ? {
          individualId: mintIndividualId(speciesId, before.named),
          speciesId,
          status: 'alive',
          relationship: 'unknown',
          firstMetYear: this.clock.worldYear,
          lastMetYear: this.clock.worldYear,
          reunionAvailable: false,
        }
      : null;

    const progress: EnemyProgress = {
      defeated: before.defeated + 1,
      sinceStory: becomesSomebody ? 0 : sinceStory,
      named: before.named + (becomesSomebody ? 1 : 0),
    };
    const nextProgress = { ...this.enemyProgress, [speciesId]: progress };
    const nextIndividuals = individual
      ? [...this.enemyIndividuals, individual]
      : this.enemyIndividuals;

    const rows: WorldStateRow[] = [{ key: ENEMY_PROGRESS_KEY, value: nextProgress }];
    if (individual) rows.push({ key: ENEMY_INDIVIDUALS_KEY, value: nextIndividuals });
    await this.store.commit({ putState: rows });
    this.enemyProgress = nextProgress;
    this.enemyIndividuals = nextIndividuals;
    this.emit();
    return individual ? { ...individual } : null;
  }

  /**
   * What the player decided about one particular creature.
   *
   * The same shape as the choice made about Gald, and for the same
   * reason: it is a fact about a life, so it goes into WORLD MEMORY and
   * stays there. The individual's own row is updated in the same
   * transaction, because "killed" and "still alive" must never disagree.
   *
   * Idempotent for the same choice; a contradictory second answer is
   * refused rather than overwritten.
   */
  async recordCreatureLifeChoice(individualId: string, choice: LifeChoiceId): Promise<MemoryEvent> {
    const eventId = `evt_creature_life_choice_${individualId}`;
    const existing = this.events.find((e) => e.id === eventId);
    if (existing) {
      if (existing.type === CREATURE_LIFE_CHOICE_EVENT_TYPE[choice]) return existing;
      throw new Error(
        `${individualId}'s life is already recorded as ${existing.type}; refusing ${choice}`,
      );
    }
    const individual = this.enemyIndividuals.find((one) => one.individualId === individualId);
    if (!individual) throw new Error(`No such individual: ${individualId}`);

    const event: MemoryEvent = {
      id: eventId,
      type: CREATURE_LIFE_CHOICE_EVENT_TYPE[choice],
      worldYear: this.clock.worldYear,
      worldDay: this.clock.worldDay,
      location: 'GREENWOOD_FOREST',
      actors: ['PLAYER', individualId],
      importance: 'NORMAL',
      createdAt: new Date().toISOString(),
    };

    const updated: EnemyIndividual = {
      ...individual,
      status: choice === 'KILL' ? 'dead' : 'alive',
      relationship: CREATURE_RELATIONSHIP[choice],
      lastMetYear: this.clock.worldYear,
      // Somebody let go, helped or taken along can be met again years
      // from now. Somebody whose life ended cannot — though what that
      // death did to the world is a separate question, and still open.
      reunionAvailable: choice !== 'KILL',
    };
    const nextIndividuals = this.enemyIndividuals.map((one) =>
      one.individualId === individualId ? updated : one,
    );

    await this.store.commit({
      addEvents: [event],
      putState: [{ key: ENEMY_INDIVIDUALS_KEY, value: nextIndividuals }],
    });
    this.events = [...this.events, event];
    this.enemyIndividuals = nextIndividuals;
    this.emit();
    return event;
  }

  // ---- ARCANA (what the player has come to know) ----

  /**
   * What is known about one thing. Never null: a page nobody has opened
   * is an empty page, not a missing one.
   */
  getArcanaRecord(arcanaId: string): ArcanaRecord {
    const found = this.arcana[arcanaId];
    return found ? { ...found, met: [...found.met] } : emptyArcanaRecord(arcanaId);
  }

  /** The whole book, in page order. */
  getArcanaRecords(): ArcanaRecord[] {
    return ARCANA_DEFS.map((def) => this.getArcanaRecord(def.arcanaId));
  }

  /**
   * The player has come to know something. Says what that changed.
   *
   * Given a batch, because one fight teaches several things at once and
   * the player should pay for that with one write, not five. Conditions
   * already met, conditions this page does not define, planned ones and
   * ones that need the thing to be known at all are all dropped by the
   * pure rules — and if nothing survives, nothing is written and null
   * comes back. That is what makes the same fight, fought again,
   * silent.
   */
  async recordArcanaConditions(
    arcanaId: string,
    conditionIds: readonly ArcanaConditionId[],
  ): Promise<ArcanaGain | null> {
    const def = arcanaDef(arcanaId);
    if (!def) return null;
    const applied = applyArcanaConditions(def, this.getArcanaRecord(arcanaId), conditionIds);
    if (!applied) return null;

    const next = { ...this.arcana, [arcanaId]: applied.record };
    await this.store.commit({ putState: [{ key: ARCANA_KEY, value: next }] });
    this.arcana = next;
    this.emit();
    return applied.gain;
  }

  /**
   * The completion moment has been played. Saved, so a reload does not
   * play it a second time — the one thing about a page that is state
   * rather than a consequence of what the player did.
   */
  async markArcanaCompleteSeen(arcanaId: string): Promise<void> {
    const current = this.getArcanaRecord(arcanaId);
    if (current.completeSeen) return;
    const next = { ...this.arcana, [arcanaId]: { ...current, completeSeen: true } };
    await this.store.commit({ putState: [{ key: ARCANA_KEY, value: next }] });
    this.arcana = next;
    this.emit();
  }

  // ---- SUMMONING ACCIDENTS (what the player glimpsed) ----

  /** Where this save stands with everything that could cross it. */
  getAccidentRecords(): AccidentRecord[] {
    return SUMMON_ACCIDENTS.map((def) => this.getAccidentRecord(def.id));
  }

  /** Never null: a thing nobody has seen is UNSEEN, not missing. */
  getAccidentRecord(accidentId: string): AccidentRecord {
    const found = this.accidents[accidentId];
    return found ? { ...found } : emptyAccidentRecord(accidentId);
  }

  /** The ones actually witnessed, in the order they first were. */
  getObservedAccidents(): string[] {
    return SUMMON_ACCIDENTS.filter((def) => this.getAccidentRecord(def.id).timesObserved > 0).map(
      (def) => def.id,
    );
  }

  /**
   * ARCANA the player holds outright.
   *
   * What the accident pool excludes by. A completed page is a thing
   * the player summons on purpose, and it must never turn up again as
   * something crossing them by chance.
   */
  getAcquiredArcanaIds(): string[] {
    return ARCANA_DEFS.filter((def) => isComplete(def, this.getArcanaRecord(def.arcanaId))).map(
      (def) => def.arcanaId,
    );
  }

  /**
   * The player saw something cross. Says whether that was the first.
   *
   * Counted rather than merely flagged: how many times and how long
   * ago are what a repeat policy and a cooldown are made of.
   */
  async recordAccidentObserved(accidentId: string): Promise<boolean> {
    const current = this.getAccidentRecord(accidentId);
    const day = toAbsoluteDay(this.clock);
    const next = { ...this.accidents, [accidentId]: observedAccident(current, day) };
    await this.store.commit({ putState: [{ key: ACCIDENTS_KEY, value: next }] });
    this.accidents = next;
    this.emit();
    return current.timesObserved === 0;
  }

  /**
   * Where the player has got to with one of them.
   *
   * The entry point for UNKNOWN → IDENTIFIED → ACQUIRED. Nothing in
   * the game calls this yet, because the event that would — actually
   * meeting the thing — is a later phase. It exists so that phase is
   * a call rather than a migration.
   */
  async setAccidentState(accidentId: string, state: AccidentState): Promise<void> {
    const current = this.getAccidentRecord(accidentId);
    if (current.state === state) return;
    const next = { ...this.accidents, [accidentId]: { ...current, state } };
    await this.store.commit({ putState: [{ key: ACCIDENTS_KEY, value: next }] });
    this.accidents = next;
    this.emit();
  }

  /**
   * Development only: forget what was glimpsed, so it can be glimpsed
   * again. Testing a sight with a month-long cooldown otherwise means
   * a new save every time.
   */
  async forgetObservedAccidents(): Promise<void> {
    if (Object.keys(this.accidents).length === 0) return;
    await this.store.commit({ putState: [{ key: ACCIDENTS_KEY, value: {} }] });
    this.accidents = {};
    this.emit();
  }

  async recordFutureSiteDiscovery(siteId: string): Promise<MemoryEvent> {
    const def = futureSiteDef(siteId);
    if (!def) throw new Error(`Unknown future site: ${siteId}`);
    const existing = this.events.find((e) => e.type === def.discovery.type);
    if (existing) return existing;
    if (!this.hasEventOfType(def.requiredMemory)) {
      throw new Error(`${def.discovery.type} requires ${def.requiredMemory} in world truth`);
    }
    const event: MemoryEvent = {
      id: def.discovery.eventId,
      type: def.discovery.type,
      worldYear: this.clock.worldYear,
      worldDay: this.clock.worldDay,
      location: def.id,
      // The grave is still his: the archive follows GALD's actor tag.
      actors: ['PLAYER', 'GALD'],
      importance: 'MAJOR',
      createdAt: new Date().toISOString(),
      causedBy: [def.requiredMemory],
    };
    await this.store.commit({ addEvents: [event] });
    this.events = [...this.events, event];
    this.emit();
    return event;
  }

  /** The SPARE route's discovery, by its Phase E name. */
  async recordGaldReunion(): Promise<MemoryEvent> {
    return this.recordFutureSiteDiscovery('ALDEN_BAKERY');
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

  /**
   * DEV ONLY: put a page into a given state outright.
   *
   * Reaching 90% by playing takes a dozen fights and a time shift,
   * which is the right price for a player and the wrong one for
   * checking that the page renders. Reachable only through DEV ADMIN,
   * which is compiled out of a production build.
   */
  async devSetArcanaConditions(
    arcanaId: string,
    conditionIds: readonly ArcanaConditionId[],
  ): Promise<void> {
    const def = arcanaDef(arcanaId);
    if (!def) return;
    const record: ArcanaRecord = {
      arcanaId,
      met: conditionIds.filter((id) => def.conditions.some((c) => c.id === id && !c.planned)),
      completeSeen: false,
    };
    const next = { ...this.arcana, [arcanaId]: record };
    await this.store.commit({ putState: [{ key: ARCANA_KEY, value: next }] });
    this.arcana = next;
    this.emit();
  }

  /** NEW GAME / RESET WORLD: deletes all saved world data and restores defaults. */
  async resetWorld(): Promise<void> {
    await this.store.clearAll();
    this.events = [];
    this.clock = INITIAL_CLOCK;
    this.characters = { ...INITIAL_CHARACTERS };
    this.seenExperience = new Set();
    this.experienceLog = { lastSeenDay: {}, order: [] };
    this.enemyProgress = {};
    this.enemyIndividuals = [];
    // A reset world knows nothing, the same as a world nobody has
    // played: leaving the book filled in while its history was erased
    // would be a save that disagrees with itself.
    this.arcana = readArcanaRows({});
    // Including what it glimpsed. A reset world has never seen
    // anything it cannot explain, and the once-per-save sight is
    // available again because it is a new save.
    this.accidents = {};
    this.emit();
  }
}

/**
 * Every page, restored from whatever the save happens to hold.
 *
 * Pages the save has never heard of come back empty rather than
 * missing, so every reader downstream can assume a record exists.
 */
function readArcanaRows(raw: Record<string, unknown>): Record<string, ArcanaRecord> {
  const rows: Record<string, ArcanaRecord> = {};
  for (const def of ARCANA_DEFS) {
    rows[def.arcanaId] = readArcanaRecord(def, raw[def.arcanaId]);
  }
  return rows;
}


/**
 * Where the player stands with each thing that can cross, restored
 * from whatever the save happens to hold.
 *
 * Two shapes are accepted. The current one is a map of records. The
 * other is the flat list of ids an earlier build of this feature
 * wrote, which is read as "seen once, at a time nobody wrote down" —
 * a save must never be made worthless by the shape of its own
 * bookkeeping changing.
 */
function readAccidentRows(raw: unknown): Record<string, AccidentRecord> {
  const rows: Record<string, AccidentRecord> = {};
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id !== 'string') continue;
      rows[id] = { accidentId: id, state: 'OBSERVED', timesObserved: 1, lastObservedDay: null };
    }
    return rows;
  }
  if (!raw || typeof raw !== 'object') return rows;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const row = value as Partial<AccidentRecord> | null;
    if (!row || typeof row !== 'object') continue;
    const state = row.state;
    rows[id] = {
      accidentId: id,
      state:
        state === 'OBSERVED' || state === 'IDENTIFIED' || state === 'ACQUIRED' ? state : 'UNSEEN',
      timesObserved: Number.isFinite(row.timesObserved) ? Math.max(0, Number(row.timesObserved)) : 0,
      lastObservedDay: Number.isFinite(row.lastObservedDay) ? Number(row.lastObservedDay) : null,
    };
  }
  return rows;
}

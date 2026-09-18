// EXPERIENCE DIRECTOR v0.1 — rule-based pacing, one layer above the engine.
//
//   EVENT ENGINE      "what could happen here right now"
//   EXPERIENCE DIRECTOR "of those, which one should the player meet"
//
// No AI, no model, no randomness. Every adjustment is a named rule with a
// number and a reason attached, so any selection can be explained after
// the fact in DEV REVIEW HUB. That is the whole design goal: if a future
// version learns its weights, this one stays as the baseline it has to
// beat, and as the fallback when it is wrong.
//
// Three hard limits, in priority order:
//
//   1. The director never makes an ineligible event eligible. Requirements
//      belong to the engine and are not negotiable.
//   2. The director never writes anything. WORLD MEMORY is canon; pacing
//      is an opinion about ordering and must never become a fact.
//   3. The director never invents an event. If a place is quiet, it stays
//      quiet — silence is part of the rhythm, not a failure to fill.

import { findAvailableEvents, rank, type EventQuery } from './experienceEngine';
import type {
  EmotionTarget,
  ExperienceEventDef,
  ExperienceLayer,
  ExperienceWorldView,
} from './types';

/** The knobs. Small, named, and all in one place so they can be argued about. */
export interface DirectorControl {
  /** How many recent events count as "just now". */
  window: number;
  /** Penalty per repeat of the same feeling inside the window. */
  emotionRepeatPenalty: number;
  /** Penalty per repeat of the same face inside the window. */
  characterRepeatPenalty: number;
  /** Open questions tolerated before new ones are held back. */
  maxUnresolvedSeeds: number;
  /** How hard a new question is pushed down once that limit is reached. */
  seedOverloadPenalty: number;
  /**
   * Boost for a LIFE beat. Deliberately larger than any sane priority:
   * this one is not a tie-break. A life moving on goes first, or the
   * whole point of the game can be lost to a joke about a cat.
   */
  lifeProtectionBoost: number;
  /**
   * Boost for a beat that only exists because a life moved on, while a
   * LIFE moment is still waiting to be found. This is how 「また会えた」
   * gets pointed at without ever being announced.
   */
  lifeHintBoost: number;
  /** Boost for a NEXT beat when the window has been nothing but NOW. */
  layerBalanceBoost: number;
  /** Beats without discovery before curiosity gets a nudge. */
  surpriseDroughtLimit: number;
  /** Size of that nudge. Deliberately small — a nudge, not a guarantee. */
  surpriseBoost: number;
}

export const DEFAULT_DIRECTOR_CONTROL: DirectorControl = {
  window: 3,
  emotionRepeatPenalty: 3,
  characterRepeatPenalty: 3,
  maxUnresolvedSeeds: 2,
  // Large on purpose: it should move a new question to the back of the
  // queue. It is still only a number, so a place that has nothing else
  // will still offer it — suppression must never empty a room.
  seedOverloadPenalty: 25,
  lifeProtectionBoost: 100,
  lifeHintBoost: 6,
  layerBalanceBoost: 4,
  // A whole window with no discovery in it. Anything shorter is not a
  // drought, it is just a quiet minute — and those are allowed.
  surpriseDroughtLimit: 3,
  surpriseBoost: 4,
};

/** Feelings that count as "something happened I did not expect". */
const SURPRISE_EMOTIONS: readonly EmotionTarget[] = ['DISCOVERY', 'CURIOSITY'];

export type DirectorRule =
  | 'EMOTION_REPEAT'
  | 'CHARACTER_REPEAT'
  | 'SEED_OVERLOAD'
  | 'LIFE_PROTECTION'
  | 'LIFE_HINT'
  | 'LAYER_BALANCE'
  | 'SURPRISE_DROUGHT'
  | 'CORE_PROTECTED';

export interface DirectorRuleHit {
  rule: DirectorRule;
  /** Added to the event's base priority. Zero for a note-only hit. */
  delta: number;
  /** Why, with the numbers that produced it. DEV ONLY — never shown in game. */
  reason: string;
}

export interface DirectorScore {
  def: ExperienceEventDef;
  base: number;
  final: number;
  hits: DirectorRuleHit[];
}

/**
 * What the last few minutes have been like. Derived every time from the
 * event log; nothing here is stored, so there is no second state to keep
 * in step with the world and nothing to migrate.
 */
export interface ExperienceState {
  recentLayers: ExperienceLayer[];
  recentEmotions: EmotionTarget[];
  recentCharacters: string[];
  unresolvedSeeds: number;
  /** Beats since the last DISCOVERY / CURIOSITY. Window length if none. */
  eventsSinceLastSurprise: number;
  lifeEventAvailable: boolean;
}

export interface DirectorDecision {
  /** The event to play, or null when the place genuinely has nothing. */
  selected: ExperienceEventDef | null;
  state: ExperienceState;
  /** Everything that was eligible, best first, with the reasoning. */
  scores: DirectorScore[];
  /** True when nothing was eligible — a quiet moment, not a fault. */
  quiet: boolean;
}

function plantsANewSeed(def: ExperienceEventDef): boolean {
  return def.dna?.seed?.role === 'PLANTS';
}

/**
 * Whether this beat exists only because the world changed — a rumour, a
 * notice, someone repeating what they heard. Read off the requirements,
 * so no content has to be tagged by hand.
 */
function followsAWorldChange(def: ExperienceEventDef): boolean {
  return (def.requirements ?? []).some(
    (r) => r.kind === 'MEMORY_PRESENT' || r.kind === 'ANY_MEMORY_PRESENT',
  );
}

function countIn<T>(haystack: readonly T[], needle: T): number {
  return haystack.filter((x) => x === needle).length;
}

/**
 * Reads the recent past off the event log.
 *
 * Deliberately not a player profile: six numbers about the last three
 * beats, thrown away and recomputed every time.
 */
export function buildExperienceState(
  defs: readonly ExperienceEventDef[],
  view: ExperienceWorldView,
  control: DirectorControl = DEFAULT_DIRECTOR_CONTROL,
): ExperienceState {
  const byId = new Map(defs.map((d) => [d.eventId, d]));
  const recent = (view.recentEventIds ?? []).slice(0, control.window);
  const recentDefs = recent.map((id) => byId.get(id)).filter((d): d is ExperienceEventDef => !!d);

  const recentEmotions = recentDefs
    .map((d) => d.dna?.emotionTarget)
    .filter((e): e is EmotionTarget => !!e);

  // A view from an older build may know emotions but not ids; use what
  // it has rather than pretending the player just arrived.
  const emotions = recentEmotions.length > 0 ? recentEmotions : (view.recentEmotions ?? []).slice(0, control.window);

  const surpriseAt = emotions.findIndex((e) => SURPRISE_EMOTIONS.includes(e));
  // No surprise anywhere in what we can see: the drought is as long as
  // the history we have, never longer. A player who has just arrived is
  // not in a drought, they are at the beginning.
  const sinceSurprise = surpriseAt === -1 ? emotions.length : surpriseAt;

  return {
    recentLayers: recentDefs.map((d) => d.layer),
    recentEmotions: emotions,
    recentCharacters: recentDefs.flatMap((d) => d.dna?.characters ?? []),
    unresolvedSeeds: view.unresolvedSeeds ?? 0,
    eventsSinceLastSurprise: sinceSurprise,
    lifeEventAvailable: view.lifeEventAvailable ?? false,
  };
}

/**
 * Every rule, applied to one event. Pure and tiny on purpose: a rule that
 * cannot be read in ten seconds cannot be argued with, and a director
 * nobody can argue with becomes magic.
 */
export function ruleHits(
  def: ExperienceEventDef,
  state: ExperienceState,
  control: DirectorControl = DEFAULT_DIRECTOR_CONTROL,
): DirectorRuleHit[] {
  const hits: DirectorRuleHit[] = [];

  // --- boosts (apply to core events too) ---

  if (def.layer === 'LIFE') {
    hits.push({
      rule: 'LIFE_PROTECTION',
      delta: control.lifeProtectionBoost,
      reason: 'LIFE layer: a life moving on outranks ambient beats',
    });
  }

  if (state.lifeEventAvailable && def.layer !== 'LIFE' && followsAWorldChange(def)) {
    hits.push({
      rule: 'LIFE_HINT',
      delta: control.lifeHintBoost,
      reason: 'a LIFE moment is waiting; talk about it comes first',
    });
  }

  if (
    def.layer === 'NEXT' &&
    state.recentLayers.length >= control.window &&
    state.recentLayers.every((l) => l === 'NOW')
  ) {
    hits.push({
      rule: 'LAYER_BALANCE',
      delta: control.layerBalanceBoost,
      reason: `recent layers = ${state.recentLayers.length}x NOW`,
    });
  }

  const emotion = def.dna?.emotionTarget;
  if (
    emotion &&
    SURPRISE_EMOTIONS.includes(emotion) &&
    state.eventsSinceLastSurprise >= control.surpriseDroughtLimit
  ) {
    hits.push({
      rule: 'SURPRISE_DROUGHT',
      delta: control.surpriseBoost,
      reason: `events since last discovery = ${state.eventsSinceLastSurprise}`,
    });
  }

  // --- penalties (never applied to a core beat) ---

  if (def.core) {
    hits.push({ rule: 'CORE_PROTECTED', delta: 0, reason: 'core event: pacing penalties skipped' });
    return hits;
  }

  if (emotion) {
    const repeats = countIn(state.recentEmotions, emotion);
    if (repeats > 0) {
      hits.push({
        rule: 'EMOTION_REPEAT',
        delta: -control.emotionRepeatPenalty * repeats,
        reason: `recent ${emotion} events = ${repeats}`,
      });
    }
  }

  for (const character of def.dna?.characters ?? []) {
    const repeats = countIn(state.recentCharacters, character);
    if (repeats > 0) {
      hits.push({
        rule: 'CHARACTER_REPEAT',
        delta: -control.characterRepeatPenalty * repeats,
        reason: `${character} appeared recently = ${repeats}`,
      });
    }
  }

  if (plantsANewSeed(def) && state.unresolvedSeeds >= control.maxUnresolvedSeeds) {
    hits.push({
      rule: 'SEED_OVERLOAD',
      delta: -control.seedOverloadPenalty,
      reason: `unresolved seeds = ${state.unresolvedSeeds} (limit ${control.maxUnresolvedSeeds})`,
    });
  }

  return hits;
}

/**
 * The whole decision, with its reasoning kept.
 *
 * Ties break on definition order, so the same world always plays the same
 * sequence — a playtest that cannot be reproduced cannot be learned from.
 */
export function direct(
  defs: readonly ExperienceEventDef[],
  view: ExperienceWorldView,
  query: EventQuery = {},
  control: DirectorControl = DEFAULT_DIRECTOR_CONTROL,
): DirectorDecision {
  const state = buildExperienceState(defs, view, control);
  const available = findAvailableEvents(defs, view, query);

  const scores: DirectorScore[] = available
    .map((def, index) => {
      const base = rank(def);
      const hits = ruleHits(def, state, control);
      const final = hits.reduce((sum, h) => sum + h.delta, base);
      return { def, base, final, hits, index };
    })
    .sort((a, b) => b.final - a.final || a.index - b.index)
    .map(({ def, base, final, hits }) => ({ def, base, final, hits }));

  return {
    selected: scores[0]?.def ?? null,
    state,
    scores,
    quiet: scores.length === 0,
  };
}

/**
 * The one event to play here, or null when the place has nothing.
 *
 * The reasoning is thrown away — use direct() when you need to explain
 * the choice, which is exactly what DEV REVIEW HUB does.
 */
export function pickEvent(
  defs: readonly ExperienceEventDef[],
  view: ExperienceWorldView,
  query: EventQuery = {},
  control: DirectorControl = DEFAULT_DIRECTOR_CONTROL,
): ExperienceEventDef | null {
  return direct(defs, view, query, control).selected;
}

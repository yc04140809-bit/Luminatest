// GOD VIEW — the author, looking at a world they are growing.
//
// NOT A PLAYER FEATURE, and the distinction is not a disclaimer: a
// player is meant to find out what became of somebody by walking into a
// bakery three years later, and a screen that lists 「SEED強度 0.78」
// would take that away from them permanently. This lives behind the dev
// gate and nothing outside src/dev imports it.
//
// WHAT IT IS FOR. Growing a world is an authoring job with no feedback:
// you write a seed kind, a crossing, a bloom, and then you cannot tell
// whether the world you meant is the world you made. The specific
// failures are quiet ones — a villager nobody's life touches, a seed
// with no way to root, a bloom whose conditions no route can satisfy, a
// region with no line into it. None of them throws. All of them are
// visible here.
//
// It is READ-ONLY in the strongest sense: every function is pure, takes
// a settled world, and returns a description of it. Nothing here can
// write a record, plant a seed, or move a clock.

import type { CharacterState } from '../core/characters/types';
import { seedKind } from '../core/life/defs';
import { grownSeed } from '../core/life/growth';
import { allBloomChecks, type BloomCheck } from '../core/life/bloom';
import { allCrossingChecks, type CrossingCheck } from '../core/life/crossing';
import type { WorldLifeRules } from '../core/life/engine';
import type {
  NpcCore,
  WorldBloom,
  WorldLifeState,
  WorldMemoryRecord,
  WorldSeed,
  WorldVine,
} from '../core/life/types';
import type { WorldPerson } from '../content/world/mugenWorld';

/**
 * The only kind of vine that is a line between two PEOPLE.
 *
 * 'DRAWN_TO' points at a seed type — 「魔法に惹かれている」 — which is a
 * fact about somebody on their own. Counting it as a connection would
 * make every person with any seed at all look connected, and the one
 * thing this screen exists to find would never be found.
 */
export const PERSONAL_VINE = 'BECAUSE_OF';

/** Everything the observer knows about one person. */
export interface NpcObservation {
  npcId: string;
  name: string;
  region: string;
  standing: WorldPerson['standing'];
  /** What the life engine knows they are made of. Null: nobody wrote one. */
  core: NpcCore | null;
  /**
   * What CANON knows about them — alive, age, trade.
   *
   * Null for most of them, and that is a real finding rather than a
   * gap to paper over: the life engine and CHARACTER_STATE are separate
   * registries, and a person the engine grows futures for who has no
   * canonical record is somebody no scene can currently show.
   */
  character: CharacterState | null;
  /** Their seeds as they stand today, strongest first. */
  seeds: readonly WorldSeed[];
  /** Lines out of them, and lines into them. */
  vinesOut: readonly WorldVine[];
  vinesIn: readonly WorldVine[];
  /** The people — not seed types — their life is actually tied to. */
  linkedTo: readonly string[];
  /** Of those, the ones in another region. */
  linkedOutside: readonly { npcId: string; region: string }[];
  /** Every record they appear in at all. */
  memories: readonly WorldMemoryRecord[];
  /** Futures currently open for them. */
  blooms: readonly WorldBloom[];
  /** And every future written about them, met or not, with reasons. */
  bloomChecks: readonly BloomCheck[];
  /**
   * Nobody's life touches theirs.
   *
   * The headline question. True when no line runs between them and any
   * other person in either direction — which is different from having
   * no seeds, and different again from appearing in no records: a woman
   * who watched every spell her daughter was shown and was moved by
   * none of them appears in a dozen records and is still, in the sense
   * that matters to this engine, alone.
   */
  isolated: boolean;
}

export interface GodView {
  /** Where the world stands. */
  now: WorldLifeState['now'];
  region: string;
  /** Everyone in the region being looked at. */
  people: readonly NpcObservation[];
  /** People connected to this region from somewhere else. */
  outsiders: readonly NpcObservation[];
  /** Everything that has happened, newest last. */
  memories: readonly WorldMemoryRecord[];
  /** Every crossing, whether it has happened, and why not. */
  crossings: readonly CrossingCheck[];
  /**
   * Ids the engine is growing lives for that the roster does not name.
   *
   * An author who adds somebody to a rule set and forgets the roster
   * has made a person no observer can see. Reported rather than
   * silently dropped.
   */
  unlisted: readonly string[];
}

/** Their seeds, as of today, deepest first. */
export function seedsFor(
  state: WorldLifeState,
  rules: WorldLifeRules,
  npcId: string,
): WorldSeed[] {
  return state.seeds
    .filter((seed) => seed.targetNpcId === npcId)
    .flatMap((seed) => {
      const kind = seedKind(rules.kinds, seed.type);
      return kind ? [grownSeed(seed, kind, state.now)] : [];
    })
    .sort((a, b) => b.strength - a.strength);
}

/** Every record somebody appears in, in any capacity. */
export function memoriesFor(state: WorldLifeState, npcId: string): WorldMemoryRecord[] {
  return state.memories.filter((memory) =>
    [memory.actor, memory.target, ...memory.witnesses].includes(npcId),
  );
}

function observePerson(
  person: WorldPerson,
  state: WorldLifeState,
  rules: WorldLifeRules,
  characters: Readonly<Record<string, CharacterState | undefined>>,
  regionOf: (npcId: string) => string,
): NpcObservation {
  const vinesOut = state.vines.filter((vine) => vine.source === person.npcId);
  const vinesIn = state.vines.filter((vine) => vine.target === person.npcId);
  const linked = new Set<string>();
  for (const vine of vinesOut) {
    if (vine.relationType === PERSONAL_VINE && vine.status !== 'BROKEN') linked.add(vine.target);
  }
  for (const vine of vinesIn) {
    if (vine.status !== 'BROKEN') linked.add(vine.source);
  }
  linked.delete(person.npcId);
  const linkedTo = [...linked].sort();

  const checks = allBloomChecks({
    defs: rules.blooms.filter((bloom) => bloom.npcId === person.npcId),
    seeds: state.seeds,
    vines: state.vines,
    kinds: rules.kinds,
    cores: rules.cores,
    now: state.now,
    since: state.memories[0]?.time ?? state.now,
  });

  return {
    npcId: person.npcId,
    name: person.name,
    region: person.region,
    standing: person.standing,
    core: rules.cores.find((core) => core.npcId === person.npcId) ?? null,
    character: characters[person.npcId] ?? null,
    seeds: seedsFor(state, rules, person.npcId),
    vinesOut,
    vinesIn,
    linkedTo,
    linkedOutside: linkedTo
      .filter((id) => regionOf(id) !== person.region)
      .map((id) => ({ npcId: id, region: regionOf(id) })),
    memories: memoriesFor(state, person.npcId),
    blooms: state.blooms.filter((bloom) => bloom.npcId === person.npcId),
    bloomChecks: checks,
    isolated: linkedTo.length === 0,
  };
}

/**
 * THE WHOLE WORLD, as a person growing it needs to see it.
 *
 * Scoped to one region, because an author works on one place at a time
 * and a roster of everybody is a roster nobody reads. Everyone outside
 * it who is nonetheless TIED to somebody inside it comes back
 * separately, which is the only way a propagation into another town is
 * visible at all from here.
 */
export function observeWorld(
  state: WorldLifeState,
  rules: WorldLifeRules,
  roster: readonly WorldPerson[],
  region: string,
  characters: Readonly<Record<string, CharacterState | undefined>> = {},
): GodView {
  const regionOf = (npcId: string) =>
    roster.find((person) => person.npcId === npcId)?.region ?? '（不明）';

  const here = roster.filter((person) => person.region === region);
  const people = here.map((person) =>
    observePerson(person, state, rules, characters, regionOf),
  );

  // Somebody in another region is worth showing exactly when a line
  // runs between them and this one. A whole second town's roster is
  // not what an author looking at Alden is asking for.
  const tied = new Set<string>();
  for (const observation of people) {
    for (const outside of observation.linkedOutside) tied.add(outside.npcId);
  }
  const outsiders = roster
    .filter((person) => tied.has(person.npcId))
    .map((person) => observePerson(person, state, rules, characters, regionOf));

  // Anybody the world treats as a person that the roster does not name.
  //
  // Three ways somebody can be one: they hold a seed, somebody wrote a
  // core for them, or a line runs to them. The third is the one that
  // catches the real case — Kaos shows a village girl a spell for years
  // and holds nothing herself, so a check that only looked at seeds and
  // cores would call the world complete while the person at the root of
  // its first seed was invisible. A DRAWN_TO target is a seed type
  // rather than a person and is deliberately not counted.
  const named = new Set(roster.map((person) => person.npcId));
  const unlisted = [
    ...new Set(
      [
        ...state.seeds.map((seed) => seed.targetNpcId),
        ...rules.cores.map((core) => core.npcId),
        ...state.vines.map((vine) => vine.source),
        ...state.vines
          .filter((vine) => vine.relationType === PERSONAL_VINE)
          .map((vine) => vine.target),
      ].filter((id) => !named.has(id)),
    ),
  ].sort();

  return {
    now: state.now,
    region,
    people,
    outsiders,
    memories: state.memories,
    crossings: allCrossingChecks(rules.crossings ?? [], {
      state,
      kinds: rules.kinds,
      cores: rules.cores,
    }),
    unlisted,
  };
}

/**
 * The people nobody's life touches.
 *
 * The question this screen was built to answer. Places are excluded —
 * a village is not lonely — and so is the player, whose connections are
 * the whole game rather than a thing to audit.
 */
export function isolatedPeople(view: GodView): NpcObservation[] {
  return view.people.filter(
    (person) => person.isolated && person.standing !== 'PLACE' && person.npcId !== 'PLAYER',
  );
}

/**
 * Futures nothing in this world can currently reach.
 *
 * The other quiet failure: a bloom whose conditions no route satisfies
 * looks exactly like a bloom that has not happened yet. This cannot
 * tell the two apart on its own — only a person can — but it can list
 * the candidates, with the requirement that is holding each one up.
 */
export function unreachedBlooms(
  view: GodView,
): { npcId: string; id: string; blocking: readonly string[] }[] {
  return [...view.people, ...view.outsiders]
    .flatMap((person) => person.bloomChecks)
    .filter((check) => !check.met)
    .map((check) => ({
      npcId: check.def.npcId,
      id: check.def.id,
      blocking: check.reasons.filter((reason) => !reason.met).map((reason) => reason.requirement),
    }));
}

/** One line per person, for the roster at the top of the screen. */
export function rosterLine(person: NpcObservation): string {
  const alive =
    person.character === null
      ? 'CHARACTER_STATE未登録'
      : person.character.alive
        ? `生存 ${person.character.age}歳 / ${person.character.occupation}`
        : '死亡';
  // The id as well as the name, because the person reading this is the
  // one who writes the rule sets: a roster that only says 「マルタ」 is a
  // roster you cannot grep for.
  return (
    `${person.name} <${person.npcId}>  [${person.standing}]  ${alive}` +
    `  SEED:${person.seeds.length} VINE:${person.linkedTo.length} BLOOM:${person.blooms.length}` +
    (person.isolated && person.standing !== 'PLACE' ? '  ⚠ 孤立' : '')
  );
}

// ONE WORLD, in which those people are all alive at the same time.
//
// Alden's rules and Gald's rules were written apart, because each was
// proving something on its own: that a chain runs end to end, and that
// one seed can become four different lives. Neither of those needed the
// other person to exist.
//
// What needs them both is the thing this file is for — lives that
// CROSS. A man the player bandaged in a forest walks into a market
// three years later because a guard stopped watching him, and a girl
// who has never left the village hears what the road is like. That
// sentence touches four people and two regions, and no single region's
// rule set can hold it.
//
// HOW IT STAYS SMALL. The merge below is a concatenation with a
// duplicate check, and the crossings are a list of PAIRS SOMEBODY
// WROTE. There is no pass over everybody, no relationship matrix, and
// no per-NPC simulation — five people and five crossings cost five
// checks when the world is settled, and five hundred people would cost
// the same five.

import type { WorldCrossingDef } from '../../core/life/crossing';
import type { SeedKindDef, WorldActionDef } from '../../core/life/defs';
import type { NpcCore, WorldBloomDef } from '../../core/life/types';
import {
  ALDEN_ACTIONS,
  ALDEN_BLOOMS,
  ALDEN_CORES,
  ALDEN_SEED_KINDS,
  ALDEN_VILLAGE_ACTOR,
  LINA,
  PLAYER_ACTOR,
} from './aldenLife';
import {
  ALDEN_GUARD,
  GALD,
  GALD_ACTIONS,
  GALD_BLOOMS,
  GALD_CORES,
  GALD_SEED_KINDS,
} from './galdLife';

export const BAKERY_OWNER = 'BAKERY_OWNER';
/** The port two days north, which the player has never been to. */
export const PORT_TOWN = 'PORT_TOWN';
/** A boy who carries crates there, and who the player will never meet. */
export const NEL = 'NEL';

/**
 * The baker, who has a corner of a stall nobody is using.
 *
 * Here because 「村で生活可能」 has to mean something concrete or it is
 * a status bar. What it means is that one particular person is willing
 * to let a man who used to rob people stand next to his bread — and
 * whether he is willing depends on what he has seen, like everything
 * else in this engine.
 */
export const BAKERY_OWNER_CORE: NpcCore = {
  npcId: BAKERY_OWNER,
  traits: ['GENTLE', 'GUARDED'],
  values: ['FAMILY', 'OWN_TWO_HANDS'],
  aptitudes: { CRAFT: 0.7 },
  desires: [],
};

/**
 * NEL — the whole point of the propagation.
 *
 * He is in a town the player has not visited, he will never appear in a
 * scene, and nothing the player does is aimed at him. What reaches him
 * is a man binding his hand on a dock, and the only reason that man is
 * on that dock at all is a decision somebody made in a forest three
 * years earlier and four days' walk away.
 *
 * His hand for healing is 0.5, which is enough to matter and not enough
 * to be a foregone conclusion — the same fork Lina has, in somebody
 * whose life the player cannot reach.
 */
export const NEL_CORE: NpcCore = {
  npcId: NEL,
  traits: ['CURIOUS', 'GENTLE'],
  values: ['OWN_TWO_HANDS'],
  aptitudes: { HEALING: 0.5 },
  desires: ['TO_GET_OFF_THE_DOCKS'],
};

/** What a market does to the people standing in it. */
const CROSSING_ACTIONS: readonly WorldActionDef[] = [
  {
    // A man everybody knows used to rob the road, buying bread like
    // anybody. Small, because that is what it is — nobody's life turns
    // on one morning — and it is still the whole mechanism by which a
    // village decides people can change.
    id: 'GALD_COMES_TO_MARKET',
    plants: 'SECOND_CHANCES',
    impact: 0.75,
    reaches: 'WITNESSES',
  },
];

const CROSSING_SEED_KINDS: readonly SeedKindDef[] = [
  {
    type: 'SECOND_CHANCES',
    label: '人は変われるらしい',
    resonates: { traits: ['GENTLE', 'CURIOUS'], values: ['FAMILY'] },
    // Slow, because it is not a wanting. A village does not decide
    // people can change on one market morning and it does not unlearn
    // it in a season either — what is really happening is that they see
    // him every week, and the engine has no recurrence, so the belief
    // is written as the thing that barely fades.
    keepsPer100Days: 0.95,
  },
];

/**
 * A future for somebody in a town the player has never been to.
 *
 * The far end of the propagation, and the reason it is worth having an
 * end at all: an influence that reaches a stranger and produces nothing
 * readable is an influence nobody can check.
 */
const CROSSING_BLOOMS: readonly WorldBloomDef[] = [
  {
    id: 'NEL_LEARNS_TO_BIND_WOUNDS',
    npcId: NEL,
    requirements: {
      seeds: [{ type: 'HEALING_CALL', atLeast: 'GROWING' }],
      aptitudes: [{ name: 'HEALING', atLeast: 0.4 }],
      afterDays: 1300,
    },
    result: '港町の荷運びの少年が、けが人の手当てを覚えはじめている。',
  },
  {
    id: 'ALDEN_BELIEVES_PEOPLE_CHANGE',
    npcId: ALDEN_VILLAGE_ACTOR,
    requirements: {
      seeds: [{ type: 'SECOND_CHANCES', atLeast: 'GROWING' }],
      afterDays: 800,
    },
    result: 'アルデンは、人は変われるという話を疑わなくなってきている。',
  },
];

/**
 * THE PAIRS OF LIVES SOMEBODY WROTE DOWN.
 *
 * Read top to bottom and it is one sentence: a man is no longer
 * watched, so he comes to market; the market is why a girl hears about
 * the road and why a baker gives him work; and work is why he is
 * standing on a dock in another town when a boy cuts his hand.
 *
 * Not one of them mentions the player, and the player is in none of the
 * meetings. What the player did is three years and one forest away, and
 * it is the reason every condition below is satisfiable at all.
 */
export const WORLD_CROSSINGS: readonly WorldCrossingDef[] = [
  {
    // 「ガルドが村で生活可能」, as a thing that happens rather than a
    // flag. What makes it possible is a future being OPEN — the guard
    // could stop watching him — not a scene anybody played.
    id: 'GALD_WALKS_INTO_ALDEN',
    between: [GALD, ALDEN_VILLAGE_ACTOR],
    when: {
      blooms: ['GUARD_STOPS_WATCHING_HIM'],
      seeds: [{ npcId: GALD, type: 'GALD_REDEMPTION', atLeast: 'ROOTED' }],
    },
    meets: {
      action: 'GALD_COMES_TO_MARKET',
      actor: GALD,
      target: ALDEN_VILLAGE_ACTOR,
      location: ALDEN_VILLAGE_ACTOR,
      witnesses: [LINA.npcId, BAKERY_OWNER, 'alden_marta'],
    },
  },
  {
    // 「GALDとLINAに接点」. She is the one who asks, because she is the
    // one who is curious — the condition is about her, not about him.
    id: 'GALD_TELLS_LINA_OF_THE_ROAD',
    between: [GALD, LINA.npcId],
    when: {
      seeds: [
        { npcId: LINA.npcId, type: 'SECOND_CHANCES', atLeast: 'DORMANT' },
        { npcId: LINA.npcId, type: 'MAGIC_DREAM', atLeast: 'GROWING' },
        { npcId: GALD, type: 'GALD_REDEMPTION', atLeast: 'ROOTED' },
      ],
    },
    meets: {
      action: 'TELL_OF_THE_WORLD',
      actor: GALD,
      target: LINA.npcId,
      location: ALDEN_VILLAGE_ACTOR,
    },
  },
  {
    id: 'BAKER_GIVES_GALD_A_CORNER',
    between: [BAKERY_OWNER, GALD],
    when: {
      seeds: [
        { npcId: BAKERY_OWNER, type: 'SECOND_CHANCES', atLeast: 'GROWING' },
        { npcId: GALD, type: 'GALD_REDEMPTION', atLeast: 'ROOTED' },
      ],
    },
    meets: {
      action: 'SHARE_BREAD',
      actor: BAKERY_OWNER,
      target: GALD,
      location: ALDEN_VILLAGE_ACTOR,
    },
  },
  {
    // THE PROPAGATION. Another region, somebody the player has never
    // met, and a seed that exists because of a choice made in a forest.
    id: 'GALD_TAKES_THE_ROAD_TO_THE_PORT',
    between: [GALD, NEL],
    when: {
      blooms: ['GALD_LOOKS_FOR_WORK'],
      seeds: [{ npcId: GALD, type: 'GALD_REDEMPTION', atLeast: 'ROOTED' }],
      // He goes because somebody gave him work worth carrying north.
      // Written as the meeting having HAPPENED rather than as his
      // gratitude still being live — a proud man goes north whether or
      // not he still feels grateful about it two years on, and gratitude
      // is the fastest-fading thing in the whole world model.
      after: ['BAKER_GIVES_GALD_A_CORNER'],
      afterDays: 1200,
    },
    meets: {
      action: 'TENDED_THE_HURT',
      actor: GALD,
      target: NEL,
      location: PORT_TOWN,
      metadata: { region: PORT_TOWN, viaAlden: true },
    },
  },
];

/**
 * Two regions' rules, concatenated, with a loud failure on collision.
 *
 * A duplicate id would mean two authors meant two different things by
 * one name, and the version that happened to be second would silently
 * win. There are few enough entries that checking is free, and the
 * alternative is a world that is subtly wrong in a way no test would
 * think to look for.
 */
function joined<T extends { id: string } | { type: string } | { npcId: string }>(
  what: string,
  ...lists: readonly (readonly T[])[]
): readonly T[] {
  const all = lists.flat();
  const seen = new Set<string>();
  for (const entry of all) {
    const key =
      'id' in entry ? entry.id : 'type' in entry ? entry.type : (entry as { npcId: string }).npcId;
    if (seen.has(key)) throw new Error(`WORLD LIFE: ${what} が重複しています: ${key}`);
    seen.add(key);
  }
  return all;
}

/** Everything, in the shape the engine takes it. */
export const MUGEN_WORLD_RULES = {
  actions: joined<WorldActionDef>('ACTION', ALDEN_ACTIONS, GALD_ACTIONS, CROSSING_ACTIONS),
  kinds: joined<SeedKindDef>('SEED KIND', ALDEN_SEED_KINDS, GALD_SEED_KINDS, CROSSING_SEED_KINDS),
  cores: joined<NpcCore>('NPC', ALDEN_CORES, GALD_CORES, [BAKERY_OWNER_CORE, NEL_CORE]),
  blooms: joined<WorldBloomDef>('BLOOM', ALDEN_BLOOMS, GALD_BLOOMS, CROSSING_BLOOMS),
  crossings: WORLD_CROSSINGS,
};

export { ALDEN_GUARD, GALD, LINA, PLAYER_ACTOR, ALDEN_VILLAGE_ACTOR };

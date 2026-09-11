// ALDEN VILLAGE — the first place in the world that is alive.
//
// One village, one person in it the engine knows anything about, three
// things that can be done to her, three things those can plant, and two
// shapes her life could take. That is the whole of it, and the size is
// the point: the engine has to be provable on something small before
// anybody is allowed to write a hundred people.
//
// WHAT TO ADD AND WHAT NOT TO. Adding a person is one NPC_CORE entry.
// Adding a thing the player can do is one ACTION entry. Adding a shape
// a life could take is one BLOOM entry. What must never appear here is
// an entry of the form "if the player does X to Y, Y becomes Z" — that
// is the table this engine exists to not have, and the absence of it is
// what makes the village extensible by one line at a time.

import type { SeedKindDef, WorldActionDef } from '../../core/life/defs';
import type { NpcCore, WorldBloomDef } from '../../core/life/types';

/** Who, in the world's records, the player is. */
export const PLAYER_ACTOR = 'PLAYER';

/**
 * LINA — the girl who fetches water past the well at the wrong hour.
 *
 * Fourteen, nobody's apprentice, and the reason she is the test case is
 * that she is nobody in particular: if the engine only works on
 * somebody written to become a mage, it does not work.
 *
 * Her aptitude for magic is real and she does not know it. That is the
 * asymmetry the whole engine is built to produce — the player cannot
 * see it either, so showing her a spell is not a button labelled
 * "create mage", it is an afternoon that may turn out to have mattered.
 */
export const LINA: NpcCore = {
  npcId: 'alden_lina',
  traits: ['CURIOUS', 'STUBBORN'],
  values: ['WONDER'],
  aptitudes: { MAGIC: 0.7, CRAFT: 0.2 },
  desires: ['TO_SEE_SOMETHING_TRUE'],
};

/**
 * MARTA — her mother, who keeps the well.
 *
 * Here so that the village is not one person, and so that there is
 * somebody for the same afternoon to land on and do nothing to. She
 * sees every spell Lina sees. She is not changed by any of them, and
 * the engine has to be able to say that without being told.
 */
export const MARTA: NpcCore = {
  npcId: 'alden_marta',
  traits: ['GUARDED'],
  values: ['FAMILY', 'QUIET'],
  aptitudes: { CRAFT: 0.5 },
  desires: ['TO_KEEP_WHAT_IS_HERS'],
};

export const ALDEN_CORES: readonly NpcCore[] = [LINA, MARTA];

/**
 * The three things that can happen in front of somebody in Alden.
 *
 * None of them mentions Lina, and none of them mentions an outcome.
 * `SHOW_MAGIC` is what it is whether it is shown to a child, her mother
 * or a passing dog.
 */
export const ALDEN_ACTIONS: readonly WorldActionDef[] = [
  {
    id: 'SHOW_MAGIC',
    plants: 'MAGIC_DREAM',
    // High, because it is genuinely rare. A thing anybody could have
    // seen any day should be written low; this is a star being lit in a
    // village where nobody has ever done that.
    impact: 0.85,
    // Anyone who was there. Magic is not a confidence.
    reaches: 'WITNESSES',
  },
  {
    id: 'HEAL_IN_PUBLIC',
    plants: 'HEALING_CALL',
    impact: 0.7,
    reaches: 'WITNESSES',
  },
  {
    id: 'SHARE_BREAD',
    plants: 'KINDNESS_OWED',
    // Deliberately small. If a gift of bread could reroute a life this
    // engine would be a wish-granting machine.
    impact: 0.35,
    // A kindness done to one person is done to one person.
    reaches: 'TARGET',
  },
];

/**
 * What those three can plant, and what makes each of them take.
 *
 * The resonance lists are short on purpose: a seed kind that catches on
 * eight different traits catches on everybody, and a seed everybody
 * gets is a seed that says nothing about anybody.
 */
export const ALDEN_SEED_KINDS: readonly SeedKindDef[] = [
  {
    type: 'MAGIC_DREAM',
    label: '星を見てしまった',
    resonates: {
      traits: ['CURIOUS'],
      values: ['WONDER'],
      desires: ['TO_SEE_SOMETHING_TRUE'],
      aptitude: 'MAGIC',
    },
    // A wanting this size does not survive three years of fetching
    // water on its own — which is the point. Somebody has to come back.
    keepsPer100Days: 0.72,
  },
  {
    type: 'HEALING_CALL',
    label: '手を当てられる側にいた',
    resonates: { traits: ['GENTLE'], values: ['FAMILY'], aptitude: 'MEDICINE' },
    keepsPer100Days: 0.8,
  },
  {
    type: 'KINDNESS_OWED',
    label: 'よくしてもらった',
    resonates: { traits: ['PROUD'], values: ['FAMILY', 'QUIET'] },
    // Gratitude fades fast and everybody knows it.
    keepsPer100Days: 0.45,
  },
];

/**
 * Two shapes Lina's life could take, and neither is the player's doing.
 *
 * Both ask about HER — what has rooted in her, what she is attached to,
 * how long the world has had. Neither asks what the player chose, and
 * that is the difference between a consequence and a reward.
 *
 * The second one exists so the first cannot be mistaken for the only
 * answer: the same rooted wanting, without anybody having stayed a
 * person to her, goes somewhere else and somewhere lonelier.
 */
export const ALDEN_BLOOMS: readonly WorldBloomDef[] = [
  {
    id: 'LINA_LEAVES_TO_STUDY_MAGIC',
    npcId: 'alden_lina',
    requirements: {
      seeds: [{ type: 'MAGIC_DREAM', atLeast: 'ROOTED' }],
      // Somebody has to still be a person to her, not just a memory of
      // a light. A wanting with nobody attached to it does not get
      // anybody out of a village.
      vine: { target: PLAYER_ACTOR, relationType: 'INSPIRED_BY' },
      // And it has to have survived a while. Nobody leaves home over an
      // afternoon.
      afterDays: 365,
    },
    result: 'リナは村を出て、魔法を学ぶ道を選ぼうとしている。',
  },
  {
    id: 'LINA_PRACTISES_ALONE',
    npcId: 'alden_lina',
    requirements: {
      seeds: [{ type: 'MAGIC_DREAM', atLeast: 'GROWING' }],
      afterDays: 180,
    },
    result: 'リナは誰にも言わず、井戸の裏で手のかたちを真似ている。',
  },
];

/** Everything the village is, in the shape the engine takes it. */
export const ALDEN_RULES = {
  actions: ALDEN_ACTIONS,
  kinds: ALDEN_SEED_KINDS,
  cores: ALDEN_CORES,
  blooms: ALDEN_BLOOMS,
} as const;

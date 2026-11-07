// ALDEN VILLAGE — and LINA, the second character the engine watches.
//
// GALD was the first, and he proved the chain runs end to end on a
// canonical character without touching canon. What Lina is for is the
// harder claim, and the only one that makes a life-collecting game
// possible at all:
//
//   THE SAME SEED, IN THE SAME GIRL, BECOMES A DIFFERENT LIFE
//   DEPENDING ON WHAT ELSE THE WORLD DID.
//
// Every future below begins with one thing: somebody showed a curious
// child a spell, and SEED_MAGIC_DREAM was planted. Nothing about her
// was settled by that, and four different women come out the other end
// of it — the village's mage, a healer, a wanderer, and somebody who
// stopped. Which one is not chosen anywhere. It falls out of whether
// the village was ever attacked, whether anybody ever tended the hurt
// in front of her, whether Kaos kept telling her what was out there,
// and whether anybody came back at all.
//
// WHAT IS DELIBERATELY NOT FINISHED. The four futures are candidates
// and nothing consumes them yet. No scene plays, no NPC changes
// occupation, nothing is written to canon. That is the correct amount
// to have built: the claim being made this round is about the ENGINE,
// and a content pass that dressed it up would make the claim harder to
// check rather than easier.

import type { SeedKindDef, WorldActionDef } from '../../core/life/defs';
import type { NpcCore, WorldBloomDef } from '../../core/life/types';

/** Who, in the world's records, the player is. */
export const PLAYER_ACTOR = 'PLAYER';
/** And the one who travels with them. */
export const KAOS_ACTOR = 'KAOS';
/**
 * The village itself, as somebody the world can record things about.
 *
 * Not a metaphor and not a special case: a place is an actor, it holds
 * seeds, and they fade. What makes this worth doing rather than
 * inventing a separate notion of "village state" is that a place
 * remembers in exactly the way a person does — a village that was
 * raided wants protecting, and stops wanting it after enough quiet
 * years — so the whole of 「アルデン村の状態」 costs one entry here and
 * no new concept anywhere.
 */
export const ALDEN_VILLAGE_ACTOR = 'ALDEN_VILLAGE';

/**
 * LINA — the village girl, as the design note gives her.
 *
 * 好奇心旺盛 / 優しい / 少し臆病, 家族を大切にする, and a hand for magic
 * she has no idea about.
 *
 * The three traits are not decoration. CURIOUS is why a spell reaches
 * her at all. GENTLE is why the hurt and the village reach her. TIMID
 * is the one that costs her something — it is what makes the world
 * outside take six tellings to want instead of one, which is the whole
 * reason the wandering future is the hardest of the four to arrive at.
 *
 * Her aptitudes are hers and nobody can see them, the player included.
 * 0.80 for magic means the same afternoon that glances off another
 * child stays in her; 0.60 for healing is the fork that exists only
 * because she happens to be good at two things.
 *
 * No desires are written, because the note gives none. An empty list is
 * an honest absence rather than an invented wanting — everything below
 * works off what she IS, and if she later turns out to want something
 * before the story starts, that is a line to add then.
 */
export const LINA: NpcCore = {
  npcId: 'LINA',
  traits: ['CURIOUS', 'GENTLE', 'TIMID'],
  values: ['FAMILY'],
  aptitudes: { MAGIC: 0.8, SWORD: 0.3, HEALING: 0.6 },
  desires: [],
};

/**
 * MARTA — her mother, who keeps the well.
 *
 * Here so the village is not one person, and so the same afternoon has
 * somebody to land on and do nothing to. She sees every spell Lina
 * sees, and she is not changed by any of them.
 */
export const MARTA: NpcCore = {
  npcId: 'alden_marta',
  traits: ['GUARDED'],
  values: ['FAMILY', 'QUIET'],
  aptitudes: { CRAFT: 0.5 },
  desires: ['TO_KEEP_WHAT_IS_HERS'],
};

/**
 * The village, which wants what a village wants.
 *
 * It values its families and its quiet, so what a raid plants in it is
 * the same wanting it plants in the people who live there — and it
 * fades from a place on the same terms it fades from a person. A future
 * that asks 「村はまだ守りを必要としているか」 asks this.
 */
export const ALDEN_VILLAGE_CORE: NpcCore = {
  npcId: ALDEN_VILLAGE_ACTOR,
  traits: ['SMALL', 'FARMING'],
  values: ['FAMILY', 'QUIET'],
  aptitudes: {},
  desires: ['TO_BE_LEFT_ALONE'],
};

export const ALDEN_CORES: readonly NpcCore[] = [LINA, MARTA, ALDEN_VILLAGE_CORE];

/**
 * Four things that can happen in front of a child in Alden.
 *
 * None of them mentions Lina and none of them names an outcome.
 * 《魔法を見せる》 is one entry whether it is shown to her, to her
 * mother, or to a passing dog.
 */
export const ALDEN_ACTIONS: readonly WorldActionDef[] = [
  {
    id: 'SHOW_MAGIC',
    plants: 'MAGIC_DREAM',
    // High, because it is genuinely rare: a star lit in a village where
    // nobody has ever done that.
    impact: 0.85,
    // Anyone who was there. Magic is not a confidence.
    reaches: 'WITNESSES',
  },
  {
    id: 'TELL_OF_THE_WORLD',
    plants: 'OUTSIDE_WORLD_DREAM',
    // Higher than showing her a spell, and it still lands smaller on
    // her, because she is timid and the thing being offered is leaving.
    impact: 0.9,
    reaches: 'WITNESSES',
  },
  {
    id: 'TENDED_THE_HURT',
    plants: 'HEALING_CALL',
    impact: 0.8,
    reaches: 'WITNESSES',
  },
  {
    id: 'VILLAGE_ATTACKED',
    plants: 'PROTECT_VILLAGE',
    impact: 0.9,
    // Everyone who was there — which includes the village, because the
    // village is one of the people this happened to.
    reaches: 'WITNESSES',
  },
  {
    id: 'SHARE_BREAD',
    plants: 'KINDNESS_OWED',
    // Deliberately small. If a gift of bread could reroute a life, this
    // engine would be a wish-granting machine.
    impact: 0.35,
    reaches: 'TARGET',
  },
];

/**
 * What those can plant, and what in a person makes each of them take.
 *
 * The resonance lists are short on purpose: a seed kind that catches on
 * eight traits catches on everybody, and a seed everybody gets says
 * nothing about anybody.
 */
export const ALDEN_SEED_KINDS: readonly SeedKindDef[] = [
  {
    type: 'MAGIC_DREAM',
    label: '星を見てしまった',
    resonates: { traits: ['CURIOUS'], values: ['WONDER'], aptitude: 'MAGIC' },
    // Not permanent once rooted, and that is the point of the fourth
    // future: a dream can be let go of. A girl shown one spell and then
    // left alone for four years is a girl who stopped.
    keepsPer100Days: 0.8,
  },
  {
    type: 'OUTSIDE_WORLD_DREAM',
    label: 'ここではないどこか',
    resonates: { traits: ['CURIOUS'], desires: ['TO_SEE_SOMEWHERE_ELSE'] },
    // The one thing her timidity costs her. It reaches her — she is
    // curious — and it lands three quarters as hard, which is why the
    // wandering life takes half a dozen tellings and the others do not.
    dampens: ['TIMID'],
    keepsPer100Days: 0.85,
  },
  {
    type: 'PROTECT_VILLAGE',
    label: 'ここを守らなければ',
    resonates: { traits: ['GENTLE'], values: ['FAMILY'] },
    // A village that was raided does not forget in a season, and
    // neither does a girl who watched it.
    keepsPer100Days: 0.9,
  },
  {
    type: 'HEALING_CALL',
    label: '手を当てる側にいた',
    resonates: { traits: ['GENTLE'], aptitude: 'HEALING' },
    keepsPer100Days: 0.85,
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
 * FIVE SHAPES HER LIFE COULD TAKE. Four of them start identically.
 *
 * 村の魔導士, 治癒魔導士, 放浪魔導士 and 魔法を諦める all begin with the
 * same seed in the same girl — and not one of them is chosen. Read them
 * side by side and the difference is never about the player: it is
 * whether the village was attacked, whether she stood next to somebody
 * binding a wound, whether Kaos kept telling her what was out there,
 * and whether anybody came back at all.
 *
 * MAGIC_DREAM appears in all four, which is the claim being made. What
 * differs is the sentence after it.
 */
export const ALDEN_BLOOMS: readonly WorldBloomDef[] = [
  {
    // The early one, common to every world where anybody came back.
    // Deliberately a low bar: a life has to have visible small stages
    // or the three years between the spell and the woman are a gap.
    id: 'LINA_PRACTISES_ALONE',
    npcId: 'LINA',
    requirements: {
      seeds: [{ type: 'MAGIC_DREAM', atLeast: 'GROWING' }],
      afterDays: 180,
    },
    result: 'リナは誰にも言わず、井戸の裏で手のかたちを真似ている。',
  },
  {
    id: 'LINA_VILLAGE_MAGE',
    npcId: 'LINA',
    requirements: {
      seeds: [
        { type: 'MAGIC_DREAM', atLeast: 'ROOTED' },
        { type: 'PROTECT_VILLAGE', atLeast: 'ROOTED' },
        // And the village still needs it. A girl who wanted to defend a
        // place that has been quiet for ten years is somebody with a
        // different life; this asks the village, not her.
        { npcId: ALDEN_VILLAGE_ACTOR, type: 'PROTECT_VILLAGE', atLeast: 'GROWING' },
      ],
      aptitudes: [{ name: 'MAGIC', atLeast: 0.6 }],
      afterDays: 730,
    },
    result: 'リナは村に残り、村の魔導士として頼られはじめている。',
  },
  {
    id: 'LINA_HEALING_MAGE',
    npcId: 'LINA',
    requirements: {
      seeds: [
        { type: 'MAGIC_DREAM', atLeast: 'ROOTED' },
        { type: 'HEALING_CALL', atLeast: 'ROOTED' },
      ],
      // The fork that exists only because she happens to be good at two
      // things. Wanting is not enough — a girl with no hand for it who
      // stood in the same place becomes something else.
      aptitudes: [{ name: 'HEALING', atLeast: 0.5 }],
      afterDays: 730,
    },
    result: 'リナは、傷を診るための魔法を選ぼうとしている。',
  },
  {
    id: 'LINA_WANDERING_MAGE',
    npcId: 'LINA',
    requirements: {
      seeds: [
        { type: 'MAGIC_DREAM', atLeast: 'ROOTED' },
        { type: 'OUTSIDE_WORLD_DREAM', atLeast: 'ROOTED' },
        // Nothing holding her here. A raided village is a rope.
        { type: 'PROTECT_VILLAGE', atMost: 'DORMANT' },
      ],
      // Somebody has to still be a person to her, not a memory of a
      // light — and it has to be the one who told her what was out
      // there, which is never the same conversation as showing a spell.
      vine: { target: KAOS_ACTOR, relationType: 'BECAUSE_OF' },
      afterDays: 730,
    },
    result: 'リナは村を出て、見たことのない場所へ行こうとしている。',
  },
  {
    id: 'LINA_GIVES_UP_MAGIC',
    npcId: 'LINA',
    requirements: {
      // Having had it and lost it, which is not the same as never
      // having been shown anything — `absentCounts: false` is what says
      // so, and without it every child in the world would qualify.
      seeds: [{ type: 'MAGIC_DREAM', atMost: 'FADED', absentCounts: false }],
      afterDays: 1460,
    },
    result: 'リナは、あの夜のことをもう話さない。',
  },
];

/** Everything the village is, in the shape the engine takes it. */
export const ALDEN_RULES = {
  actions: ALDEN_ACTIONS,
  kinds: ALDEN_SEED_KINDS,
  cores: ALDEN_CORES,
  blooms: ALDEN_BLOOMS,
} as const;

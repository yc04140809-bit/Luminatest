// GALD — the first person in this world whose life the engine watches.
//
// WHAT THIS IS NOT. It is not a fifth route, it does not decide his
// occupation, and it cannot contradict a single canonical fact. The
// EVENT ENGINE still says what happens to him: helped, he takes to the
// road and becomes a healer at the waystation, exactly as it has since
// that route was written. Every one of those facts arrives here as
// something to READ.
//
// WHAT IT ADDS is the thing canon has no room for. Canon can say a man
// changed his trade. It cannot say whether the village believes him —
// whether the guard who once hunted him through the greenwood can
// stand in a square and talk to him like anybody else. That is not one
// event; it is years of nothing happening, and nothing happening is
// precisely what this engine is for.
//
// SO THERE IS NO 「更生度 +5」 ANYWHERE. The player is never told a
// number, never shown a bar, and never informed that their choice is
// working. They are shown, years later, two men talking.

import type { SeedKindDef, WorldActionDef } from '../../core/life/defs';
import type { NpcCore, WorldBloomDef } from '../../core/life/types';
import { PLAYER_ACTOR } from './aldenLife';

export const GALD = 'GALD';
export const ALDEN_GUARD = 'ALDEN_GUARD';

/**
 * 「ガルド戦のあと手を貸した」, under the name canon gives it.
 *
 * The design note calls the doing HELP_AFTER_BATTLE; WORLD MEMORY has
 * recorded it as PLAYER_HELPED_GALD since the four routes were written.
 * They are the same fact, so they are the same string, and this
 * constant exists so that saying either one in code means the other.
 */
export const HELP_AFTER_BATTLE = 'PLAYER_HELPED_GALD';

/**
 * GALD, before the player ever meets him.
 *
 * PROUD is the load-bearing one and it cuts both ways: it is why being
 * beaten and then bandaged by the same person lands on him harder than
 * being let go would, and it is why gratitude sits badly in him. He is
 * not written as a man waiting to be redeemed — he is written as
 * somebody who cannot stand owing anything, which is a different thing
 * and is what makes the road out of the greenwood his own.
 *
 * The aptitude for MEDICINE is here because canon says he ends up
 * binding wounds on that road, and a world where that came out of
 * nowhere would be a world where his life was assigned to him. It is
 * low — he is not a natural — which is why it takes him four months.
 */
export const GALD_CORE: NpcCore = {
  npcId: GALD,
  traits: ['PROUD', 'STUBBORN', 'GUARDED'],
  values: ['DEBTS_PAID', 'OWN_TWO_HANDS'],
  aptitudes: { MEDICINE: 0.35, FIGHTING: 0.8 },
  desires: ['TO_NOT_OWE_ANYBODY'],
};

/**
 * The guard who used to walk the greenwood road looking for him.
 *
 * He is in the world so that forgiveness has somebody to come from.
 * Nothing the player does is aimed at him — he is never spoken to, never
 * persuaded, and there is no reputation meter attached to him. What he
 * has is a wariness, planted the day a bandit worked his road, and the
 * only thing that ever removes it is years of that not happening again.
 */
export const ALDEN_GUARD_CORE: NpcCore = {
  npcId: ALDEN_GUARD,
  traits: ['DUTIFUL', 'GUARDED'],
  values: ['ORDER', 'THE_ROAD_KEPT_SAFE'],
  aptitudes: { FIGHTING: 0.6 },
  desires: ['TO_SEE_THE_ROAD_QUIET'],
};

export const GALD_CORES: readonly NpcCore[] = [GALD_CORE, ALDEN_GUARD_CORE];

/**
 * WHAT CAN BE DONE, AND WHAT CANON DOES ON ITS OWN.
 *
 * The first entry is the player's. The rest are canonical facts read
 * under their own names — `GALD_WALKS_THE_ROAD` here IS the event the
 * EVENT ENGINE fires, so a route that stops firing it stops feeding
 * whatever grew on it, and the two can never drift apart.
 *
 * Note what is absent: there is no entry for the HELP choice producing
 * an outcome. The player's action plants a wanting and stops.
 */
export const GALD_ACTIONS: readonly WorldActionDef[] = [
  {
    // The moment the round is about: beaten, then bandaged, by the same
    // hands. Set high because in his own terms nothing worse has ever
    // happened to him.
    //
    // NAMED AS CANON NAMES IT, and that is deliberate. The design note
    // calls this 「HELP_AFTER_BATTLE」 and the constant of that name
    // below is exactly this string — because the fact already exists in
    // WORLD MEMORY as PLAYER_HELPED_GALD, and a world with two names
    // for one fact is a world whose two halves will disagree the first
    // time somebody edits one of them. A real save therefore feeds this
    // through the canon bridge with no extra wiring at all.
    id: 'PLAYER_HELPED_GALD',
    plants: 'GALD_REDEMPTION',
    impact: 0.9,
    reaches: 'TARGET',
  },
  {
    // What the road costs him, read off canon. It feeds the same
    // wanting rather than planting a second one: a man walking out of
    // the forest is the first payment on the debt, not a new idea.
    id: 'GALD_WALKS_THE_ROAD',
    plants: 'GALD_REDEMPTION',
    impact: 0.55,
    reaches: 'ACTOR',
  },
  {
    // Four months of other people's wounds. The deepest of the three,
    // because it is the only one that is his own doing.
    id: 'GALD_BECOMES_HEALER',
    plants: 'GALD_REDEMPTION',
    impact: 0.8,
    reaches: 'ACTOR',
  },
  {
    // Meeting the player again on that road, years later. Canon writes
    // it when the player walks in; the engine reads it as the debt
    // being looked in the face.
    id: 'PLAYER_MET_GALD_ON_THE_ROAD',
    plants: 'GALD_GRATITUDE',
    impact: 0.6,
    reaches: 'WITNESSES',
  },
  {
    // Canon puts him in Alden on the SPARE route and on no other. Read
    // here so that 《村へ戻る》 below is a real future somebody can
    // reach rather than a decoration — it is simply not reachable
    // along the route this round demonstrates.
    id: 'GALD_ARRIVES_IN_ALDEN',
    plants: 'GALD_ROOTS_IN_ALDEN',
    // Large, because of what it is to a man with nowhere: somewhere
    // that did not turn him away is not a small thing, and it is the
    // only one of these that is about a PLACE rather than a debt.
    impact: 0.8,
    reaches: 'ACTOR',
  },
  {
    // Why the guard is the way he is. Not the player's doing and not
    // aimed at anybody — a fact about the greenwood before any of this.
    id: 'BANDITS_WORKED_THE_ROAD',
    plants: 'GUARD_WARINESS',
    impact: 0.75,
    reaches: 'WITNESSES',
  },
];

/**
 * Three wantings, and the third belongs to somebody else.
 *
 * GUARD_WARINESS is the piece that makes this a world rather than a
 * character sheet: it is not Gald's, nobody can act on it, and the only
 * thing that clears it is time in which nothing happens. Its
 * `keepsPer100Days` is therefore the single most important number in
 * this file — it is how long a village remembers.
 */
export const GALD_SEED_KINDS: readonly SeedKindDef[] = [
  {
    type: 'GALD_REDEMPTION',
    label: '借りを返さねばならない',
    // It catches on the pride, not on any goodness: this is a man who
    // cannot bear to owe, and that is the engine of the whole route.
    resonates: {
      traits: ['PROUD', 'STUBBORN'],
      values: ['DEBTS_PAID', 'OWN_TWO_HANDS'],
      desires: ['TO_NOT_OWE_ANYBODY'],
      aptitude: 'MEDICINE',
    },
    // Slow to fade. A debt a proud man cannot name does not wear off in
    // a season — but it does wear off, if he never does anything about
    // it, and a HELP that is never followed by canon goes nowhere.
    keepsPer100Days: 0.88,
    // Once he has actually done something about it, though, he is not a
    // bandit who owes somebody any more — he is a man who binds wounds.
    // That does not come off him in six quiet years.
    permanentOnceRooted: true,
  },
  {
    type: 'GALD_GRATITUDE',
    label: 'あのとき手を貸された',
    resonates: { traits: ['GUARDED'], values: ['DEBTS_PAID'] },
    keepsPer100Days: 0.8,
  },
  {
    type: 'GALD_ROOTS_IN_ALDEN',
    label: 'ここに住みついてしまった',
    // It catches on the guarded part of him as much as the stubborn
    // one: somewhere that lets a man like this alone is somewhere he
    // does not leave.
    resonates: { traits: ['STUBBORN', 'GUARDED'], values: ['OWN_TWO_HANDS'] },
    // Barely fades at all, and it should not. Where a person lives is
    // the slowest thing about them.
    keepsPer100Days: 0.97,
    permanentOnceRooted: true,
  },
  {
    type: 'GUARD_WARINESS',
    label: 'あの道で追った男',
    resonates: {
      traits: ['DUTIFUL', 'GUARDED'],
      values: ['ORDER', 'THE_ROAD_KEPT_SAFE'],
      desires: ['TO_SEE_THE_ROAD_QUIET'],
    },
    // A little over two years to fall from suspicion to nothing, with
    // nobody doing anything about it. Short enough that a player who
    // took the HELP route sees it resolve; long enough that it is
    // plainly not the player who resolved it.
    keepsPer100Days: 0.62,
  },
];

/**
 * FIVE SHAPES HIS LIFE COULD TAKE, and they are not a ladder.
 *
 * Four are reachable along the route this round demonstrates. The
 * fifth — 《村へ戻る》 — asks for something canon only does on the SPARE
 * route, and is written here deliberately: a bloom the demonstration
 * cannot reach is the proof that this is a set of possibilities rather
 * than a corridor with five signposts.
 *
 * None of them names the player's choice. Every requirement is about
 * what is true of a man, and of the man who used to hunt him.
 */
export const GALD_BLOOMS: readonly WorldBloomDef[] = [
  {
    id: 'GALD_STOPS_BEING_A_BANDIT',
    npcId: GALD,
    requirements: {
      seeds: [{ type: 'GALD_REDEMPTION', atLeast: 'GROWING' }],
      afterDays: 3,
    },
    result: '男は、盗賊であることをやめようとしている。',
  },
  {
    id: 'GALD_LOOKS_FOR_WORK',
    npcId: GALD,
    requirements: {
      seeds: [{ type: 'GALD_REDEMPTION', atLeast: 'ROOTED' }],
      // Somebody has to still be a person to him, or it is just shame.
      vine: { target: PLAYER_ACTOR, relationType: 'INSPIRED_BY' },
      afterDays: 120,
    },
    result: '男は、自分の手で食っていく道を探している。',
  },
  {
    id: 'GUARD_STOPS_WATCHING_HIM',
    // Whose change this is matters: it is the GUARD's, not Gald's, and
    // Gald cannot do anything to bring it about.
    npcId: ALDEN_GUARD,
    requirements: {
      seeds: [
        // `absentCounts: false` because a guard who never watched him
        // is not a guard who has stopped. Without it, a world where the
        // wariness was never planted would satisfy this the moment it
        // was asked, and the scene would mean nothing.
        { type: 'GUARD_WARINESS', atMost: 'DORMANT', absentCounts: false },
        { npcId: GALD, type: 'GALD_REDEMPTION', atLeast: 'ROOTED' },
      ],
      afterDays: 700,
    },
    result: '衛兵は、もうあの男を目で追わなくなった。',
  },
  {
    id: 'GALD_AND_THE_GUARD_SPEAK',
    npcId: GALD,
    requirements: {
      seeds: [
        { type: 'GALD_REDEMPTION', atLeast: 'ROOTED' },
        { type: 'GALD_GRATITUDE', atLeast: 'GROWING' },
        { npcId: ALDEN_GUARD, type: 'GUARD_WARINESS', atMost: 'FADED', absentCounts: false },
      ],
      afterDays: 900,
    },
    result: 'かつて追われていた男が、衛兵と普通に話している。',
  },
  {
    id: 'GALD_RETURNS_TO_THE_VILLAGE',
    npcId: GALD,
    requirements: {
      seeds: [
        { type: 'GALD_REDEMPTION', atLeast: 'ROOTED' },
        { npcId: ALDEN_GUARD, type: 'GUARD_WARINESS', atMost: 'FADED', absentCounts: false },
        // Only true where canon actually put him in the village, which
        // HELP never does. Nothing in this file makes it happen; the
        // bloom simply waits, on this route forever.
        { type: 'GALD_ROOTS_IN_ALDEN', atLeast: 'GROWING' },
      ],
      afterDays: 900,
    },
    result: '男は、村へ戻ってきた。',
  },
];

/**
 * WHAT WAS ALREADY TRUE OF THE GREENWOOD, before the player arrived.
 *
 * A world does not start the day somebody walks into it. The guard has
 * been walking that road for years and a bandit has been working it —
 * which is why he is wary, and the player had nothing to do with that.
 *
 * Kept as records rather than as starting seeds so that it goes through
 * exactly the same machinery as everything else: the guard's wariness
 * is planted by a fact, traceable to it, and fades by the same
 * arithmetic. There is no such thing here as a number that was simply
 * set.
 */
export const GREENWOOD_PRELUDE = [
  {
    action: 'BANDITS_WORKED_THE_ROAD',
    actor: GALD,
    target: null,
    location: 'GREENWOOD_FOREST',
    witnesses: [ALDEN_GUARD],
  },
] as const;

export const GALD_RULES = {
  actions: GALD_ACTIONS,
  kinds: GALD_SEED_KINDS,
  cores: GALD_CORES,
  blooms: GALD_BLOOMS,
} as const;

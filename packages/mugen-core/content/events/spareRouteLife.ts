// OFF-SCREEN LIFE — THE LET-GO WORLD (ROUTE D 見逃し／追放, docs/GALD_FIVE_ROUTES.md;
// TIGS2027 second proving route, 作者 2026-10-20).
//
// The player let the bandit go. He does not stay near the village (D1:
// GALD_LEAVES_BANDITS, content/events/lifeEvents.ts), and he drops out of
// the story — but not out of the world. Somewhere outside the village:
//
//   PLAYER_SPARED_GALD                        (the player's answer)
//     +3 nights GALD_LEAVES_BANDITS           he walks away, outside the village (D1)
//     +2 nights GALD_SAVES_MERCHANTS          a trading house's cart is attacked; with
//                                             nobody watching, he chooses to help (D3–D4)
//     same day  MERCHANTS_LEARN_OF_ELNA       「なぜそこまで金が必要なんだ？」 — and the
//                                             answer is a sick sister (D6)
//
// THE SAME ENGINE AS THE BAKERY ROUTE (content/events/offScreenLife.ts): one
// resolver, the nights, and a `bloom` each step asks of a person
// (content/world/spareRouteLife.ts). What differs is what the first fact left
// in him: being let go is not being bandaged, so 「借りを返さねばならない」 never
// grows and the bakery route's first step is never possible here — while
// 「誰も見ていない。どうするかは、自分で決める」 does, and is what this world's
// first step asks for.
//
// NOT HERE, ON PURPOSE (作者 2026-10-20):
//   - バルド. The merchants are anonymous (MERCHANT_CARAVAN).
//   - His trade, where exactly he lives, who with — three years on he is
//     outside the village and not at the bakery; nothing more is decided.
//   - Any scene, line or rumour for the player. Like the bakery route's three
//     仮 steps, these are world truth the player is never told
//     (no OFF_SCREEN_FACTS): a developer's screen lists them.
//   - The timing (+2 nights) is 仮, short enough for the TIGS build to live it.

import type { LifeEventDef } from '../../core/events/types';

/**
 * Outside the village, a trading house's cart is set on. He is there, and
 * nobody is watching what he does; he stands with the merchants against the
 * side he used to be on (ROUTE 4: かつて自分がいた側と戦う → 誰かを救う).
 *
 * Done by him, to the merchants and their guards (anonymous).
 */
export const GALD_SAVES_MERCHANTS_DEF: LifeEventDef = {
  type: 'GALD_SAVES_MERCHANTS',
  eventId: 'evt_gald_saves_merchants',
  requiredMemory: 'GALD_LEAVES_BANDITS',
  minElapsedDays: 2,
  // A save that already lived the retired Ver0.1 chain has him in Alden;
  // that world does not also have him on a road outside it.
  unless: ['GALD_ARRIVES_IN_ALDEN'],
  // With nobody watching, he decides for himself.
  bloom: 'GALD_CHOOSES_WITH_NOBODY_WATCHING',
  once: true,
  location: 'OUTSIDE_ALDEN',
  actors: ['GALD', 'MERCHANT_CARAVAN'],
  importance: 'MAJOR',
  characterEffects: [{ characterId: 'GALD', changes: { location: 'OUTSIDE_ALDEN' } }],
};

/**
 * The same day: they ask why a man like him needs money that badly, and he
 * says it — a sister, ill. They now know she exists; nothing here says what
 * they do with it.
 *
 * Said by him, to the merchants.
 */
export const MERCHANTS_LEARN_OF_ELNA_DEF: LifeEventDef = {
  type: 'MERCHANTS_LEARN_OF_ELNA',
  eventId: 'evt_merchants_learn_of_elna',
  requiredMemory: 'GALD_SAVES_MERCHANTS',
  minElapsedDays: 0,
  // They owe him, and they ask.
  bloom: 'MERCHANTS_ASK_WHY',
  once: true,
  location: 'OUTSIDE_ALDEN',
  actors: ['GALD', 'MERCHANT_CARAVAN'],
  importance: 'NORMAL',
  characterEffects: [],
};

/** The let-go world's off-screen steps, in the order they can happen. */
export const GALD_SPARE_ROUTE_DEFS: readonly LifeEventDef[] = [
  GALD_SAVES_MERCHANTS_DEF,
  MERCHANTS_LEARN_OF_ELNA_DEF,
];

// HER MAGIC'S MOVES — ケイオス's skills in the party fight. Content: names and numbers only.

import type { HeroSkillSpec } from '../../game/battle/battleLogic';

/**
 * 《双極臨界 → 界核崩壊》 — HER FINISHER (作者 2026-10-26「ケイオス必殺技 正式実装指示書」): her own cut-in (gold and
 * purple); her wings open, she stays where she is; a gold circle turning one way and a purple one the
 * other come together into the light-and-dark core over the creatures; it swells, is pressed small, holds —
 * then three strikes and the fourth, 界核崩壊: the core bursts, a white flash, the space cracks, crystal
 * shards; every creature standing is left with its magic defense down.
 *
 * CHARGED BY TURNS: never on her first three turns of a fight, MP or not (`charge` 3 — her own turns, as
 * every skill's wait is counted); then every fifth of her turns (`cooldown` 5: four without it).
 *
 * NUMBERS (TIGS 前 — the same weight as 《彼岸花》, 2.4 in all): 0.4, 0.5, 0.5 and the collapse 1.0 of her
 * magic's blow (partyBattle magicBlowOf: 9 at her first level) at each creature standing, each strike
 * COMBO's (three creatures: twelve), each wearing footing by 1; then 魔防DOWN (magic ×1.25, three of
 * its turns) on each left standing.
 */
export const SOUKYOKU_RINKAI: HeroSkillSpec = {
  id: 'soukyoku_rinkai',
  name: '双極臨界',
  lastName: '界核崩壊',
  power: 2.4,
  cooldown: 5,
  charge: 3,
  cuts: [0.4, 0.5, 0.5, 1.0],
  cutBreakPower: 1,
  magic: true,
  lowersMagic: true,
  area: 'ALL',
  finisher: true,
};

/**
 * The same move READY FROM HER FIRST TURN — the DEV preview's only (`&collapse=1`), to see it without
 * three turns first. Never in the game's own fights.
 */
export const SOUKYOKU_RINKAI_READY: HeroSkillSpec = { ...SOUKYOKU_RINKAI, charge: 0 };

// ヴァルシール（第1形態） — PROVISIONAL NUMBERS FOR THE PARTY FIGHT, and
// nothing else about it (2026-10-12).
//
// Only what the DEBUG 3人戦闘 needs to try 月影の構え, 星癒の羽, 重撃・豪断
// and BREAK against something with the right weight: health, a blow, a
// speed, a footing. Who it is, its story, its shell and its second form are
// not here; its own BREAK (the shell, ケイオスの必殺技解放) will hang on
// `onBreak` (game/battle/partyBattle.ts) when that is written.
//
// THE NUMBERS (仮値 — to be balanced with the real fight):
//   HP 420        about eight rounds for three at level one
//   blow 14–20    about 11–17 through the hero's guard: it is felt, a heal is wanted
//   speed 11      after Kaos (14), before the hero (10) and Grave (8)
//   footing 12    broken about every two or three rounds with Grave in it

import type { PartyEnemyInput } from '../../game/battle/partyBattle';

export const VALSHEEL_NAME = 'ヴァルシール';

export const VALSHEEL_FORM1_PROVISIONAL: PartyEnemyInput = {
  name: VALSHEEL_NAME,
  hp: 420,
  attackMin: 14,
  attackMax: 20,
  attackName: '甲殻の一撃',
  appearLine: `${VALSHEEL_NAME}が、行く手を塞いだ。`,
  speed: 11,
  breakMax: 12,
};

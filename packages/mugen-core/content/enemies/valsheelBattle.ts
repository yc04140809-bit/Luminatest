// ヴァルシール（第1形態） — PROVISIONAL NUMBERS FOR THE PARTY FIGHT, and
// nothing else about it (2026-10-12).
//
// Only what the DEBUG 3人戦闘 needs to try 月影の構え, 星癒の羽, 重撃・豪断
// and BREAK against something with the right weight: health, a blow, a
// speed, a footing. Who it is, its story, its shell and its second form are
// not here; its own BREAK (the shell, ケイオスの必殺技解放) will hang on
// `onBreak` (game/battle/partyBattle.ts) when that is written.
//
// THE NUMBERS (仮値 — 2026-10-12 調整「BREAKを使わないと効率が悪い」):
//   HP 440        a little more than before (420)
//   guard 45%     its shell takes 45% off every blow while it stands — gone
//                 while it is BROKEN, when it takes 1.4× instead (so a blow
//                 lands about 2.5 times as hard broken as standing)
//   blow 19–25    harder than before (14–20)
//   甲殻穿ち       a quarter of its turns: 1.6× at one of them
//   旋尾薙ぎ       about one turn in eight: 0.8× at all of them
//   speed 11      after Kaos (14), before the hero (10) and Grave (8)
//   footing 13    a little sturdier (12)
//   boss          not to be fled
//   GIANT         drawn large across the left; the party smaller on the right
//
// MEASURED (3000 fights each, the three at level one): AUTO — which uses
// 重撃・豪断 when it is ready, 星癒の羽 and 月影の構え — wins in about 15
// rounds with three quarters of their health left; only swinging (and
// healing when low) takes about 19.5 rounds, ends with about two fifths, and
// loses a member in about one fight in four (AUTO: almost never). Not a
// death match; a lesson in BREAK.

import type { PartyEnemyInput } from '../../game/battle/partyBattle';

export const VALSHEEL_NAME = 'ヴァルシール';

export const VALSHEEL_FORM1_PROVISIONAL: PartyEnemyInput = {
  name: VALSHEEL_NAME,
  hp: 440,
  attackMin: 19,
  attackMax: 25,
  attackName: '甲殻の一撃',
  appearLine: `${VALSHEEL_NAME}が、行く手を塞いだ。`,
  speed: 11,
  breakMax: 13,
  guard: 0.45,
  partyMoves: {
    heavy: { name: '甲殻穿ち', power: 1.6, chance: 0.25 },
    sweep: { name: '旋尾薙ぎ', power: 0.8, chance: 0.12 },
  },
  boss: true,
  // A giant: the screen gives it the left of the field and draws the party small.
  battleScale: 'GIANT',
};

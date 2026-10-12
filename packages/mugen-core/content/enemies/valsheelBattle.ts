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

/** What it is called in full (作者指示 2026-10-12): 封殻機兵 ヴァルシール — an ancient seal-keeping machine. */
export const VALSHEEL_TITLE = '封殻機兵';

// ヴァルシール（第2形態） — PROVISIONAL NUMBERS (2026-10-12, 作者指示「第1形態
// HP0で第2形態へ」). The same creature, its shell broken: the core and the
// machinery inside laid bare. The fight stops when the first form's HP is
// nought, the shell breaks, and the fight goes on against this — the party as
// the first form left them (nobody healed by the change).
//
//   HP 360        fresh health — less than the first form's, the shell gone
//   guard 20%     less left to take the blows (BREAK still takes it off)
//   blow 23–29    harder: nothing held back now
//   コア照射        a quarter of its turns: 1.8× at one of them
//   光翼の旋風      about one turn in seven: 1.0× at all of them
//   speed 12      a little quicker than before (still after Kaos)
//   footing 12    BREAK a little sooner
//
// MEASURED (valsheelBattle.test.ts, 200 fights with seeded dice that cover the
// whole range): AUTO from level one, the first form then the second straight
// on — won about 96 times in 100, with about half their health left; every
// loss in the second form.
export const VALSHEEL_FORM2_PROVISIONAL: PartyEnemyInput = {
  name: VALSHEEL_NAME,
  hp: 360,
  attackMin: 23,
  attackMax: 29,
  attackName: '光刃の一閃',
  appearLine: `${VALSHEEL_NAME}が、翼を広げた。`,
  speed: 12,
  breakMax: 12,
  guard: 0.2,
  partyMoves: {
    heavy: { name: 'コア照射', power: 1.8, chance: 0.25 },
    sweep: { name: '光翼の旋風', power: 1.0, chance: 0.15 },
  },
  boss: true,
  battleScale: 'GIANT',
  artId: 'valsheel_form2',
};

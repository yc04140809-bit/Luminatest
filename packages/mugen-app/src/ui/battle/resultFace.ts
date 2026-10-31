import type { KaosFace } from '@mugen/content/characters/kaosFaces';

/**
 * ケイオス ON A WON FIGHT'S RESULT (2026-10-30 タスクG; 作り替え 2026-10-30 v2: 作者モック result-screen-mock-v2).
 *
 * Only where she fought: a fight she was not in shows nothing of her (`NO_KAOS`). What she shows is two things —
 * who fought beside her, and how it was won — and the table below is the whole of it: which of her faces (the
 * village talk's busts, assets/kaosFaces.ts — none drawn for this) and the line under it, her ボケ and his ツッコミ.
 *
 *   who      DUO   ケイオス×主人公 — the two of them (a fight of one with her magic beside him)
 *            TRIO  ケイオス・主人公・グレイヴ — the three
 *            NO_KAOS  she was not there: nothing
 *   how      NORMAL    an ordinary win                        → SMILE  (her open smile)
 *            BOSS      a boss beaten (a fight not to be fled)  → NORMAL (the soft smile: it is over)
 *            FINISHER  the last blow a party finisher (《双極臨界》 or 《彼岸花》) — before BOSS: it is the
 *                      blow that ended it she is pleased with  → DOYA   (pleased with herself)
 *
 * The lines are provisional (仮, to be written by the author); his name is the player's, never fixed.
 */

export type ResultParty = 'DUO' | 'TRIO' | 'NO_KAOS';
export type ResultHow = 'NORMAL' | 'BOSS' | 'FINISHER';

export interface ResultFaceArt {
  /** Her face — one of the village talk's busts. */
  face: KaosFace;
  /** One line under her: her ボケ, then his ツッコミ (仮). */
  line: { kaos: string; hero: string };
}

const NORMAL: ResultFaceArt = { face: 'SMILE', line: { kaos: 'ふふーん、今日もわたしの勝ち♪', hero: '……二人の、な' } };
const BOSS: ResultFaceArt = { face: 'NORMAL', line: { kaos: '……はぁ。ぜんぜん余裕だったけどね？', hero: '声、震えてたぞ' } };
const FINISHER: ResultFaceArt = { face: 'DOYA', line: { kaos: '決まったね！ わたしの応援のおかげ♪', hero: '応援してたか？' } };

export const RESULT_FACES: Readonly<Record<Exclude<ResultParty, 'NO_KAOS'>, Readonly<Record<ResultHow, ResultFaceArt>>>> = {
  DUO: { NORMAL, BOSS, FINISHER },
  TRIO: { NORMAL, BOSS, FINISHER },
};

/** Who fought, by the members' ids: with her and him, two or three; without her, nothing. */
export function resultPartyOf(memberIds: readonly string[]): ResultParty {
  if (!memberIds.includes('kaos')) return 'NO_KAOS';
  return memberIds.includes('grave') ? 'TRIO' : 'DUO';
}

/** How it was won: a finisher's last blow first, then a boss, else an ordinary win. */
export function resultHowOf(won: { byFinisher: boolean; boss: boolean }): ResultHow {
  if (won.byFinisher) return 'FINISHER';
  return won.boss ? 'BOSS' : 'NORMAL';
}

/** What she shows on this result, or null where she was not in it. */
export function resultFaceFor(party: ResultParty, how: ResultHow): (ResultFaceArt & { party: ResultParty; how: ResultHow }) | null {
  if (party === 'NO_KAOS') return null;
  return { ...RESULT_FACES[party][how], party, how };
}

import type { DialogueLine } from './prologue';
import type { LifeChoiceId } from '../../core/flow/types';

// First encounter in Greenwood Forest. Gald is still an unknown bandit.
export const GALD_ENCOUNTER_LINES: DialogueLine[] = [
  { speaker: '盗賊 ガルド', text: '……止まれ。' },
  { speaker: '盗賊 ガルド', text: '金を置いていけ。命までは取らねぇ。' },
];

/** After his HP reaches 0 — beaten, not dead. */
export const GALD_DEFEATED_LINES: DialogueLine[] = [
  { speaker: '盗賊 ガルド', text: '……くそ……。' },
];

/**
 * 発見 — between his fall and the four answers (作者 2026-11-03, 試遊版・第1章の感情設計 1).
 *
 * Ten seconds or so, tapped through: what fell from his pack, the note in it, the hero picking it up, her word and
 * his. No story of his life — 「盗賊 → 薬 → 妹 → ただの盗賊ではない」 is for the player to put together. The hero
 * holding the medicine is the seed every answer grows from (CHOICE_RESULT_PARCEL_LINES): it never comes from nowhere.
 * The note is written, not said: shown as a slip of paper from its line on (`showsMemo`), and with the hero in every
 * route after.
 */
export const MEDICINE_DISCOVERY_LINES: (DialogueLine & { showsMemo?: boolean })[] = [
  { speaker: null, text: '男の荷から、小さな包みがこぼれ落ちた。' },
  { speaker: null, text: '薬包に、走り書きのメモが挟まっている。', showsMemo: true },
  // {HERO}: his name as the player gave it, put in where it is shown (作者 2026-11-05).
  { speaker: null, text: '{HERO}は、包みを拾い上げた。', showsMemo: true },
  { speaker: 'ケイオス', text: '……薬？', showsMemo: true },
  // 「盗賊」: he has not given his name yet (作者 2026-11-05).
  { speaker: '盗賊', text: '妹だ。病気なんだ', showsMemo: true },
];

/** The note in the medicine: its words only — no voice reads it. */
export const MEDICINE_MEMO = 'エルナへ　あと二日分';

/** Shown beside the four options, so a person is being decided, not a menu. */
export const GALD_LIFE_CHOICE_LINE = '……どうするつもりだ……。';

export const LIFE_CHOICE_PROMPT = '彼の人生を、どうしますか？';

export interface LifeChoiceOption {
  id: LifeChoiceId;
  label: string;
  sub: string;
}

export const LIFE_CHOICE_OPTIONS: LifeChoiceOption[] = [
  { id: 'KILL', label: 'とどめを刺す', sub: 'KILL' },
  { id: 'SPARE', label: '見逃す', sub: 'SPARE' },
  { id: 'HELP', label: '傷を治療する', sub: 'HELP' },
  { id: 'CAPTURE', label: '衛兵へ引き渡す', sub: 'CAPTURE' },
];

// Immediate aftermath lines shown on the choice result screen.
export const CHOICE_RESULT_LINES: Record<LifeChoiceId, DialogueLine[]> = {
  SPARE: [
    // He came for their money, not their lives (「命までは取らねぇ」): what he did
    // was attack them, and that is what he says (作者指示 2026-10-11).
    { speaker: '盗賊', text: '……俺は、お前を襲ったんだぞ。' },
    { speaker: '盗賊', text: 'それでも見逃すのか？' },
    { speaker: '盗賊', text: '……馬鹿じゃねぇのか。' },
    { speaker: null, text: '男は森の奥へと消えていった。' },
  ],
  KILL: [
    { speaker: null, text: '男は動かなくなった。' },
    { speaker: null, text: '懐から、古い手紙のようなものが覗いている。' },
  ],
  HELP: [
    { speaker: '盗賊', text: '……なんのつもりだ。' },
    { speaker: null, text: '男は傷の手当てを黙って受けた。' },
  ],
  CAPTURE: [
    { speaker: null, text: '男は縄をかけられ、村の衛兵に引き渡された。' },
    { speaker: null, text: '最後まで、一言も話さなかった。' },
  ],
};

/**
 * Where the medicine goes, by the answer (作者 2026-11-03 採用): one line each, in its place among the lines above.
 * Given back (見逃す・助ける), handed to the guards (捕縛), or still in the hero's hands (とどめ). The note stays with
 * the hero in all four. Only the App shows these — its four answers come after the discovery; the Artifact's do not.
 */
export const CHOICE_RESULT_PARCEL_LINES: Record<LifeChoiceId, { after: string | null; line: DialogueLine }> = {
  SPARE: { after: '……馬鹿じゃねぇのか。', line: { speaker: null, text: '包みを差し出すと、男は黙って受け取った。' } },
  KILL: { after: null, line: { speaker: null, text: '包みとメモは、まだ{HERO}の手の中にある。' } },
  HELP: { after: '男は傷の手当てを黙って受けた。', line: { speaker: null, text: '手当てを終えると、包みを男の手に戻した。' } },
  CAPTURE: { after: '男は縄をかけられ、村の衛兵に引き渡された。', line: { speaker: null, text: '包みのことは、衛兵に伝えて預けた。' } },
};

/** The lines after an answer, once the medicine has been found: CHOICE_RESULT_LINES with its line put in. */
export function choiceResultLinesAfterDiscovery(choice: LifeChoiceId): DialogueLine[] {
  const lines = [...CHOICE_RESULT_LINES[choice]];
  const { after, line } = CHOICE_RESULT_PARCEL_LINES[choice];
  const at = after === null ? lines.length : lines.findIndex((l) => l.text === after) + 1;
  if (at <= 0) throw new Error(`No line 「${after}」 after ${choice}`);
  lines.splice(at, 0, line);
  return lines;
}

/**
 * THE ONE LOOK AHEAD — what Kaos says while she shows it.
 *
 * Authored for this beat rather than borrowed from the old TIME SHIFT
 * screen, whose lines were written for a player choosing to spend
 * three years. Nothing is spent here: she shows them one future that
 * follows from the answer they just gave, and puts them back where
 * they were standing.
 *
 * Her register is the one she already has — short, unhurried, a
 * little familiar — and `それぞれの3年間があるから` is deliberately the
 * prologue's 「この世界で出会う人には、みんな続きがあるから。」 said again
 * about the people this player is not looking at.
 *
 * WHAT IS NOT SAID HERE IS THE POINT OF IT. She tells them the choice
 * cannot be retaken and that the reason will come later, and then
 * stops. The reason is hers and belongs to a part of the story that
 * has not happened yet; nothing in this file may explain it.
 */
export const FUTURE_VISION_INTRO_LINES: DialogueLine[] = [
  { speaker: 'ケイオス', text: '……ねえ。あなたが今選んだこと、その先がどうなるか、見てみたい？' },
];

/** Said over the three years themselves. ONE future, not the future. */
export const FUTURE_VISION_SEEN_LINE = 'これが、あなたの選択から続く、ひとつの未来。';

/** Bringing them back, and the one thing she will not explain. */
export const FUTURE_VISION_RETURN_LINES: DialogueLine[] = [
  { speaker: 'ケイオス', text: '今回は特別ね。あなたが決めた直後に戻してあげたよ。' },
  { speaker: 'ケイオス', text: 'ほかの人たちにも、それぞれの3年間があるから。' },
  { speaker: 'ケイオス', text: '……でも、さっきの選択はやり直せないよ。' },
  { speaker: 'ケイオス', text: '理由は、またいずれ知ることになるよ……。' },
];

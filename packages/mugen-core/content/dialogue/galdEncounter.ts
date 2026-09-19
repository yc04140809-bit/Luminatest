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
    { speaker: '盗賊', text: '俺はお前を殺そうとしたんだぞ。' },
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

// パン屋で話す — LINA AT THE COUNTER, THE OWNER AT THE OVEN (2026-10-09).
//
// Two people, each their own talk, never mixed: Lina sells and chats; her
// father talks bread and where its makings are found.
//
// LINA is fourteen, the baker's daughter, the face of the shop — as she
// always was (characters/lina.ts) and nothing added. Her first talk with a
// visitor is the author's, once in a world (`BAKERY_LINA_FIRST_MARK`);
// after that, one short line.
//
// THE OWNER is her father, unnamed as he always was. He gives hints about
// makings the player can already reach, or will soon — never a list of
// recipes, never anywhere the player cannot go yet.
//
// Nothing here mentions Gald, the four answers, or Lina's future.

import type { DialogueLine } from './prologue';
import { BAKERY_OWNER } from '../characters/bakeryOwner';
import { LINA } from '../characters/lina';

/** The hero speaking — filled in with the player's chosen name by the screen. */
export const BAKERY_HERO = '{HERO}';

const L = LINA.name;
const O = BAKERY_OWNER.name;
const H = BAKERY_HERO;

/** Lina, the first time (the author's lines). */
export const BAKERY_LINA_FIRST: readonly DialogueLine[] = [
  { speaker: L, text: 'いらっしゃい！' },
  { speaker: L, text: '今日も焼きたてだよ！' },
  { speaker: H, text: 'いい匂いだな。' },
  { speaker: L, text: 'でしょ？' },
  { speaker: L, text: 'ちゃんと旅にも持っていけるよ！' },
  { speaker: H, text: 'ちゃんと？' },
  { speaker: L, text: '……ちゃんと！' },
  { speaker: H, text: '今ちょっと不安になったぞ。' },
];

/** Read to its end once, in this world (core/world/readMarks.ts `talk:`). */
export const BAKERY_LINA_FIRST_MARK = 'talk:BAKERY_LINA_FIRST';

/** Lina, every time after — one line, in turn. */
export const BAKERY_LINA_AGAIN: readonly DialogueLine[] = [
  { speaker: L, text: 'いらっしゃい！ 今日はどれにする？' },
  { speaker: L, text: '硬焼きパンは日持ちするから、遠出のときにおすすめだよ。' },
  { speaker: L, text: '焼きたては、焼きたてのうちに食べてね！' },
];

/** Lina, as she hands one over. */
export const BAKERY_LINA_SOLD = 'まいどあり！';
/** Lina, when the purse is short. */
export const BAKERY_LINA_SHORT = 'あ……LUMIがちょっと足りないみたい。';
/** Lina, when the basket is full. */
export const BAKERY_LINA_FULL = 'もう持ちきれないよ？';

/** The owner — a hint about makings, one a talk, in turn. */
export const BAKERY_OWNER_HINTS: readonly DialogueLine[] = [
  { speaker: O, text: '木の実なら、グリーンウッドの森で見つかる。' },
  { speaker: O, text: '魔力を含んだ素材は、普通のパンとは相性が違う。' },
  { speaker: O, text: '硬焼きは、水を少なくしてじっくり焼くんだ。旅の腹持ちが違う。' },
];

/** The two at the counter, for the switch. */
export const BAKERY_PEOPLE = [
  { id: 'LINA', name: L },
  { id: 'OWNER', name: '主人' },
] as const;
export type BakeryPerson = (typeof BAKERY_PEOPLE)[number]['id'];

// 第0話 — THE WAY INTO ALDEN, after the name is given (App, 2026-10-08).
//
// The game's short telling of the novel's episode 0: on the road, a girl
// is suddenly walking beside the hero. They have NEVER MET. He wonders who
// she is, why she is coming along, how she knows his name, and what her
// wings are — right an angel's, left a devil's — and she answers lightly,
// or not at all. It is mostly his 突っ込み and her ease; once, at the end,
// she stops smiling for a moment and is herself again before he can ask.
//
// WHAT THIS DECIDES, AND NOTHING MORE: that this is where they meet, on
// the way to Alden, and that she already knows his name. NOT who she is,
// why she knows it, what her wings are, or anything of the world's past
// (no Lucifer, no AI, no old war): nobody here explains anything.
//
// The words only; the screen is the App's (ui/intro.tsx). Short on purpose:
// about a minute to read, and skippable from the first line.

import type { DialogueLine } from '../dialogue/prologue';

/** The hero speaking, or his name said — filled in by the screen with the player's choice. */
export const INTRO_HERO = '{HERO}';
const HERO = INTRO_HERO;
const STRANGER = '？？？';
const KAOS = 'ケイオス';

/**
 * A beat of the way in: a line, where it is (`place`), how she is drawn
 * (`kaos`: not yet there, as she talks, or the one moment she is not
 * smiling), whether the hero is only thinking it (`thought`), and how
 * long the moment is held before the way on is offered (`holdMs`).
 */
export interface IntroBeat extends DialogueLine {
  place: 'ROAD' | 'VILLAGE';
  kaos: 'away' | 'talk' | 'still';
  thought?: true;
  holdMs?: number;
}

export const OPENING_INTRO: readonly IntroBeat[] = [
  { place: 'ROAD', kaos: 'away', speaker: HERO, text: '……この先が、アルデン村か。' },
  { place: 'ROAD', kaos: 'away', speaker: STRANGER, text: 'うん。もうすぐだよ♪' },
  { place: 'ROAD', kaos: 'away', speaker: HERO, text: '……。' },
  { place: 'ROAD', kaos: 'away', speaker: HERO, text: '…………誰？' },
  { place: 'ROAD', kaos: 'talk', speaker: null, text: 'いつの間にか、隣を女の子が歩いていた。' },
  { place: 'ROAD', kaos: 'talk', speaker: HERO, text: '女の子……？', thought: true },
  { place: 'ROAD', kaos: 'talk', speaker: HERO, text: 'いや、それより……', thought: true },
  { place: 'ROAD', kaos: 'talk', speaker: HERO, text: '右が天使の翼で、左が悪魔の翼？', thought: true },
  { place: 'ROAD', kaos: 'talk', speaker: HERO, text: 'この子、可愛いけど……\nどういう存在なんだ？', thought: true },
  { place: 'ROAD', kaos: 'talk', speaker: STRANGER, text: 'なに？' },
  { place: 'ROAD', kaos: 'talk', speaker: HERO, text: 'いや、なんでもない。' },
  { place: 'ROAD', kaos: 'talk', speaker: STRANGER, text: 'じゃ、行こっか♪' },
  { place: 'ROAD', kaos: 'talk', speaker: HERO, text: '待って。' },
  { place: 'ROAD', kaos: 'talk', speaker: STRANGER, text: 'ん？' },
  { place: 'ROAD', kaos: 'talk', speaker: HERO, text: 'なんで一緒に行く前提なんだ？' },
  { place: 'ROAD', kaos: 'talk', speaker: STRANGER, text: '同じ方向だから？' },
  { place: 'ROAD', kaos: 'talk', speaker: HERO, text: '理由が軽いな！？' },
  { place: 'VILLAGE', kaos: 'talk', speaker: null, text: '道の先に、村が見えてきた。' },
  { place: 'VILLAGE', kaos: 'talk', speaker: HERO, text: '……あれがアルデン村。' },
  { place: 'VILLAGE', kaos: 'talk', speaker: STRANGER, text: 'うん。' },
  { place: 'VILLAGE', kaos: 'talk', speaker: HERO, text: 'で、君は？' },
  // Her name, said by her: from here on she is ケイオス.
  { place: 'VILLAGE', kaos: 'talk', speaker: KAOS, text: 'ケイオス。' },
  { place: 'VILLAGE', kaos: 'talk', speaker: HERO, text: 'ケイオス……。' },
  { place: 'VILLAGE', kaos: 'talk', speaker: KAOS, text: `よろしくね、${HERO}♪` },
  { place: 'VILLAGE', kaos: 'talk', speaker: HERO, text: '……待て。' },
  { place: 'VILLAGE', kaos: 'talk', speaker: HERO, text: 'なんで俺の名前知ってる？' },
  { place: 'VILLAGE', kaos: 'talk', speaker: KAOS, text: '勘。' },
  { place: 'VILLAGE', kaos: 'talk', speaker: HERO, text: 'そんなピンポイントな勘ある！？' },
  { place: 'VILLAGE', kaos: 'talk', speaker: KAOS, text: 'あるある♪' },
  { place: 'VILLAGE', kaos: 'talk', speaker: HERO, text: '絶対ない。' },
  // The one moment: she is not smiling, and says nothing — then she is.
  { place: 'VILLAGE', kaos: 'still', speaker: null, text: '……', holdMs: 1200 },
  { place: 'VILLAGE', kaos: 'talk', speaker: KAOS, text: 'ほら、行こ♪' },
];

/** The card they arrive under, before the village is theirs to walk. */
export const INTRO_ARRIVAL = { title: 'MUGEN ZERO', place: 'ALDEN VILLAGE' } as const;

/**
 * WHAT SKIPPING ASKS. The novel's episode is on note; the address is not
 * written into the game yet (`INTRO_NOTE_URL` null). The day it is, a
 * 「noteで読む」 button appears beside the question — and nothing else changes.
 */
export const INTRO_SKIP_QUESTION = '導入ストーリーをスキップしますか？';
export const INTRO_SKIP_NOTE = 'この物語はnote版『MUGEN ZERO』でも読むことができます。';
export const INTRO_NOTE_URL: string | null = null;

/** Seen to its end or skipped — the same either way (core/world/readMarks.ts `event:`). */
export const OPENING_INTRO_MARK = 'event:OPENING_INTRO';

/** Its place among the scenes that can be seen again (人生の記録 → 回想). */
export const OPENING_INTRO_RECALL = { id: 'OPENING_INTRO', title: '第0話　アルデン村へ' } as const;

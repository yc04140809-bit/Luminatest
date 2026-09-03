// What this build changed on screen, declared by whoever changed it.
//
// This is the one part of the QA report a machine cannot work out, and
// it is also the part that decides how much of a human's day the review
// costs. Every screen listed as unchanged is a screenshot nobody has to
// take; every screen listed as changed is one they do.
//
// So it is maintained by hand, per build, and it is honest: if you are
// not sure whether a screen moved, it changed.

import type { VisualChange } from '../../core/qa/types';

/* VISUAL IDENTITY v0.1 turned the whole game from black to ivory and
   gold. There is no such thing as an unaffected screen this round, so
   every one of them is listed as changed and every one of them is
   photographed — the usual "keep it to a few" rule is about not making a
   person collect screenshots by hand, and the capture does that now. */
export const VISUAL_CHANGES: readonly VisualChange[] = [
  { screen: 'TITLE', changed: true, reason: '第一印象。ivory の上でケイオスと金の輪が読めるか' },
  { screen: 'PROLOGUE / KAOS', changed: true, reason: '最初の一文と彼女の登場が明るい紙面で成立するか' },
  { screen: 'HOME', changed: true, reason: '村の絵の上でメニューが読めるか。EXPLORE の記憶の輪' },
  { screen: 'EXPLORE', changed: true, reason: 'カードと ✦ 印のコントラスト' },
  { screen: 'TAVERN / TALK', changed: true, reason: '暗い絵を紙面へ溶かした結果。グレイヴの傷が見えるか' },
  { screen: 'GREENWOOD / BATTLE', changed: true, reason: 'HP バーと戦闘ログの可読性' },
  { screen: 'WORLD MEMORY', changed: true, reason: '記憶の糸と輪。ここが作品の主題として見えるか' },
  { screen: 'LIFE CHOICE / ENDING', changed: true, reason: '背景を持つ絵に額を付けた結果' },
  { screen: 'PLAYTEST SURVEY', changed: true, reason: '設問と入力欄が明るい紙面で読めるか' },
  { screen: 'DEV REVIEW HUB', changed: true, reason: 'DEV 画面もテーマに追従しているか' },
];

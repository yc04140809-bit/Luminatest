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
  {
    screen: 'BATTLE UI PROTOTYPE',
    changed: true,
    reason:
      '戦闘開始時のケイオス介入を追加。35% で1回だけ発動し、1.8秒のカード（コマンド欄の位置）と、ケイオス側の光・対象側の印が出ます。森は隠れません。65% は従来どおり何も出ません。まだ採用していません',
  },
  {
    screen: 'GREENWOOD / BATTLE',
    changed: false,
    reason: '前ラウンドから無変更。試作は既存画面を置き換えていません',
  },
  { screen: 'HOME', changed: false, reason: 'v0.2 で承認済み' },
  { screen: 'TAVERN / TALK', changed: false, reason: 'シーンアート修正版のまま' },
  { screen: 'TITLE', changed: false, reason: 'v0.1 のまま' },
  { screen: 'PROLOGUE / KAOS', changed: false, reason: 'v0.1 のまま' },
  { screen: 'EXPLORE', changed: false, reason: 'v0.1 のまま' },
  { screen: 'WORLD MEMORY', changed: false, reason: 'v0.1 のまま' },
  { screen: 'LIFE CHOICE / ENDING', changed: false, reason: 'v0.1 のまま' },
  { screen: 'PLAYTEST SURVEY', changed: false, reason: 'v0.1 のまま' },
  { screen: 'DEV REVIEW HUB', changed: false, reason: 'v0.1 のまま' },
];

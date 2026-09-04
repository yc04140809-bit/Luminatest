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
    screen: 'ARCANA / アルカナ図鑑',
    changed: true,
    reason:
      '新規画面。一覧（未発見は ARCANA #??? のまま）と詳細（構築度バー・段階解放される情報・ヒント・COMPLETE）。構築度が上がったときだけ画面上部に小さな通知が出ます',
  },
  {
    screen: 'HOME',
    changed: true,
    reason: '下段の導線が4項目から5項目に増えました（アルカナを追加）。他は無変更です',
  },
  {
    screen: 'BATTLE UI PROTOTYPE',
    changed: false,
    reason:
      '前ラウンドから見た目の変更なし。見たものを外へ報告するコールバックが1つ増えただけです',
  },
  {
    screen: 'GREENWOOD / BATTLE',
    changed: false,
    reason: '前ラウンドから無変更。試作は既存画面を置き換えていません',
  },
  { screen: 'TAVERN / TALK', changed: false, reason: 'シーンアート修正版のまま' },
  { screen: 'TITLE', changed: false, reason: 'v0.1 のまま' },
  { screen: 'PROLOGUE / KAOS', changed: false, reason: 'v0.1 のまま' },
  { screen: 'EXPLORE', changed: false, reason: 'v0.1 のまま' },
  { screen: 'WORLD MEMORY', changed: false, reason: 'v0.1 のまま' },
  { screen: 'LIFE CHOICE / ENDING', changed: false, reason: 'v0.1 のまま' },
  { screen: 'PLAYTEST SURVEY', changed: false, reason: 'v0.1 のまま' },
  { screen: 'DEV REVIEW HUB', changed: false, reason: 'v0.1 のまま' },
];

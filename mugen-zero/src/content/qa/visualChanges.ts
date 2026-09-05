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
    screen: 'ADMIN DEV TOOLS',
    changed: true,
    reason:
      '管理者ロックの文言を日本語にし、同一セッション中は再入力を省略します（永続保存はしません）。管理者ホームに「演出プレビュー」を追加し、ARCANA ＞ 召喚事故 ＞ UNKNOWN #001 の巨大召喚・カットイン・フルシーケンスを、ゲームデータを一切変更せずに再生できます',
  },
  {
    screen: 'BATTLE UI PROTOTYPE',
    changed: false,
    reason:
      '召喚事故の演出を ui/cinematic へ切り出し、実戦とプレビューが同じ定義を再生するようにしました。画面の見え方・順序・「間」は前ラウンドから1つも変えていません（E2E 29本が無変更で通ります）',
  },
  {
    screen: 'ARCANA / アルカナ図鑑',
    changed: false,
    reason: '前ラウンドから無変更です',
  },
  {
    screen: 'HOME',
    changed: false,
    reason: '前ラウンドで承認待ちの5項目導線のまま。今回は無変更です',
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

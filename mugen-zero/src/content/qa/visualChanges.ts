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
    screen: 'SETTINGS',
    changed: true,
    reason:
      '「オープニングテーマ ON/OFF」を1行追加しました。既定はONで、アプリを開いてから最初の1回だけ流れます。音量はBGM音量に従い、OP専用の音量は作っていません',
  },
  {
    screen: 'OPENING THEME / SKIP',
    changed: true,
    reason:
      '曲が鳴っている間だけ右上に SKIP が出ます。楽曲ファイルはまだ無いため通常は出ません。撮影はDEV専用の代役スイッチ（音は鳴らしません）で出しています',
  },
  {
    screen: 'ADMIN DEV TOOLS',
    changed: true,
    reason:
      '「OPENING THEME PREVIEW」を1項目追加しました（SKIP表示のリハーサル／「今回はもう流した」を忘れる）。既存の演出プレビューと開発スイッチは無変更です',
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

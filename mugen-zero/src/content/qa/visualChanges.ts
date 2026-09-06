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

/* v1.1 changes two screens deeply and several others structurally. The
   two deep ones are photographed: the forest, which is now a landscape
   field with ground you can and cannot stand on, and the fight, which
   has a middle to it. The structural ones — a panel that scrolls, a way
   out that stays put — are things a screenshot cannot show and a test
   can, so they are asserted in e2e/scrolling.spec.ts and described in
   words here. */
export const VISUAL_CHANGES: readonly VisualChange[] = [
  {
    screen: 'GREENWOOD / BATTLE',
    changed: true,
    reason:
      '探索フィールドを横ワールド化しました。背景は新規の横長フィールド画（添付いただいたもの）。画面下部の地面帯だけが歩行可能で、地面以外をタップしても最寄りの地面へ補正されます。8つの発見スポットは地面帯の上に「どのくらい奥／どのくらい横」で定義され、ピクセル指定をやめました。進行方向は右→左で、右端に「戻る」判定を置いています',
  },
  {
    screen: 'BATTLE UI PROTOTYPE',
    changed: true,
    reason:
      '戦闘テンポの調整。敵HPバーの下に細い「体勢（POISE）」ゲージを追加し、崩れている間は点滅します。敵名の横に「警戒」「必死」などの段階バッジが出ます。レイアウト・演出・古代龍のカットインは無変更です',
  },
  {
    screen: 'ADMIN DEV TOOLS',
    changed: false,
    reason:
      'スクロール修正が入りました（パネル本体がスクロールし、「もどる」は固定）。見た目の変更ではないので撮影せず、e2e/scrolling.spec.ts で「1700px超のパネルの末尾に到達できる」「もどるが常に画面内」を検証しています。CHARACTER ART 一覧に「ガルド」が1体増えています',
  },
  {
    screen: 'EXPLORE',
    changed: false,
    reason: '一覧のスクロールを確認済み。見た目は前ラウンドから無変更です',
  },
  {
    screen: 'SETTINGS',
    changed: false,
    reason: '一覧のスクロールを確認済み。見た目は前ラウンドから無変更です',
  },
  {
    screen: 'ARCANA / アルカナ図鑑',
    changed: false,
    reason: '一覧のスクロールを確認済み。表示は無変更です',
  },
  {
    screen: 'TITLE',
    changed: false,
    reason: '前ラウンドから無変更です',
  },
  {
    screen: 'HOME',
    changed: false,
    reason: '前ラウンドから無変更です',
  },
  {
    screen: 'OPENING THEME / SKIP',
    changed: false,
    reason: '前ラウンドから無変更です（楽曲はまだ入っていません）',
  },
  { screen: 'PROLOGUE / KAOS', changed: false, reason: '無変更' },
  { screen: 'TAVERN / TALK', changed: false, reason: '無変更' },
  { screen: 'WORLD MEMORY', changed: false, reason: 'スクロール確認済み。見た目は無変更' },
  {
    screen: 'LIFE CHOICE / ENDING',
    changed: false,
    reason:
      'ガルドの絵の「出どころ」を画像管理レイヤーへ移しましたが、出る絵は同じ（膝をついたガルド）です',
  },
  { screen: 'PLAYTEST SURVEY', changed: false, reason: 'スクロール確認済み。見た目は無変更' },
  { screen: 'DEV REVIEW HUB', changed: false, reason: '無変更' },
];

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

/* LANDSCAPE MIGRATION v1.0 turns every screen in the game through
   ninety degrees, so there is no such thing as an unaffected screen this
   round either. What is photographed is the set that answers "did
   turning it break anything": the way in, the home, the list, the
   forest, the fight, and the settings page the opening theme lives on.
   The rest is described in words. */
export const VISUAL_CHANGES: readonly VisualChange[] = [
  {
    screen: 'BATTLE UI PROTOTYPE',
    changed: true,
    reason:
      'ランドスケープ化。上部情報帯（敵HP＝左／味方HP＝右）／中央戦闘領域／下部コマンドUI の3分割にしました。敵は左、味方（あなた＋ケイオス）は右で、互いを向いています。演出・タイムライン・古代龍のカットインは無変更です',
  },
  {
    screen: 'GREENWOOD / BATTLE',
    changed: true,
    reason:
      'ランドスケープ化。探索フィールド（Phaser）のワールドは縦のまま中央に置き、場所名を左、操作説明と「森を出る」を右に配置しました。8つの発見スポットは背景画に合わせて手で置いたものなので動かしていません',
  },
  {
    screen: 'TITLE',
    changed: true,
    reason: 'ランドスケープ化。キービジュアル・ロゴ・翼の装飾・ボタンはそのままです',
  },
  {
    screen: 'HOME',
    changed: true,
    reason:
      'ランドスケープ化。左に村（円のなか）、右に世界の記憶・探索する・下段レール、という2段組にしました。項目・文言・遷移は無変更です',
  },
  {
    screen: 'EXPLORE',
    changed: true,
    reason: 'ランドスケープ化。カードが横幅いっぱいに伸びないよう、読める幅で中央に置いています',
  },
  {
    screen: 'SETTINGS',
    changed: true,
    reason: 'ランドスケープ化。前ラウンドで足した「オープニングテーマ ON/OFF」はそのままです',
  },
  {
    screen: 'ADMIN DEV TOOLS',
    changed: false,
    reason:
      'ランドスケープ化の影響は受けますが、今回の主題ではないので撮影から外しました。中身の変更は「CHARACTER ART — 実装済み / 未実装」の一覧を1ブロック追加しただけで、演出プレビューは無変更です',
  },
  {
    screen: 'OPENING THEME / SKIP',
    changed: false,
    reason: '前ラウンドから無変更です（楽曲はまだ入っていません）',
  },
  {
    screen: 'ARCANA / アルカナ図鑑',
    changed: false,
    reason:
      '画像の出どころを画像管理レイヤーへ移しましたが、表示は同じ絵の同じ切り出しです。幅だけ読める幅に制限しました',
  },
  { screen: 'PROLOGUE / KAOS', changed: false, reason: 'ランドスケープ化。会話ボックスは読める幅で中央に置いています' },
  { screen: 'TAVERN / TALK', changed: false, reason: 'シーンアート修正版のまま' },
  { screen: 'WORLD MEMORY', changed: false, reason: 'ランドスケープ化のみ' },
  { screen: 'LIFE CHOICE / ENDING', changed: false, reason: 'ランドスケープ化のみ' },
  { screen: 'PLAYTEST SURVEY', changed: false, reason: 'ランドスケープ化のみ' },
  { screen: 'DEV REVIEW HUB', changed: false, reason: 'ランドスケープ化のみ' },
];

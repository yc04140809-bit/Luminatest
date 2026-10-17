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

/* LANDSCAPE VISUAL STABILIZATION v1.0 is a layout pass, so almost
   everything moved and almost everything is photographed. The seven
   screens the brief named are all here. Two things do not need a
   picture and are described instead: the stage no longer turns itself
   (that is a fact about transforms, asserted in e2e/landscape.spec.ts
   and visible only on a phone held upright), and the size registry
   (a fact about numbers, asserted in spriteFrames.test.ts). */
export const VISUAL_CHANGES: readonly VisualChange[] = [
  {
    screen: 'TAVERN / TALK',
    changed: true,
    reason:
      '会話画面を横画面向けに作り直しました。背景が画面全面（cover）になり、下部に横長のダイアログボックス。以前は絵が上半分の帯で、下半分が巨大なクリーム色の余白でした',
  },
  {
    screen: 'GREENWOOD / BATTLE',
    changed: true,
    reason:
      '探索キャラクターを大きくしました（主人公 約0.19→0.28、ケイオス 58px固定→フィールド高の0.30）。「歩きたい場所をタップ／森を出る」は右下から右上へ移動——キャラが大きくなって文字と重なったためです。歩行可能領域・進行方向（右→左）はv1.1のまま変更していません',
  },
  {
    screen: 'GALD ENCOUNTER',
    changed: true,
    reason:
      'ガルドの遭遇シーン。以前は画像が元ピクセルサイズのまま描画され、画面に「膝から下」しか映っていませんでした。ステージ基準のサイズ指定に直し、足元基準で立たせています',
  },
  {
    screen: 'GALD BATTLE / MAGIC',
    changed: true,
    reason:
      'ガルド戦を横画面の戦闘レイアウトへ作り直しました。敵＝左／味方＝右（主人公が前衛、ケイオスが後衛）、全員が同じ地面ラインに立ちます。いただいた透過PNG3枚（主人公・ケイオス・ガルドの戦闘ポーズ）を登録し、味方の立ち絵が初めて画面に出ました。背景の森も見えるようになっています（以前はほぼクリーム一色）',
  },
  {
    screen: 'LIFE CHOICE / ENDING',
    changed: true,
    reason:
      '人生選択を横画面向けに作り直しました。左＝対象キャラクター／名前／短いセリフ、右＝質問と2×2の選択肢。以前はタイトルと画像と選択肢が縦に重なり、文字が画像の上に乗っていました',
  },
  {
    screen: 'BATTLE UI PROTOTYPE',
    changed: true,
    reason:
      '森の戦闘。味方2人が新しい戦闘立ち絵になり、サイズは共通レジストリ（content/art/spriteFrames）から取ります。重なり防止のため主人公とケイオスの立ち位置を離しました。モスラビットのDOWN画像は「同じ動物が伏せている」大きさを保ちます（画面を占有しません）',
  },
  {
    screen: 'TITLE',
    changed: false,
    reason:
      '中身は無変更です。ただし縦持ちの端末では見え方が変わります（90度回転をやめ、16:9ステージを縮小表示＋「端末を横向きにしてください」）',
  },
  { screen: 'HOME', changed: false, reason: '無変更です' },
  { screen: 'EXPLORE', changed: false, reason: '無変更です' },
  { screen: 'SETTINGS', changed: false, reason: '無変更です' },
  { screen: 'ARCANA / アルカナ図鑑', changed: false, reason: '無変更です' },
  { screen: 'ADMIN DEV TOOLS', changed: false, reason: '無変更です' },
  { screen: 'OPENING THEME / SKIP', changed: false, reason: '無変更です（楽曲はまだ入っていません）' },
  { screen: 'PROLOGUE / KAOS', changed: false, reason: '会話レイアウトの変更は受けますが、ケイオスの語りは中央寄せの別レイアウトなので見た目は無変更です' },
  { screen: 'WORLD MEMORY', changed: false, reason: '無変更' },
  { screen: 'PLAYTEST SURVEY', changed: false, reason: '無変更' },
  { screen: 'DEV REVIEW HUB', changed: false, reason: '無変更' },
];

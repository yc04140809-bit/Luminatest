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

/* CHAOS MAGIC v1.0 changes one screen and only one: Gald's fight, which
   now has a 《魔法》 command, an MP bar and the moment she steps forward.
   The forest fight has the same command in its code, but it is locked
   until Gald's fight has been fought, so in a fresh world — which is
   what the capture photographs — that screen is pixel-for-pixel the one
   from v1.1. Photographing it again would cost a reviewer two minutes
   and show them nothing, so it is reported here in words and asserted
   in e2e/magic.spec.ts instead. */
export const VISUAL_CHANGES: readonly VisualChange[] = [
  {
    screen: 'GALD BATTLE / MAGIC',
    changed: true,
    reason:
      'ガルド戦にケイオスちゃんの《魔法》が入りました。戦闘中盤（HP66%以下、または8ターン経過）でケイオスちゃんが前に出る場面が戦闘画面の上に重なり、以後コマンド行が「攻撃／魔法／身構える」の3つになります。上部にMPを追加（48/48から開始）。魔法トレイには《星光弾》1つ（MP6）だけが並びます。魔法を使ったターンは主人公は攻撃しません（1ターン1行動のまま）',
  },
  {
    screen: 'BATTLE UI PROTOTYPE',
    changed: false,
    reason:
      '森の戦闘にも同じ《魔法》コマンドを通していますが、ガルド戦を戦うまでは解禁されないため、新規ワールド（＝撮影される状態）の見た目はv1.1と同一です。解禁後の表示は e2e/magic.spec.ts「she has not forgotten it by the next fight」で検証しています',
  },
  {
    screen: 'GREENWOOD / BATTLE',
    changed: false,
    reason:
      '探索フィールドと横画面戦闘レイアウトはv1.1から無変更です。モスラビット戦のコマンド行も、魔法未解禁の新規ワールドでは無変更です',
  },
  {
    screen: 'ADMIN DEV TOOLS',
    changed: false,
    reason: '無変更です（魔法解禁フラグ用のDBスキーマ変更は行っていません）',
  },
  {
    screen: 'EXPLORE',
    changed: false,
    reason: '無変更です',
  },
  {
    screen: 'SETTINGS',
    changed: false,
    reason: '無変更です',
  },
  {
    screen: 'ARCANA / アルカナ図鑑',
    changed: false,
    reason: '無変更です',
  },
  {
    screen: 'TITLE',
    changed: false,
    reason: '無変更です',
  },
  {
    screen: 'HOME',
    changed: false,
    reason: '無変更です',
  },
  {
    screen: 'OPENING THEME / SKIP',
    changed: false,
    reason: '無変更です（楽曲はまだ入っていません）',
  },
  { screen: 'PROLOGUE / KAOS', changed: false, reason: '無変更' },
  { screen: 'TAVERN / TALK', changed: false, reason: '無変更' },
  { screen: 'WORLD MEMORY', changed: false, reason: '無変更' },
  {
    screen: 'LIFE CHOICE / ENDING',
    changed: false,
    reason:
      '4択は無変更です。魔法を使って勝っても同じ4択が同じ形で出ることを e2e で確認しています（魔法は世界の記憶に何も書きません）',
  },
  { screen: 'PLAYTEST SURVEY', changed: false, reason: '無変更' },
  { screen: 'DEV REVIEW HUB', changed: false, reason: '無変更' },
];

# 触る漫画形式のオープニング（App、2026-10-16）

「MUGEN ZERO PROJECT／オープニング実装指示書」に基づく、新規開始時のオープニング。
ムービーではなく、**1 TAP = 1 ページ**で読む漫画。

## 流れ

はじめる → オープニング（SCENE01〜17）→ 名前入力 → アルデン村

- 旧オープニング（「あなたが忘れても…」→ ケイオスの語り）と第0話は**新規開始では再生しない**。
  第0話は人生の記録 →「回想」から今までどおり見られる（ケイオス初対面が二重にならないように）。
- 名前入力の前に旧プロローグや第0話は挟まない。

## ページと動き（正本：`mugen-core/content/story/openingComic.ts`）

| 種類 | 動き | 該当 |
|---|---|---|
| PAGE | TAP で次へ（「TAP」表示あり。フラッシュと「じゃ。」は表示なし） | SCENE01〜03・05・06・09・10・14・16・17、FLASH01〜07 |
| NOISE | 160ms で自動で次へ（TAP 不可）。ノイズ SE（3 種を順番に） | SCENE04、FLASH の間のノイズ |
| HOLD | 1.5 秒は TAP を受け付けない（絶望を見せる） | FLASH07 アップ |
| POWER_OFF | 白い線が潰れて消える（0.42 秒）→ 黒・無音 0.8 秒 → 自動で次へ。プツン SE | SCENE08 |
| CHOICE | 絵に描かれた 3 つの答えだけが押せる → 真顔 0.6 秒 →「……なんてね♪」→ TAP で次へ | SCENE11〜13 |
| GLIMPSE | 黒地にガルドの立ち絵を 1 秒 → 自動で次へ（名前・台詞なし） | SCENE15 |

- 台詞はすべて絵に描かれており、画面側は文字を重ねない（`lines` は記録用）。
- 連打対策：200ms 以内の TAP は受け付けない（`OPENING_TAP_LOCK_MS`）。
- 三択の答えは WORLD MEMORY に書かない（どれを選んでも同じ）。
- 絵は `mugen-assets/files/opening/`（受け取ったまま・バイト一致、30 枚）。差し替えはファイルの差し替えで済む。

## 音

- BGM はコードに曲名を書かず、ページ側は `PLAY / DIM / STOP / RESUME` を伝えるだけ（`onMusic`）。
  App が今の曲（オープニング中はケイオスの曲）を、DIM で 35%、STOP で無音、RESUME で元の音量に戻す。
  - 開始で再生、ノイズの連続（SCENE07〜）で DIM、プツンで STOP、変顔（SCENE09）で RESUME、
    「じゃ。」で DIM、「行ってらっしゃい♪」で RESUME。
- SE は仮（Web Audio で合成、`src/ui/openingSound.ts`）：TAP・ノイズ 3 種・プツン。効果音量の設定に従う。
  正式な SE を受け取ったら差し替える。

## セーブ

- オープニング → 名前決定の時点で、既読 `event:OPENING_COMIC`（readMarks）を書く。新しいセーブ項目は無し、
  SAVE_VERSION 3 のまま、移行処理なし。旧セーブ（名前決定済み）は「つづきから」で村へ直行し、オープニングは出ない。
- 途中でアプリを閉じた場合は名前が未決定なので、次の「はじめる」で最初から。

## SKIP

- DEBUG ビルド（`npm run dev`、`VITE_MUGEN_DEBUG_TOOLS=1`）だけ右上に「SKIP（DEBUG）」→ 名前入力へ。
- リリース版・テスター版には入らない（`npm run check:release` が `opening-debug-skip` を検査）。
- ユーザー向けのスキップは無し（作者と相談してから）。

## ガルドの森イベント

- 変更なし。森に入っただけでは起きない（従来どおりボタンから）。

## コード・テスト

- 内容：`mugen-core/content/story/openingComic.ts`、テスト `openingComic.test.ts`（順番・台詞・時間・全画像を 1 回ずつ・TAP ロック）
- 画面：`mugen-app/src/ui/opening.tsx`・`opening.css`、絵：`src/assets/openingArt.ts`、SE：`src/ui/openingSound.ts`
- つなぎ：`App.tsx`（PROLOGUE 画面で `OpeningScreen` → 名前入力 → 村）、`platform/audio.ts` に `duckBgm`
- e2e：`openingComic.spec.ts`（5 本：TAP で全 30 枚を順番どおり・自動ページは TAP しない・名前 → 村・既読・つづきからで再生しない／
  連打は 1 ページ／HOLD の待ち・プツンで無音・変顔で曲が戻る／844×390・640×300 の三択）、
  `scenes`（各ページが黒地に丸ごと・文字を重ねない）、`intro`（新規開始で第0話を挟まない・回想の第0話）、`music`。
  他の e2e は `throughTheOpening`（DEBUG の SKIP）で名前入力へ。

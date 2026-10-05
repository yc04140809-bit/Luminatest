# 回帰テスト一覧（2026-10-05）

ZERO 本体を変更したときに壊れていないかを確かめる項目と、それを確かめている自動テストの対応表。
App の e2e は `packages/mugen-app` で `npx playwright test --config playwright.config.ts`（開発サーバー
`npx vite --port 5174 --host 127.0.0.1 --strictPort` が必要）。core の単体テストは `npm test -w @mugen/core`。

## まず回すもの（通しのスモーク）

`e2e/regression.spec.ts` — **1 つのセーブで最初から最後まで**通す 1 本（約 1.5 分）。
各画面のテストが個別に通っていても、画面と画面のつなぎ目が壊れていればここで落ちる。

はじめる → OPENING → 命名（レイ）→ 村 → ステータス（名前・スクロール領域・もどる）→ 森 → 戦闘 → 勝利（結果画面、アイテム名）→
ガルド → 覚醒 → CUT-IN（星光弾）→ 四択 → TIME SHIFT（日付が進まない）→ WORLD MEMORY（1 件）→ 再起動 → つづきから（名前・記録・ガルドが再出現しない）、
最後にページエラーが 0 件であること。

## 項目ごとの対応

| 項目 | 自動テスト | 備考 |
|---|---|---|
| ゲーム開始 | `regression`、`loop`「the whole loop…」 | 初回は「はじめる」だけ、再起動後は「つづきから」 |
| OP | `regression`、`scenes`「the prologue is the world alone, then Kaos…」、`music`（曲） | |
| 名前入力 | `regression`、`naming`（4 本：入力・空白拒否・既定名・再起動） | |
| 村 | `regression`、`loop`、`parity`「the shop takes LUMI…」 | |
| 酒場 | `tavern`（村 → 酒場 → 背景・マスター・BGM・会話 → 村、セーブ不変、横画面 5 サイズでマスターが切れない） | |
| パン屋 | `bakery`（村 → パン屋 → 背景・主人・リナ・会話 → 村、BGM は村の曲のまま、セーブ不変、横画面 5 サイズで 2 人が切れず会話欄と重ならない） | Android の戻るボタンはブラウザから押せないため実機で確認 |
| 森 | `regression`、`loop`、`battleBackground` | |
| 戦闘開始 | `regression`、`attack`、`battleStage`（配置） | |
| 勝利 | `regression`、`loop`（経験値・LUMI・レベル・アイテム名）、`attack`「beaten, it goes down…」 | |
| CUT-IN | `regression`（本編）、`magic`（本編の全 5 魔法）、`cutin`（DEBUG プレビュー） | |
| 四択 | `regression`、`gald`（4 択の表示・1 回限り・再起動後も保持） | 4 つのうち本編で通すのは SPARE。残り 3 つの結果は core の単体テスト |
| WORLD MEMORY 保存 | `regression`、`memory`（記録の中身・日付・場所・人物・重み、再起動） | |
| TIME SHIFT 特殊イベント | `regression`、`memory`「the look ahead costs the world nothing」ほか 7 本 | 時間が進まない・途中で終えたら再起動後にまた出る・終えたら二度と出ない |
| 未来 CG（ガルド） | `futureCg`（TIME SHIFT は選んだ未来の 1 枚だけ・4 ルート、場所に入ったらその場所の CG・4 ルート、横画面 5 サイズで CG が欠けず「つづける」が画面内）、App 単体 `futureVision.test.ts`・`eventCg.test.ts` | 高さの低い画面（640×300）では TIME SHIFT の本文だけが縦スクロールし、「つづける」は常に画面内 |
| ステータス画面 | `regression`、`status`（9 本、Android 横画面 6 サイズでのスクロール含む）、`equipment` | |
| NPC DEPLOY プレビュー | `forgeImport`（取り込み・差分・実機確認） | 書き込み先は content（セーブではない） |
| NPC DEPLOY 検証 | `forgeImport`「A2 / A6…」「C7 / D4 / D6…」（事前検証 PASS/WARNING/ERROR を含む）、core `forge/preflight.test.ts`・`forge/validate.test.ts` | |

## 自動化していない（手で確認するもの）

- **実機の音**：Android で実際に鳴るか・音量・最初のタッチで鳴り始めるか。自動テストは「どの曲を頼んだか」までで、スピーカーの出力は見られない。
- **実機の画面端**：切り欠き・ジェスチャーバーとの重なり（`docs/BATTLE_AUDIT_2026-10.md`）。

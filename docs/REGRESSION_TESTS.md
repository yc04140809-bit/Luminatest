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
| 村 | `regression`、`loop`、`parity`「the shop takes LUMI…」、`uxRound`（横画面 5 サイズで「噂話」まで画面内） | 選択肢の配色（アイボリー＋ゴールド＋茶）は見た目だけで、e2e は機能のみ確認。高さ 420px 以下ではボタンと間隔を詰めて、9 つの選択肢すべてを画面内に収める（2026-10-07。以前は 640×300 で 2 段目がはみ出していた） |
| 序盤UX（酒場の初訪問順・《瞬断》・AUTO 解禁・BOSS カットイン・戦闘後の酒場・目的地通知・噂話・NEW） | `uxRound`（15 本）、core `talkQueue.test.ts`・`readMarks.test.ts`・`villageRumors.test.ts`・`sekiryugaBattle.test.ts` | 内容は `docs/UX_EARLY_GAME.md` |
| 酒場 | `tavern`（9 本：村 → 酒場 → 背景・マスター・BGM・会話 → 村、セーブは初対面の既読 `talk:GRAVE_MEETING` 1 行以外不変、横画面 5 サイズでマスターが切れない、初対面は新規セーブで 1 回だけ（再入店・再起動後は自己紹介しない）、`readMarks` の無い既存セーブ）、core `graveTalks.test.ts` | 初対面はセーブ単位で 1 回（2026-10-07 改定、`docs/APP_TAVERN.md`） |
| パン屋 | `bakery`（村 → パン屋 → 背景・主人・リナ・会話 → 村、BGM は村の曲のまま、セーブ不変、横画面 5 サイズで 2 人が切れず会話欄と重ならない） | Android の戻るボタンはブラウザから押せないため実機で確認 |
| 森 | `regression`、`loop`、`battleBackground`、`explore`（古代遺跡と同じ歩き回り：手前／奥で大きさが変わる・ケイオスが同じ奥行き・木や空は最寄りの床へ・「！」は近づいたときだけ・調べたら完全に消える・固定 4 か所の一言・その後も小さな発見が別の場所に出続ける・新しい足跡（四択前だけ・セーブ不変）・ガルド／戦闘への出口・セーブ不変・四択後の変化・動きを減らす設定・横画面 5 サイズで出口ボタンの後ろに立たない）、core `walkScene.test.ts`・`walkPlaces.test.ts`、App `roam.test.ts` | 歩き心地は実機で確認 |
| 古代遺跡（DEBUG。通常進行からは酒場のイベント後に地方図から） | `exploreRuins`（DEBUG 入口・2D タップ移動（手前／奥で大きさが変わる・壁や空は最寄りの床へ・ケイオスが同じ奥行きでついて来る・歩行中の再タップ・実際に少しずつ歩く）・「！」（最初は出ない・近づくと出る・調べたら完全に消える・同時に最大 2 個）・固定 3 ポイントの一言・3 つ調べた後も小さな発見が別の場所に出続ける（文章の重複なし・待つのは最大 2 つ）・ボタンでは歩かない・動きを減らす設定・世界を開かない・横画面 5 サイズ）、core `walkPlaces.test.ts`、App `roam.test.ts`・`walkPath.test.ts` | 通常進行からは酒場マスターのイベント後に入れる（`sekiryuga`）。森は従来の右→左のまま |
| 古代遺跡の発見の格・虹装備（DEBUG） | `exploreRareFinds`（NORMAL → 金色 → 虹 → 取得の光・名前・説明 → セーブ → 再起動 → 所持したまま装備できる → 同じ遺跡で虹が二度と出ない・有効訪問は 3 つ目の発見で 1 回だけ数える・セーブが無いときは何も作らず「記録されません」）、core `explorationState.test.ts`・`equipment.test.ts`、App `roam.test.ts`（確率・8 回目の確定） | 戦闘への性能反映は 2026-10-07 から（下の「星紋の遺剣（戦闘）」） |
| セキリュウガ編（噂 → 酒場 → 古代遺跡 → BOSS → 戦闘後） | `sekiryuga`（16 本：四択 4 つそれぞれで村へ戻り噂が始まる・ガルド前は噂も遺跡も無い・道具屋の噂 → 酒場で自動開始 → 遺跡解放・マスター本人の噂からそのまま続く・地方図から遺跡（タップ移動・奥行き・調査で「！」が消える）・接近 → BGM 停止 → 地響き → 登場 → BOSS 戦 → 戦闘後（結果画面なし・死亡表現なし）→ WORLD MEMORY 不変 → 再起動後も保持・逃走／引き返す・咆哮の予告と防御・横画面 5 サイズ）、core `storyArc.test.ts`・`sekiryugaBattle.test.ts`（実測）・`sekiryugaArc.test.ts`、App `sekiryugaRoute.test.ts` | 全文・数値は `docs/SEKIRYUGA_ROUTE.md` |
| 探索アイテム・道具屋（拾う → 持ち物 → 買う／売る） | `items`（9 本：森で拾う・通知・取得済みは再訪／再起動後も出ない・持ち物の棚・遺跡の古代の破片（特別な通知・売れない）・買う／LUMI 不足・売る／0 個で行が消える・再起動後の保持・横画面 5 サイズで全ポイントへ歩けて調べられる）、core `pickups.test.ts`（world・content） | 内容は `docs/ITEMS_SHOP.md`。配置量・光り方は実機で確認 |
| 戦闘開始 | `regression`、`attack`、`battleStage`（配置） | |
| 逃走 | `escape`（森が戦闘前と同じ：立ち位置・調べ済み・小発見・一言、HP/MP・薬草・EXP・LUMI が戦闘前のまま、逃走音、地図から入り直すと最初から、ガルド戦には逃走が無い） | |
| 戦闘の効果音（App） | `battleSounds`（斬撃 → 命中の順・ピッチの揺らぎ、モンスター＝重い打撃、ガルド＝ナイフ・ボスヒット・被弾、撃破、彗星撃／癒しの光／星光弾の各段、ゼロ・レヴィ・アリアの必殺技の段、×2 でレヴィの槍が半分）、App 単体 `battleSounds.test.ts`、core `sfxTuning.test.ts`・`sfxFiles.test.ts`。割り当て表は `docs/BATTLE_SE.md` | 実際の音量・聞こえ方は実機で確認。Artifact には効果音が入らないこと（`check-build-audio`） |
| 勝利 | `regression`、`loop`（経験値・LUMI・レベル・アイテム名）、`attack`「beaten, it goes down…」 | |
| CUT-IN | `regression`（本編）、`magic`（本編の全 5 魔法）、`cutin`（DEBUG プレビュー） | |
| 四択 | `regression`、`gald`（4 択の表示・1 回限り・再起動後も保持） | 4 つのうち本編で通すのは SPARE。残り 3 つの結果は core の単体テスト |
| WORLD MEMORY 保存 | `regression`、`memory`（記録の中身・日付・場所・人物・重み、再起動） | |
| TIME SHIFT 特殊イベント | `regression`、`memory`「the look ahead costs the world nothing」ほか 7 本 | 時間が進まない・途中で終えたら再起動後にまた出る・終えたら二度と出ない |
| 未来 CG（ガルド） | `futureCg`（TIME SHIFT は選んだ未来の 1 枚だけ・4 ルート、場所に入ったらその場所の CG・4 ルート、横画面 5 サイズで CG が欠けず「つづける」が画面内）、App 単体 `futureVision.test.ts`・`eventCg.test.ts` | 高さの低い画面（640×300）では TIME SHIFT の本文だけが縦スクロールし、「つづける」は常に画面内 |
| ステータス画面 | `regression`、`status`（11 本、Android 横画面 6 サイズでのスクロール含む・スキル欄（《瞬断》の威力と再使用・ケイオスは未習得・NEW は開いただけでは消えず、スキルを開いて確認した時に消える））、`equipment`、core `heroSkills.test.ts` | |
| 星紋の遺剣（戦闘） | core `relicSword.test.ts`（未装備・装備・装備解除後・+2・先手の一閃 ×1.25・1 回だけで二重にかからない・HP 満タンでない時はかからない・《瞬断》と重なる時は ×2 の後に ×1.25・無い戦闘の状態は以前と同じ）、`equipment.test.ts`、`exploreRareFinds`（装備一覧に「攻撃 +2」） | 内容は `docs/UX_EARLY_GAME.md`「実装メイン⑥ PHASE 1」 |
| NPC DEPLOY プレビュー | `forgeImport`（取り込み・差分・実機確認） | 書き込み先は content（セーブではない） |
| NPC DEPLOY 検証 | `forgeImport`「A2 / A6…」「C7 / D4 / D6…」（事前検証 PASS/WARNING/ERROR を含む）、core `forge/preflight.test.ts`・`forge/validate.test.ts` | |

## 自動化していない（手で確認するもの）

- **実機の音**：Android で実際に鳴るか・音量・最初のタッチで鳴り始めるか。自動テストは「どの曲・どの効果音を頼んだか」までで、スピーカーの出力は見られない。
- **実機の画面端**：切り欠き・ジェスチャーバーとの重なり（`docs/BATTLE_AUDIT_2026-10.md`）。

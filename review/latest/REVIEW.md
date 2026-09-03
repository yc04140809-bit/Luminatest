# MUGEN REVIEW PACKAGE — EXPLORATION EXPERIENCE v0.2 — GREENWOOD FOREST

- Generated: 2026-09-03T15:56:49.948Z
- Commit: ff4abd9 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: ff4abd9
- Verdict: SOMETHING FAILED — see 5

## 1. 実装前 → 実装後の変更点

**API 500 の直前まで、探索の実装は1行も入っていませんでした。**
作業ツリーはクリーン、HEAD は `ff4abd9`、未 push なし、
壊れたファイル・書きかけのファイルなし、型検査と unit も通過。
つまり中断された作業は無く、指示書の全項目が未実装の状態から始めています。

**今回実装したもの（GREENWOOD FOREST のみ）**

1. **主人公ミニキャラ** — 白い胴体＋クリーム色の丸頭（＝てるてる坊主）を廃止し、
   キャラクターマスター準拠へ：暗い髪、暗いボロのマント（裾がぎざぎざの polygon）、
   その下に見える**明るいインナー**、暗いズボン、茶色のブーツ、影。
   周囲に淡いリムを1本入れて、暗い森の地面に沈まないようにしています。
   サイズは 1.25 → 1.85 倍（髪・マント・服・向きが判別できる大きさ）。
2. **黒丸＋「！」を削除** — Debug UI に見えるマーカーを完全に撤去。
3. **世界に溶けた発見の気配** — 地面に落ちた暖かい光、閉じきらない**金の輪**（内外2本）、
   数秒ごとに広がる**記憶の波紋**、ゆっくり昇る**光の粒**2つ。
   アイコンも文字も種類表示もありません。
4. **発見の瞬間** — 到達時に金の輪が一度だけ外へ広がる（260ms）。その後は既存の
   フェード→遭遇へ。演出時間は従来と同じです。
5. **UI を減らした** — Phaser 上に置いていた黒背景のテキストチップ2つ
   （「タップした場所へ移動」「森は、静かだ。」）を撤去し、React 側の静かな1行へ。
   場所名は Location Introduction（英字＋明朝＋金の細線）に。
   「森を出る」は罫線つきのテキストリンク＝Secondary Action へ。
6. **将来構造** — 発見地点を `DiscoveryPointDef[]`（id / 座標 / 半径 / kind）に。
   kind は event / battle / item / npc / memory / secret を取れますが、
   **今日はすべて同じ見た目で描画**します（§21：報酬の種類を先に教えない）。
   主人公は今も Container なので、Sprite シートへの差し替えで移動コードは無変更。
7. **prefers-reduced-motion 対応** — Phaser は CSS を読まないので、設定の
   `data-reduced-motion` と OS 設定の両方を React 側で読み、シーンへ渡しています。
   動きを止めても「光」と「輪」は静止状態で残るので、気配は消えません。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T15:56:49.783Z / viewport 390x844

- `review/latest/01_greenwood_forest.png` — GREENWOOD / BATTLE：主人公が人に見えるか。発見の気配が世界に馴染んでいるか

撮影していない画面（変更なし。テスト結果で報告）:
- HOME — v0.2 で承認済み
- TAVERN / TALK — シーンアート修正版のまま
- TITLE — v0.1 のまま
- PROLOGUE / KAOS — v0.1 のまま
- EXPLORE — v0.1 のまま
- WORLD MEMORY — v0.1 のまま
- LIFE CHOICE / ENDING — v0.1 のまま
- PLAYTEST SURVEY — v0.1 のまま
- DEV REVIEW HUB — v0.1 のまま

## 3. 新規機能の動作確認結果

- 遭遇の判定・座標・速度・半径・発火条件は**一切変更していません**。
  E2E は canvas の (180/360, 120/520) をクリックして遭遇まで到達し、そのまま通過します。
- 森のアートは Phaser が原寸の色で描画。白く洗う処理は元から無く、今回も入れていません。

**E2E を1行だけ変更しました（正直に記載します）。**

`uxPolish.spec.ts` の3件（360 / 390 / 412px）が最初 FAIL しました。原因は、
森の「森を出る」を `.screen-footer .btn` という**構造セレクタ**で押していたためです。
今回このボタンは Secondary Action として `.field-foot` 配下へ移したので、
セレクタが一致しなくなりました。

対応は**テストの期待値を緩めるのではなく、ボタンに `data-testid="leave-forest"` を付け、
テストの操作行をその testid に変更**しました。テストの意図（森を出て HOME へ戻る）は
まったく同じで、以後は構造変更に強くなります。アサーション（横スクロール検査・
ボタンの座標検査）は1つも変えていません。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T15:56:49.367Z
- Build: MUGEN ZERO v0.1 / ff4abd9 / 2026-09-03T15:56:40.181Z
- Environment: dev server
- Result: no failed checks — 20 pass, 0 warn, 3 not tested, 1 manual

## CURRENT WORLD
- World time: 1年目 1日目 (day 1)
- Route: NONE
- TIME SHIFTs: 0
- WORLD MEMORY facts: 0
- LIFE ARCHIVE: 0 known / 0 in canon
- Future sites: ALDEN_BAKERY:not yet, GREENWOOD_WAYSTATION:not yet, ALDEN_WORKYARD:not yet, GREENWOOD_GRAVE:not yet

## CONTENT
- NOW events: 18
- NEXT events: 3
- LIFE events (experience layer): 0
- Locations: MOONLIGHT_TAVERN (11), ALDEN_VILLAGE (10)
- Narrative seeds: 3
- Rumours (events gated on a world fact): 8
- Events met in this world: 0

```

## 4. 既存機能への影響

**GREENWOOD 探索画面のみ。** Battle・HOME・酒場・World Memory・Navigation は無変更。
CSS は `.field-*` 名前空間に閉じています。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  278 passed (278) |
| E2E (playwright) | FAIL | 103 passed (7.4m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 7.11s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-C2wpoJOJ.js                    1.33 kB │ gzip:   0.76 kB
dist/assets/DevAdminScreen-25w6eqLs.js                  39.08 kB │ gzip:  13.12 kB
dist/assets/index-BfiKuFAe.js                          116.39 kB │ gzip:  34.74 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-Wgznnbe3.js              1,488.13 kB │ gzip: 342.53 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。**

## 8. Save compatibility

**セーブ互換に影響なし。**

## 9. 既知の問題

1. **【要アセット】探索用ミニキャラの正式スプライト。**
   現在は Phaser のプリミティブ（多角形・楕円・矩形）による暫定表現です。
   てるてる坊主感は消え、髪・マント・インナー・向きは判別できますが、
   **顔は描けていません**。指示 §6 に従い、無理な画像生成はしていません。
   必要なもの: IDLE / WALK UP / DOWN / LEFT / RIGHT の透過スプライト
   （キャラクターマスター下部のミニキャラ準拠）。
   差し替え先は `createTraveller()` 1メソッドで、移動コードは触りません。
2. **【テストの不安定さ・今回の変更とは無関係】** `phaseD.spec.ts`
   「full Phase D arc」が、**全体実行（2 worker）時のみ**まれに失敗します。
   落ちる場所は TIME SHIFT 画面の二重タップ待ち（`time-shift-go` を force で
   もう一度押した後、`time-shift-done` を10秒待つ箇所）で、森とは別の画面です。
   単体では 5/5 通過、全体実行でも通る回のほうが多い、負荷依存のタイミング問題です。
   HOME v0.2 の時点で既に発生しており、今回の探索実装が原因ではありません。
   テスト側の待ちを堅くすれば直りますが、今回のスコープ（探索1画面）外のため
   手を入れていません。**判断は人間にお願いします。**
3. 【継続】盗賊ガルドの立ち絵：右脚欠け（FULL BODY / TRANSPARENT / NO CROPPING）。
4. 【継続】敗北ガルドの立ち絵が切り抜きでない件。
5. 明朝フォントは OS 内蔵依存。

## 10. Claude 自身が気になる箇所

- **「大きさ」が最大の要因でした。** 形をキャラクターマスターに合わせても、
  1.25 倍のままでは地面の模様に溶けて「黒い塊」にしか見えませんでした。
  1.85 倍＋淡いリムで初めて人に見えます。逆に言えば、**正式スプライトが入るまでは
  サイズと輪郭で保たせている**状態です。
- **気配の強さは難しい判断です。** 弱いと気づかれず、強いとマーカーに戻ります。
  今は「言われれば分かるが、主張はしない」あたりに置きました。
  実プレイで「気づかれない」なら上げるべき値で、私の目では決められません。
- **発見の種類を隠す設計は、テストしづらい。** 何があるか分からないことが楽しさなので、
  正しさの確認はプレイヤーの反応でしかできません。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN EXPLORATION REVIEW。**

指示 §35 に従い停止します。他フィールド展開・Random Encounter・Item / NPC システム・
World Memory 変更・Battle 変更へは進みません。

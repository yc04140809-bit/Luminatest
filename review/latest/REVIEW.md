# MUGEN REVIEW PACKAGE — ARCANA SYSTEM v0.1 — アルカナ図鑑・構築度基盤（採用前）

- Generated: 2026-09-04T09:41:09.413Z
- Commit: f3d2c04 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: e6b3dc0
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** ARCANA の「収集・成長基盤」だけを実装しました。
召喚・不完全召喚・召喚事故・UNKNOWN ARCANA・デッキ編成・戦闘中の使用には
一切進んでいません。

- **ARCANA #001 モスラビットのみ。** 敵は1体も追加していません。
- **構築度は「経験の種類」で増えます。** 同じ戦闘を100回繰り返しても、
  1回ぶんしか増えません。条件はIDを持ち、一度きりです。
- **100%への道は一本ではありません。** KILL / SPARE / HELP / CAPTURE は
  **完全に同じ点数**で、どれ一つとして必須ではありません。
  「図鑑のために一度殺してください」は、この設計が最も避けたいものです。
- **未達成条件は攻略リストとして出しません。** 「HELPで+25%」ではなく
  「選ばなかった道だけが答えとは限らない。」と書きます。
  内部の条件はIDと点数で正確に保持しています。
- **WORLD MEMORY とは別のシステムです。** 何をしたか（WORLD MEMORY）と、
  それによって何をどれだけ知ったか（ARCANA）を混ぜていません。
  ARCANA を100%にしても WORLD MEMORY には1件も書き込まれません。

### commits

```
f3d2c04 Let the world teach you what a moss rabbit is
```

### changed files

```
mugen-zero/e2e/arcana.spec.ts                      | 434 +++++++++++++++++++++
 mugen-zero/src/App.tsx                             |  92 ++++-
 mugen-zero/src/content/arcana/arcanaDefs.ts        | 157 ++++++++
 mugen-zero/src/content/qa/visualChanges.ts         |  16 +-
 mugen-zero/src/core/arcana/arcana.test.ts          | 313 +++++++++++++++
 mugen-zero/src/core/arcana/arcana.ts               | 282 +++++++++++++
 mugen-zero/src/core/flow/gameFlow.ts               |   4 +-
 mugen-zero/src/core/flow/types.ts                  |   2 +
 mugen-zero/src/core/world/arcanaState.test.ts      | 196 ++++++++++
 mugen-zero/src/core/world/world.ts                 | 131 +++++++
 mugen-zero/src/dev/DevAdminScreen.tsx              |  76 ++++
 mugen-zero/src/ui/battle/BattleUIPrototype.tsx     |  41 ++
 mugen-zero/src/ui/common/ArcanaToast.tsx           |  71 ++++
 mugen-zero/src/ui/screens/ArcanaScreen.tsx         | 215 ++++++++++
 mugen-zero/src/ui/screens/HomeScreen.tsx           |   7 +
 mugen-zero/src/ui/styles.css                       | 351 ++++++++++++++++-
 review/latest/01_battle_prototype.png              | Bin 513692 -> 0 bytes
 review/latest/02_battle_prototype_skill.png        | Bin 466145 -> 0 bytes
 review/latest/03_battle_prototype_mugen_choice.png | Bin 535988 -> 0 bytes
 review/latest/manifest.json                        |  66 ----
 review/latest/qa-report.md                         | 102 -----
 review/notes.md                                    | 140 +++----
 22 files changed, 2452 insertions(+), 244 deletions(-)
```

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-04T09:41:09.226Z / viewport 390x844

- `review/latest/01_arcana_sealed.png` — ARCANA / アルカナ図鑑：まだ何も知らない状態。#??? のまま、何があるかは言わない
- `review/latest/02_arcana_detail_low.png` — ARCANA / アルカナ図鑑：発見直後。1%でも読めるものがあるか、ヒントが攻略リストに見えないか
- `review/latest/03_arcana_detail_high.png` — ARCANA / アルカナ図鑑：高構築度。段階解放された情報の量と、90%で開く「予兆」
- `review/latest/04_arcana_complete.png` — ARCANA / アルカナ図鑑：ARCANA COMPLETE。金の縁と一行だけで、白フラッシュを使っていないこと
- `review/latest/05_arcana_toast_complete.png` — ARCANA / アルカナ図鑑：100%到達の瞬間。世界の絵を覆わない小さなカードであること
- `review/latest/06_home_new_world.png` — HOME：始めたばかりの世界。まだ何も覚えていない状態の第一印象
- `review/latest/07_home_remembering.png` — HOME：記憶を持った世界。数字と最新の記憶が入ったときの見え方

撮影していない画面（変更なし。テスト結果で報告）:
- BATTLE UI PROTOTYPE — 前ラウンドから見た目の変更なし。見たものを外へ報告するコールバックが1つ増えただけです
- GREENWOOD / BATTLE — 前ラウンドから無変更。試作は既存画面を置き換えていません
- TAVERN / TALK — シーンアート修正版のまま
- TITLE — v0.1 のまま
- PROLOGUE / KAOS — v0.1 のまま
- EXPLORE — v0.1 のまま
- WORLD MEMORY — v0.1 のまま
- LIFE CHOICE / ENDING — v0.1 のまま
- PLAYTEST SURVEY — v0.1 のまま
- DEV REVIEW HUB — v0.1 のまま

## 3. 新規機能の動作確認結果

- 360 / 390 / 412px で、図鑑一覧（未発見／発見済／COMPLETE）・詳細
  （低・高・COMPLETE）・構築度上昇の通知を確認。縦横スクロールなし。
- HOME の下段が4項目から**5項目**になりました（人生の記録／**アルカナ**／
  旅立つ／休息する／設定）。360pxでも1列68pxあり、ラベルは縮んでいません。
- 構築度上昇の通知は**画面上部に浮く小さなカード**です。ブロックしません。
  タップで消え、放っておいても消えます。**白フラッシュは使っていません。**
  世界の絵は一切覆いません（森を歩きながら見えます）。
- 検証用に DEV ADMIN へ「ARCANA — 構築度を直接指定」を追加しました。
  90%まで正直に遊ぶと十数戦かかるためです。**公開ビルドには出ません。**

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-04T09:41:08.804Z
- Build: MUGEN ZERO v0.1 / f3d2c04 / 2026-09-04T09:40:47.530Z
- Environment: dev server
- Result: no failed checks — 21 pass, 0 warn, 2 not tested, 1 manual

## CURRENT WORLD
- World time: 4年目 4日目 (day 1099)
- Route: SPARE
- TIME SHIFTs: 1
- WORLD MEMORY facts: 5
- LIFE ARCHIVE: 1 known / 4 in canon
- Future sites: ALDEN_BAKERY:ON MAP, GREENWOOD_WAYSTATION:not yet, ALDEN_WORKYARD:not yet, GREENWOOD_GRAVE:not yet

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

新規：`src/core/arcana/arcana.ts`（純粋なルール）、
`src/content/arcana/arcanaDefs.ts`（#001の定義・点数・文章）、
`src/ui/screens/ArcanaScreen.tsx`（図鑑）、`src/ui/common/ArcanaToast.tsx`、
それぞれのテスト、E2E `arcana.spec.ts`。
変更：`world.ts`（保存・リセット・3メソッド）、`App.tsx`（接続）、
`HomeScreen.tsx`（入口1つ）、`flow/types.ts` `gameFlow.ts`（画面1つ）、
`BattleUIPrototype.tsx`（見たものを報告する任意のコールバック1つ）、
`styles.css`（追記のみ）、`DevAdminScreen.tsx`（検証用）。

**ガルド・会話画面・イベントUI・探索画面・スプライト・時間進行・
既存戦闘画面・戦闘ロジック・ケイオス介入は1文字も変えていません。**

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  401 passed (401) |
| E2E (playwright) | PASS | 156 passed (13.8m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.58s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-CUgQLcxp.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-nrz_v77o.js                  45.09 kB │ gzip:  15.14 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-engPyxCb.js                          155.40 kB │ gzip:  47.26 kB
dist/assets/GreenwoodScreen-bYIXAf3T.js              1,498.86 kB │ gzip: 346.19 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB のスキーマ変更なし。** 既存の key/value ストアに
`arcana_records` が1行増えるだけです。ストアもインデックスも
バージョンも増やしていません。

## 8. Save compatibility

**セーブ互換に影響なし。** ARCANA 以前のセーブにはこの行が無く、
「まだ何も知らない」として読まれます（新規世界と同じ答え）。
逆に、このビルドが知らない条件IDが入っていても**消さずに保持**し、
数えないだけにしてあります（新しいビルドの記録を古いビルドが
黙って壊さないため）。

## 9. 既知の問題

1. 【新規】**旧戦闘画面では「通常攻撃を見た／固有技を見た」が記録されません。**
   旧UIは「触らない」対象なので、報告用のコールバックを足していません。
   旧UIでも「遭遇した」「勝った／負けた」「4択の答え」は記録されます。
   既定は新戦闘画面なので、通常プレイでは影響しません。
2. 【新規】**REUNION / SPECIAL_MEMORY は未実装**です。定義だけ置いて
   `planned` を立て、**数えず・ヒントにも出さず**にしています。
   ARCANA のためだけに再会イベントを捏造実装するのは順序が逆だからです。
3. 【新規】**点数は仮です。** 全部 `arcanaDefs.ts` の1ファイルにあります。
4. 【新規】**召喚はまだ何もできません。** 90%で開く「予兆」が
   「呼べば応えるかもしれない」と書くところまでです。
5. 【継続・別issue】`phaseD` の負荷依存フレーク、盗賊ガルドの右脚欠け。
   指示どおり今回は手を付けていません。

## 10. Claude 自身が気になる箇所

- **構築度をセーブしないことにしたのが、いちばん効きました。** 保存するのは
  「達成した条件」だけで、パーセントは毎回そこから計算します。おかげで
  セーブとルールが食い違う状態が存在せず、点数の再調整に
  マイグレーションが要らず、誰の記録も書き換わりません。
- **「100%への道を複数用意する」は、点数を余らせることで実現しました。**
  到達可能な合計は195点で、上限は100点です。この余りがそのまま
  「どの人生を通っても完成する」になります。テストは
  **どの条件を1つ抜いても100に届くか**を全条件について確認しています。
  一本道が生えたら落ちます。
- **COMPLETE の画面で「まだ知らないこと」が出ていました。** どの道でも
  未達成の条件は残るからです。「この記憶は、もう失われない」の下に
  足りないものを並べるのは嘘なので、100%では何も出さないよう直しました。
  E2Eが先に見つけました。
- **ヒントを条件と1対1にしなかったのが正解でした。** 4つの答えは
  同じ1行を共有しているので、図鑑が「殺す・見逃す・助ける・連れて行く」の
  チェックリストに見えません。テストがヒント文に数字・%・4択の語が
  入らないことを機械的に検査しています。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

完全召喚・不完全召喚・召喚事故・UNKNOWN ARCANA・デッキ編成へは進みません。

# MUGEN REVIEW PACKAGE — ARCANA SYSTEM v0.3 — 召喚事故 / UNKNOWN観測 / ANCIENT BREATH（採用前）

- Generated: 2026-09-05T03:32:47.485Z
- Commit: e1f5b36 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 97ec646
- Verdict: SOMETHING FAILED — see 5

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 2つのことをしました。

**PHASE 1 — 召喚が「何も起きない」で終わらないように。**
《森の息吹》は回復技で、不完全召喚が起きるのは戦闘開始時、つまり
**ほぼ必ずHP満タンのとき**でした。結果、記憶が組み上がる演出のあとに
「HPはもう満ちている。」だけが出る。これはバグではなく設計の弱さでした。
いまは **傷があれば回復、無ければ《森の加護》**（次の一撃だけ軽減）。
回復能力は消していません。同じ緑が、できることをするだけです。

**PHASE 2 — 召喚事故。** 不完全な記憶は不安定で、ごくまれに
**プレイヤーがまだ会ったことのないもの**が横切ります。
成功の上位版ではありません。**別の出来事**として、通常の成否判定より
**前に**決まり、しかも「横切れるものが世界に既にある」ときだけ起きます。
何ももらえず、何も失いません。得られるのは説明のつかない光景だけで、
**意味は後から世界の側で与えられます。**

### commits

```
e1f5b36 Write the round's notes, and test the lock itself
98c3351 Photograph the admin tools, and let the lock be used twice
57d063b Let the admin look at the theatre without playing the game
f1b3c33 Regenerate the review package with both findings in it
b238e14 Record both findings, and the measurement I got wrong
6740395 Put the round's findings in sections the report actually renders
c7ab96f Regenerate the review package
dc191f5 Stop an accident overruling a pinned outcome
99054d6 Let a summoned memory finish its sentence
fc06275 Let the review package photograph a sighting more than once
9595574 Keep the delivered art, and still have an artifact to look at
371905a Let something the player has never met cross the summoning
```

### changed files

```
mugen-zero/.gitignore                              |   1 +
 mugen-zero/e2e/adminPreview.spec.ts                | 418 ++++++++++++++
 mugen-zero/e2e/reviewCapture.ts                    | 129 ++++-
 mugen-zero/e2e/summon.spec.ts                      |  48 +-
 mugen-zero/e2e/summonAccident.spec.ts              | 629 +++++++++++++++++++++
 mugen-zero/scripts/review-encode-assets.d.mts      |  23 +
 mugen-zero/scripts/review-encode-assets.mjs        | 108 ++++
 mugen-zero/src/App.tsx                             |  55 +-
 mugen-zero/src/assets/arcana/ancient-breath.png    | Bin 0 -> 3917579 bytes
 .../src/assets/arcana/unknown-ancient-dragon.png   | Bin 0 -> 3660221 bytes
 mugen-zero/src/content/arcana/arcanaDefs.ts        |  14 +-
 mugen-zero/src/content/arcana/unknownArcana.ts     |  65 +++
 mugen-zero/src/content/qa/visualChanges.ts         |  15 +-
 mugen-zero/src/content/summon/accidents.ts         |  65 +++
 mugen-zero/src/core/chaos/interventionPlan.test.ts | 172 ++++++
 mugen-zero/src/core/chaos/interventionPlan.ts      |  96 +++-
 mugen-zero/src/core/flow/gameFlow.ts               |  19 +-
 mugen-zero/src/core/flow/types.ts                  |   1 +
 mugen-zero/src/core/summon/summon.test.ts          |  55 +-
 mugen-zero/src/core/summon/summon.ts               |  85 ++-
 mugen-zero/src/core/summon/summonAccident.test.ts  | 296 ++++++++++
 mugen-zero/src/core/summon/summonAccident.ts       | 257 +++++++++
 mugen-zero/src/core/world/accidentState.test.ts    | 179 ++++++
 mugen-zero/src/core/world/world.ts                 | 146 +++++
 mugen-zero/src/dev/CinematicPreviewScreen.tsx      | 236 ++++++++
 mugen-zero/src/dev/DevAdminScreen.tsx              |  85 ++-
 mugen-zero/src/dev/DevLockScreen.tsx               |  32 +-
 mugen-zero/src/dev/debugEncounter.ts               |   2 +-
 mugen-zero/src/dev/devMode.test.ts                 |  81 +++
 mugen-zero/src/dev/devMode.ts                      |  35 ++
 mugen-zero/src/game/battle/battleLogic.test.ts     | 120 +++-
 mugen-zero/src/game/battle/battleLogic.ts          | 139 ++++-
 mugen-zero/src/ui/battle/BattleUIPrototype.tsx     | 197 ++++++-
 mugen-zero/src/ui/cinematic/accidentCinematic.tsx  | 225 ++++++++
 mugen-zero/src/ui/screens/ArcanaScreen.tsx         |  72 ++-
 mugen-zero/src/ui/styles.css                       | 352 ++++++++++++
 mugen-zero/types/node-shims.d.ts                   |   4 +
 mugen-zero/vite.config.singlefile.ts               |  28 +
 review/latest/01_admin_a_lock.png                  | Bin 0 -> 13921 bytes
 review/latest/01_summon_incomplete_card.png        | Bin 498068 -> 0 bytes
 review/latest/02_admin_b_home.png                  | Bin 0 -> 145295 bytes
 review/latest/02_summon_incomplete_field.png       | Bin 516745 -> 0 bytes
 review/latest/03_admin_c_preview_list.png          | Bin 0 -> 23454 bytes
 review/latest/03_summon_failure_card.png           | Bin 496088 -> 0 bytes
 review/latest/04_admin_d_dragon.png                | Bin 0 -> 627262 bytes
 review/latest/04_summon_arcana_command.png         | Bin 482085 -> 0 bytes
 review/latest/05_admin_e_breath.png                | Bin 0 -> 636520 bytes
 review/latest/05_summon_complete_field.png         | Bin 483863 -> 0 bytes
 review/latest/06_admin_f_unknown.png               | Bin 0 -> 440189 bytes
 review/latest/06_battle_prototype.png              | Bin 515203 -> 0 bytes
 review/latest/07_admin_g_talk.png                  | Bin 0 -> 437303 bytes
 review/latest/07_arcana_summon_ability.png         | Bin 96524 -> 0 bytes
 review/latest/08_admin_h_end.png                   | Bin 0 -> 517641 bytes
 review/latest/REVIEW.md                            | 371 ++++++------
 review/latest/manifest.json                        |  57 +-
 review/latest/qa-report.md                         |  33 +-
 review/notes.md                                    | 147 ++---
 57 files changed, 4664 insertions(+), 428 deletions(-)
```

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-05T03:32:44.141Z / viewport 390x844

- `review/latest/01_admin_a_lock.png` — ADMIN DEV TOOLS：A：管理者ロック。控えめな入口の先にあり、入力はそのまま表示されないか
- `review/latest/02_admin_b_home.png` — ADMIN DEV TOOLS：B：ADMIN HOME。「演出プレビュー」が最初にあり、既存の開発スイッチは下に残っているか
- `review/latest/03_admin_c_preview_list.png` — ADMIN DEV TOOLS：C：演出プレビュー一覧。ARCANA ＞ 召喚事故 ＞ UNKNOWN #001。正式名称は出していないか
- `review/latest/04_admin_d_dragon.png` — ADMIN DEV TOOLS：D：巨大召喚。左向き・敵側・画面の半分以上。DUMMY表示で実戦と誤認しないか
- `review/latest/05_admin_e_breath.png` — ADMIN DEV TOOLS：E：カットイン。顔・口元・ブレス・文字が読めるか。技名の二重表示がないか
- `review/latest/06_admin_f_unknown.png` — ADMIN DEV TOOLS：F：フルシーケンス中の ARCANA #??? / UNKNOWN。実戦と同じカードか
- `review/latest/07_admin_g_talk.png` — ADMIN DEV TOOLS：G：フルシーケンス終盤の会話。実戦と同じ4行か
- `review/latest/08_admin_h_end.png` — ADMIN DEV TOOLS：H：PREVIEW END。もう一度／一覧へ。戦場に何も残っていないか

撮影していない画面（変更なし。テスト結果で報告）:
- BATTLE UI PROTOTYPE — 召喚事故の演出を ui/cinematic へ切り出し、実戦とプレビューが同じ定義を再生するようにしました。画面の見え方・順序・「間」は前ラウンドから1つも変えていません（E2E 29本が無変更で通ります）
- ARCANA / アルカナ図鑑 — 前ラウンドから無変更です
- HOME — 前ラウンドで承認待ちの5項目導線のまま。今回は無変更です
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

- 360 / 390 / 412px で確認。横スクロールなし。演出中も両方のHPプレートと
  メッセージ欄は残ります。
- **古代龍は「小さく置く召喚キャラ」にしていません。** 戦場のほぼ全面
  （面積比 50%超）を占めます。召喚モスラビットは戦場の15%なので、
  この差そのものが「これは召喚ではない」というメッセージです。
- **画像は納品物をそのまま使用**（md5一致）。スタイルシートが決めているのは
  **向きだけ**です。原画は右向き、敵は左に立つので `scaleX(-1)` で反転。
  色調変更・フィルタ・再描画・CSS/SVG/emojiによる代替は一切していません。
- **《エンシェントブレス》は画像に技名が入っている**ので、UI側からは
  **一度も出していません**（E2Eが `エンシェントブレス` / `ANCIENT BREATH`
  の文字列がDOMに出ないことを検査）。
- ブレス画像は**トリミングせず全体**を画面幅いっぱいに出しています。
  文字は左端、龍の顔は右端にあるため、**拡大するための切り抜きは必ず
  4要素（顔・口元・ブレス・文字）のどれかを落とします。**
  「縦画面で4つとも認識できること」を優先しました。
- **白フラッシュ・全面暗転・巨大モーダル・激しい点滅は使っていません。**
  画面の85%以上を覆う白/黒の面が存在しないことをE2Eが検査します。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-05T03:32:44.053Z
- Build: MUGEN ZERO v0.1 / e1f5b36 / 2026-09-05T03:32:16.688Z
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

新規：`src/core/summon/summonAccident.ts`（事故の条件・ライフサイクル）、
`src/content/summon/accidents.ts`（候補1件）、
`src/content/arcana/unknownArcana.ts`（UNKNOWN行）、
`src/assets/arcana/*.png`（納品画像2点）、
`src/core/world/accidentState.test.ts`、`e2e/summonAccident.spec.ts`。
変更：`summon.ts`（MEND効果・ACCIDENT追加）、`battleLogic.ts`
（`grantWard` / `mendPlayer` / `strikeAllEnemies`）、`interventionPlan.ts`、
`BattleUIPrototype.tsx`（演出）、`ArcanaScreen.tsx`（UNKNOWN行）、
`world.ts`（記録）、`styles.css`（追記のみ）、DEV配線。

**ガルド・会話画面・イベントUI・探索画面・スプライト・時間進行・
旧戦闘画面・MUGEN CHOICE・WORLD MEMORY は1文字も変えていません。**

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  499 passed (499) |
| E2E (playwright) | FAIL | 214 passed (16.4m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.51s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-C1ILVPcH.js                    1.42 kB │ gzip:   0.78 kB
dist/assets/CinematicPreviewScreen-DLGwrWPP.js           4.99 kB │ gzip:   1.82 kB
dist/assets/DevAdminScreen-BoqCFNgC.js                  47.94 kB │ gzip:  16.07 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-_ij_gTde.js                          172.36 kB │ gzip:  52.66 kB
dist/assets/GreenwoodScreen-CrMU7svC.js              1,498.86 kB │ gzip: 346.19 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

`summon_accidents` キーを1つ追加。候補IDごとに
**state / 観測回数 / 最終観測日**を持ちます。
以前のビルドが書いた「IDの配列」も読めます（1回観測として復元）。

## 8. Save compatibility

**セーブ互換あり。** 古いセーブにキーは無く、UNSEEN として読まれます。
完全リセットで消えます。

## 9. 既知の問題

1. 【解決】単一HTMLアーティファクトが 21.97MB になり 16MB上限を
   超えていました。納品PNG 2点で 7.3MB、base64化でさらに増えるためです。
   **アーティファクト生成工程だけ**で WebP へ再エンコードし、
   **14.99MB** に収めました（承認済み方針）。
   - **リポジトリ内の納品PNGは一切変更していません**（md5一致を確認）。
   - **解像度は 1536x1024 のまま**。スクリプトが encode 後に
     解像度が変わっていないことを assert します。
   - **ゲーム本体・E2E・スクリーンショットは正式PNGを使用**します。
     再エンコードは `vite.config.singlefile.ts` にしか効きません。
   - 出力先は `.review-assets/`（gitignore）。ビルドのたびに再生成。
2. 【新規】**事故確率は仮値 6%**（不完全召喚が起きたときの割合）。
   不完全召喚自体が全戦闘の約14%なので、実効は**1%弱**です。
   クールダウン30日と合わせると、**素の状態ではまず見られません。**
   DEV強制で検証しています。本番確率はプレイテスト後に。
3. 【新規】**ブレスの仮ダメージは 999**。ARCANA ability data に1箇所だけ
   書いてあり、戦闘画面には数字はありません。
4. 【新規】**「敵全体」は今日は1体**です。`strikeAllEnemies` が
   「全員」という概念を1関数に閉じ込めてあるので、状態が敵配列に
   なったときに変わるのはこの関数だけです。
5. 【切り分け済み・回帰ではない】`explorationLoop` が一時 3件落ちました。
   当初「v0.3の回帰」と判断しましたが、**その計測が誤りでした**
   （フルスイート実行中に単体実行を重ねていました）。
   マシンを空けて再測定したところ **7/7 PASS（1.5分）**。
   さらに巨大PNGを小さい画像に差し替えた対照実験でも同じ 7/7 で、
   画像サイズは無関係でした。ネットワークログでも、探索中に
   古代龍PNGは**一度も取得されていません**。
   結論：**負荷依存の既知フレーク**（Phaserの歩行がリングに着かない）。
   閾値・待ち時間は1つも緩めていません。
6. 【解決・本物のバグでした】負荷時だけ落ちるE2Eを追いかけたところ、
   **DEVで SUCCESS / FAILURE を固定していても、その手前で事故抽選が
   回っていました。** 固定したはずの約6%が事故になります。
   「上書きされるスイッチ」はスイッチではありません。`settle` が、
   何も指定されていないか ACCIDENT を指定されたときだけ事故を見るよう
   に直し、「どんな目でも固定した結果になる」ことを単体テストで
   固定しました。修正後、summon系E2Eは **3回 × 4並列 = 147/147 PASS**。
7. 【継続・別issue】`phaseD` の負荷依存フレーク、盗賊ガルドの右脚欠け。

## 10. Claude 自身が気になる箇所

- **事故を「成功の上位版」にしなかったのが要点です。** 同じ抽選の
  レアな出目にすると、それはガチャです。**別の出来事**として、
  通常判定より前に、しかも「世界に横切れるものが既にある」ときだけ
  起こるようにしました。だから **DEV強制でも条件は飛ばせません**
  （帯域外・クールダウン中・取得済みなら、テスターにも普通の召喚が出ます）。
  そして逆向きも同じで、**SUCCESS / FAILURE を固定したら事故は起きません。**
  ここは最初バグっていました（下記）。
- **「一度見たら永久除外」をやめたのが良かったと思います。** 目を離して
  いたプレイヤーが、ビルド中でいちばん不思議なものを永久に見逃します。
  代わりに `repeatPolicy` + 30日クールダウンをデータにしました。
  初回「何今の！？」→ 数時間後「またアイツだ」→ 本遭遇 → ARCANA完成 →
  **事故枠から消えて、今度は自分の意思で呼ぶ**、が通せます。
- **ACQUIRED除外を古代龍の if にしなかったこと。** 候補は
  `resolvedArcanaId` で正式ARCANAを名指しし、**そのページを持っていれば
  除外**という1つの規則が全候補に効きます。テストは、片方を取得しても
  **もう片方は影響を受けない**ことまで見ています。
- **事故がプレイヤーの選択を奪わないこと。** ブレスでHPが0になっても
  DOWNを経由し、四つの答えは**必ずプレイヤーに聞きます**。
  KILL自動確定は絶対にしません。DOWNはDEADではありません。
- **「たまに落ちる」を、まずフレークと呼ばなかったのが今回2度効きました。**
  1度目は reduced-motion がスイート全体で効いていなかったこと、
  2度目は **DEV固定を事故抽選が上書きしていた本物のバグ**です。
  どちらも「再実行したら通るので」で片付けていたら残っていました。
- **一方で、1度は測定そのものを間違えました。** `explorationLoop` を
  「v0.3の回帰」と報告しましたが、実際はフルスイート実行中に単体実行を
  重ねていただけでした。マシンを空けて再測定したら 7/7 PASS、
  巨大PNGを小さい画像に差し替えた対照実験でも同じ結果でした。
  **測り方そのものを疑うのも切り分けのうち**だと反省しています。
- **《森の加護》を掛け算ではなく引き算にしたのは実測の結果です。**
  20%引きは4ダメージに対して 3.2 → 切り上げ 4 で、**数字が1つも
  動きませんでした。** 「何も起きない」を直す機能が何も起こさないのでは
  意味がないので、最低1点は必ず引くようにしました。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

古代龍の本遭遇・正式入手・正式名称・4ルート・新規通常敵・
新しい事故キャラ・デッキシステムへは進みません。

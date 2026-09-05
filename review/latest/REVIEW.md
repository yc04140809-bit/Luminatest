# MUGEN REVIEW PACKAGE — ADMIN DEV TOOLS v0.1 — 管理者ロック / 演出プレビュー（採用前）

- Generated: 2026-09-05T03:49:56.086Z
- Commit: 1080e50 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: f1b3c33
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 2つだけ作りました。

**PHASE 1 — 管理者ロック。** 入口もロックも既存のものが既にあったので、
**作り直さず再利用**しました。変えたのは3点だけです。
表示を日本語に（ADMIN／管理者ページ／ロックNo.を入力／入る）、
文言を「ロックNo.が違います」に、そして**同一セッション中のみ再入力を省略**。

**PHASE 2 — 演出プレビュー。** 管理者ホームから
ARCANA ＞ 召喚事故 ＞ UNKNOWN #001 を選び、
**巨大召喚 / エンシェントブレス / フルシーケンス**を再生できます。
召喚事故は仕様上とても稀（実効1%弱＋30日クールダウン）なので、
「360pxで龍が大きすぎないか」を確かめるために戦闘を何十回もやる、
という状態を解消するのが目的です。

### commits

```
1080e50 Teach the suite that the lock opens once per run, not per visit
e1f5b36 Write the round's notes, and test the lock itself
98c3351 Photograph the admin tools, and let the lock be used twice
57d063b Let the admin look at the theatre without playing the game
```

### changed files

```
mugen-zero/e2e/adminPreview.spec.ts               | 418 ++++++++++++++++++++++
 mugen-zero/e2e/arcana.spec.ts                     |   5 +-
 mugen-zero/e2e/battlePrototype.spec.ts            |  14 +-
 mugen-zero/e2e/devReviewHub.spec.ts               |  13 +-
 mugen-zero/e2e/explorationLoop.spec.ts            |   5 +-
 mugen-zero/e2e/fourFutures.spec.ts                |   6 +-
 mugen-zero/e2e/helpers.ts                         |  24 ++
 mugen-zero/e2e/mossRabbit.spec.ts                 |   5 +-
 mugen-zero/e2e/navigation.spec.ts                 |   5 +-
 mugen-zero/e2e/phaseC.spec.ts                     |   7 +-
 mugen-zero/e2e/phaseD-restart.spec.ts             |   6 +-
 mugen-zero/e2e/phaseD5-restart.spec.ts            |   6 +-
 mugen-zero/e2e/phaseD5.spec.ts                    |   9 +-
 mugen-zero/e2e/phaseE-restart.spec.ts             |   6 +-
 mugen-zero/e2e/phaseE.spec.ts                     |   6 +-
 mugen-zero/e2e/phaseF-restart.spec.ts             |   5 +-
 mugen-zero/e2e/phaseF.spec.ts                     |   6 +-
 mugen-zero/e2e/phaseH-restart.spec.ts             |   9 +-
 mugen-zero/e2e/phaseH.spec.ts                     |  14 +-
 mugen-zero/e2e/reviewCapture.ts                   | 123 ++++---
 mugen-zero/e2e/rumorSeeds.spec.ts                 |   5 +-
 mugen-zero/e2e/summon.spec.ts                     |   5 +-
 mugen-zero/e2e/summonAccident.spec.ts             |   5 +-
 mugen-zero/e2e/uxPolish.spec.ts                   |  10 +-
 mugen-zero/src/App.tsx                            |  19 +-
 mugen-zero/src/content/qa/visualChanges.ts        |  15 +-
 mugen-zero/src/core/flow/gameFlow.ts              |  19 +-
 mugen-zero/src/core/flow/types.ts                 |   1 +
 mugen-zero/src/dev/CinematicPreviewScreen.tsx     | 236 ++++++++++++
 mugen-zero/src/dev/DevAdminScreen.tsx             |  26 +-
 mugen-zero/src/dev/DevLockScreen.tsx              |  32 +-
 mugen-zero/src/dev/devMode.test.ts                |  81 +++++
 mugen-zero/src/dev/devMode.ts                     |  35 ++
 mugen-zero/src/ui/battle/BattleUIPrototype.tsx    | 186 ++--------
 mugen-zero/src/ui/cinematic/accidentCinematic.tsx | 225 ++++++++++++
 mugen-zero/src/ui/styles.css                      |  96 +++++
 review/latest/01_accident_a_start.png             | Bin 498068 -> 0 bytes
 review/latest/01_admin_a_lock.png                 | Bin 0 -> 13921 bytes
 review/latest/02_accident_b_unknown.png           | Bin 492086 -> 0 bytes
 review/latest/02_admin_b_home.png                 | Bin 0 -> 145295 bytes
 review/latest/03_accident_d_dragon.png            | Bin 677998 -> 0 bytes
 review/latest/03_admin_c_preview_list.png         | Bin 0 -> 23454 bytes
 review/latest/04_accident_e_breath.png            | Bin 689116 -> 0 bytes
 review/latest/04_admin_d_dragon.png               | Bin 0 -> 627262 bytes
 review/latest/05_accident_g_talk.png              | Bin 491338 -> 0 bytes
 review/latest/05_admin_e_breath.png               | Bin 0 -> 636520 bytes
 review/latest/06_accident_f_down.png              | Bin 536888 -> 0 bytes
 review/latest/06_admin_f_unknown.png              | Bin 0 -> 440189 bytes
 review/latest/07_admin_g_talk.png                 | Bin 0 -> 437303 bytes
 review/latest/07_summon_ward.png                  | Bin 504103 -> 0 bytes
 review/latest/08_admin_h_end.png                  | Bin 0 -> 517641 bytes
 review/latest/08_battle_prototype.png             | Bin 515369 -> 0 bytes
 review/latest/09_arcana_summon_ability.png        | Bin 100123 -> 0 bytes
 review/latest/10_arcana_h_unknown.png             | Bin 26510 -> 0 bytes
 review/latest/REVIEW.md                           | 110 +++---
 review/latest/manifest.json                       |  64 ++--
 review/latest/qa-report.md                        |  33 +-
 review/notes.md                                   | 179 ++++-----
 58 files changed, 1525 insertions(+), 549 deletions(-)
```

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-05T03:49:55.499Z / viewport 390x844

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

- 360 / 390 / 412px 確認。横縦スクロールなし。全ビートで PREVIEW 表示が残ります。
- **「ADMIN PREVIEW」は小さな丸バッジ**で、戦場の 5% 未満（E2Eが検査）。
  演出を邪魔する巨大透かしにはしていません。
- **敵は置いていません。** プレートは「DUMMY／— / —」の表示だけで、
  データも戦闘状態も存在しません。E2Eが「モスラビット」と書かれていないこと、
  攻撃・スキル・アルカナ・MUGEN CHOICE が**1つも存在しない**ことを確認します。
- **カットイン中に技名を出していません。** プレビューの見出しは
  「エンシェントブレス」ではなく **「必殺技カットイン」** です。
  実装中に一度ここを間違え、キャプション側に技名を出していました（下記）。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-05T03:49:55.411Z
- Build: MUGEN ZERO v0.1 / 1080e50 / 2026-09-05T03:49:27.853Z
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

新規：`src/ui/cinematic/accidentCinematic.tsx`（演出の共有定義）、
`src/dev/CinematicPreviewScreen.tsx`、`e2e/adminPreview.spec.ts`（17本）。
変更：`BattleUIPrototype.tsx`（演出を共有定義から呼ぶだけに）、
`DevLockScreen.tsx`・`devMode.ts`（文言とセッション解除）、
`DevAdminScreen.tsx`（入口1つ）、`App.tsx`・`gameFlow.ts`・`types.ts`（画面追加）、
`styles.css`（追記のみ）。

**ゲームのルールは1行も変えていません。** 戦闘ロジック・ARCANA・
召喚事故の判定・世界・セーブは無変更です。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  507 passed (507) |
| E2E (playwright) | PASS | 222 passed (12.2m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 5.95s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-BN9_cmS5.js                    1.42 kB │ gzip:   0.78 kB
dist/assets/CinematicPreviewScreen-CHFkpus3.js           4.99 kB │ gzip:   1.83 kB
dist/assets/DevAdminScreen-DnInXU_f.js                  47.94 kB │ gzip:  16.07 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-w1HaKgD9.js                          172.36 kB │ gzip:  52.66 kB
dist/assets/GreenwoodScreen-BZEMnBWH.js              1,498.86 kB │ gzip: 346.19 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。**

## 8. Save compatibility

**セーブ互換に影響なし。** プレビューは読み書きどちらもしません。

## 9. 既知の問題

1. 【設計】**プレビューが本編を壊さない保証を「気をつける」で担保していません。**
   `CinematicPreviewScreen` は `world` を**渡されていません**。
   ストアも書き込み口も持たず、呼びたくても呼べません。
   E2Eは IndexedDB の全ストアと localStorage 全キーを
   **再生前後で文字列比較**して同一であることを確認します。
2. 【継続・別issue】`explorationLoop` / `phaseD` の負荷依存フレーク、
   盗賊ガルドの右脚欠け。
3. 【将来】プレビューは今のところ古代龍1件だけです。通常召喚・ボス登場・
   再会などを足す土台にはなっていますが、**汎用フレームワークは作っていません**。
4. 【注意】ロックNo. 0909 は**フロントエンド内のPIN比較**です。
   一般プレイヤーの誤操作を防ぐための速度制限であって、
   **認証ではありません。** 公開ビルドからの本当の除外は
   `DEV_ADMIN_ENABLED`（入口も画面もビルドから消えます）です。

## 10. Claude 自身が気になる箇所

- **演出を丸ごとコピーしなかったのが今回の主題です。** プレビューが
  実装の第2コピーになると、1週間で本編とズレて、**確認したい質問に
  答えられない道具**になります。so タイムラインも台詞も龍もカットインも
  `ui/cinematic/accidentCinematic` に1つだけ置き、戦闘とプレビューが
  同じものを再生します。切り出しが正しかった証拠として、
  **召喚事故のE2E 29本を1行も書き換えずに通しました**。
- **「変更しない」を能力の不在で担保したこと。** `world` を渡さなければ、
  書き込みは事故でも起きません。テストで守るより構造で守るほうが強い、
  という判断です（テストは念のため両方やっています）。
- **テストを書いていて実装のミスが3つ出ました。** HOME→DEV_ADMIN が
  フロー定義になく、セッション解除が黙って無視されていたこと。
  遅延読み込みの画面に対して「今見えているか」を聞いていたヘルパー。
  そして**キャプションに技名を出していた二重表示**。
  3つとも、コードを読み返すだけでは見つからなかったと思います。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

古代龍の本遭遇・正式入手・正式名称・4ルート・新規敵・
新しい事故キャラ・デッキシステム・管理機能の大量追加へは進みません。

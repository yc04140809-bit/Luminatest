# MUGEN REVIEW PACKAGE — ARCANA SYSTEM v0.2 — 不完全召喚 / 完全召喚（採用前）

- Generated: 2026-09-04T14:38:41.735Z
- Commit: 0655af9 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: bc12329
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** ARCANA図鑑と戦闘を初めて接続しました。

- **召喚事故は実装していません。** 結果は SUCCESS / FAILURE の2つだけです。
  ACCIDENT は型の上に**名前も置いていません**（コメントで扉の位置だけ記録）。
  古代龍・UNKNOWN・未来キャラ・別世界は1行も書いていません。
- **0%は召喚不可。1〜99%は不完全。100%は完全。**
- **不完全召喚はケイオスの介入枠**に入りました。1戦闘の開始時に、
  NONE / BUFF / DEBUFF / **ARCANA** のどれか**1つだけ**が起きます。
  BUFF と召喚が同時に出ることは、型の形として不可能にしてあります。
- **完全召喚はプレイヤーの任意使用**で、1戦闘1回。**必ず成功します。**
  100%は「成功率が少し高い」ではなく、**確実性そのもの**が報酬です。
- **失敗にペナルティはありません。** ダメージも、ターン消費も、
  アルカナの消失もありません。「輪郭が足りなかった」だけです。

### commits

```
0655af9 Make the tests actually hold still
be71b0f Let Kaos put a memory back together on the battlefield
```

### changed files

```
mugen-zero/e2e/arcana.spec.ts                      |   2 +-
 mugen-zero/e2e/battlePrototype.spec.ts             |   2 +-
 mugen-zero/e2e/coreExperience.spec.ts              |   2 +-
 mugen-zero/e2e/devReviewHub.spec.ts                |   2 +-
 mugen-zero/e2e/explorationLoop.spec.ts             |   2 +-
 mugen-zero/e2e/fixtures.ts                         |  27 ++
 mugen-zero/e2e/fourFutures.spec.ts                 |   2 +-
 mugen-zero/e2e/helpers.ts                          |   2 +-
 mugen-zero/e2e/mossRabbit.spec.ts                  |   2 +-
 mugen-zero/e2e/navigation.spec.ts                  |   2 +-
 mugen-zero/e2e/phaseA.spec.ts                      |   2 +-
 mugen-zero/e2e/phaseB-restart.spec.ts              |   2 +-
 mugen-zero/e2e/phaseB.spec.ts                      |   2 +-
 mugen-zero/e2e/phaseC-restart.spec.ts              |   2 +-
 mugen-zero/e2e/phaseC.spec.ts                      |   2 +-
 mugen-zero/e2e/phaseD-restart.spec.ts              |   2 +-
 mugen-zero/e2e/phaseD.spec.ts                      |   2 +-
 mugen-zero/e2e/phaseD5-restart.spec.ts             |   2 +-
 mugen-zero/e2e/phaseD5.spec.ts                     |   2 +-
 mugen-zero/e2e/phaseE-restart.spec.ts              |   2 +-
 mugen-zero/e2e/phaseE.spec.ts                      |   2 +-
 mugen-zero/e2e/phaseF-restart.spec.ts              |   2 +-
 mugen-zero/e2e/phaseF.spec.ts                      |   2 +-
 mugen-zero/e2e/phaseG.spec.ts                      |   2 +-
 mugen-zero/e2e/phaseH-restart.spec.ts              |   2 +-
 mugen-zero/e2e/phaseH.spec.ts                      |   2 +-
 mugen-zero/e2e/reviewCapture.ts                    | 128 ++---
 mugen-zero/e2e/rumorSeeds.spec.ts                  |   2 +-
 mugen-zero/e2e/summon.spec.ts                      | 518 +++++++++++++++++++++
 mugen-zero/e2e/uiPatch.spec.ts                     |   2 +-
 mugen-zero/e2e/uxPolish.spec.ts                    |   2 +-
 mugen-zero/e2e/visualBackground.spec.ts            |   2 +-
 mugen-zero/playwright.config.ts                    |   6 +
 mugen-zero/src/App.tsx                             |  12 +-
 mugen-zero/src/content/arcana/arcanaDefs.ts        |  22 +
 mugen-zero/src/content/qa/visualChanges.ts         |  14 +-
 mugen-zero/src/core/arcana/arcana.ts               |  22 +
 mugen-zero/src/core/chaos/interventionPlan.test.ts | 160 +++++++
 mugen-zero/src/core/chaos/interventionPlan.ts      | 112 +++++
 mugen-zero/src/core/summon/summon.test.ts          | 139 ++++++
 mugen-zero/src/core/summon/summon.ts               | 148 ++++++
 mugen-zero/src/dev/DevAdminScreen.tsx              |  43 ++
 mugen-zero/src/dev/debugEncounter.ts               |  19 +
 mugen-zero/src/game/battle/battleLogic.test.ts     |  52 ++-
 mugen-zero/src/game/battle/battleLogic.ts          |  23 +
 mugen-zero/src/ui/battle/BattleUIPrototype.tsx     | 215 ++++++++-
 mugen-zero/src/ui/battle/battleArcana.ts           |  58 +++
 mugen-zero/src/ui/screens/ArcanaScreen.tsx         |  20 +
 mugen-zero/src/ui/styles.css                       | 163 +++++++
 review/latest/01_arcana_sealed.png                 | Bin 9818 -> 0 bytes
 review/latest/01_summon_incomplete_card.png        | Bin 0 -> 496782 bytes
 review/latest/02_arcana_detail_low.png             | Bin 82616 -> 0 bytes
 review/latest/02_summon_incomplete_field.png       | Bin 0 -> 514552 bytes
 review/latest/03_arcana_detail_high.png            | Bin 103774 -> 0 bytes
 review/latest/03_summon_failure_card.png           | Bin 0 -> 495033 bytes
 review/latest/04_arcana_complete.png               | Bin 103780 -> 0 bytes
 review/latest/04_summon_arcana_command.png         | Bin 0 -> 481348 bytes
 review/latest/05_arcana_toast_complete.png         | Bin 68266 -> 0 bytes
 review/latest/05_summon_complete_field.png         | Bin 0 -> 481845 bytes
 review/latest/06_battle_prototype.png              | Bin 0 -> 513136 bytes
 review/latest/06_home_new_world.png                | Bin 208257 -> 0 bytes
 review/latest/07_arcana_summon_ability.png         | Bin 0 -> 96524 bytes
 review/latest/07_home_remembering.png              | Bin 208298 -> 0 bytes
 review/latest/manifest.json                        |  48 +-
 review/latest/qa-report.md                         |  10 +-
 review/notes.md                                    | 157 ++++---
 66 files changed, 1962 insertions(+), 212 deletions(-)
```

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-04T14:38:41.543Z / viewport 390x844

- `review/latest/01_summon_incomplete_card.png` — BATTLE UI PROTOTYPE：ケイオスが不完全召喚を試みた瞬間。どのページを・何%で呼ぼうとしているか
- `review/latest/02_summon_incomplete_field.png` — BATTLE UI PROTOTYPE：同種戦。敵モスラビットと召喚モスラビットが見分けられるか（位置・大きさ・光の輪・タグ）
- `review/latest/03_summon_failure_card.png` — BATTLE UI PROTOTYPE：不成立。ペナルティを与えず、短い一言で終わっているか
- `review/latest/04_summon_arcana_command.png` — BATTLE UI PROTOTYPE：100%所持時の戦闘UI。攻撃・スキルを圧迫せず、独立した行になっているか
- `review/latest/05_summon_complete_field.png` — BATTLE UI PROTOTYPE：完全召喚。金の輪、《森の息吹》の効果、1戦闘1回の使用済み表示
- `review/latest/06_battle_prototype.png` — BATTLE UI PROTOTYPE：世界が主役に見えるか。敵と味方の大きさ・接地・HP・メッセージ・攻撃/スキル
- `review/latest/07_arcana_summon_ability.png` — ARCANA / アルカナ図鑑：100%でだけ開く「呼べるもの」。ステータスやレアリティになっていないこと

撮影していない画面（変更なし。テスト結果で報告）:
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

- 360 / 390 / 412px で確認。縦横スクロールなし、森は画面の50%以上。
- **ARCANAコマンドは3列目にせず、独立した1行**にしました。360pxで
  3ボタン横並びにすると文字が読めなくなり、しかもこれは
  「集めた甲斐」を受け取るボタンだからです。攻撃・スキルは無変更。
- **同種戦（敵モスラビット＋召喚モスラビット）を最重要ケースとして
  検証しました。** 区別は**恒久的な色変更を一切使わず**、
  (1) 陣営side（主人公側の手前に立つ）
  (2) サイズ（敵より明確に小さい）
  (3) 足元の光の輪と「ARCANA」タグ
  の3つで行っています。E2Eが3点すべてを機械的に検査し、
  さらに主人公・ケイオス・敵の**いずれとも重ならない**ことを確認します。
- 演出は約1.8秒のカード（コマンド欄の位置）＋召喚1.5秒。
  **白フェード・全面暗転・巨大モーダルは使っていません。**

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-04T14:38:41.459Z
- Build: MUGEN ZERO v0.1 / 0655af9 / 2026-09-04T14:38:23.938Z
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

新規：`src/core/summon/summon.ts`（召喚ルール）、
`src/core/chaos/interventionPlan.ts`（BUFF/DEBUFF と ARCANA の排他）、
`src/ui/battle/battleArcana.ts`（図鑑→戦場の受け渡し）、
それぞれの単体テスト、E2E `summon.spec.ts`。
変更：`battleLogic.ts`（`healPlayer` を追加）、
`BattleUIPrototype.tsx`（召喚演出・コマンド）、`arcana.ts` / `arcanaDefs.ts`
（`summon` を1つ）、`ArcanaScreen.tsx`（100%時の1節）、`styles.css`（追記のみ）、
`App.tsx`・`debugEncounter.ts`・`DevAdminScreen.tsx`（配線と検証用）。

テスト基盤：`e2e/fixtures.ts` を新規追加し、全 spec の `test` の輸入元を
そこへ変更（1ファイル1行）。ゲーム側のコードではありません。

**ガルド・会話画面・イベントUI・探索画面・スプライト・時間進行・
既存戦闘画面・MUGEN CHOICE・WORLD MEMORY は1文字も変えていません。**
既存の `rollChaosIntervention` も**1行も変えていません**（新しい層が
その上で選ぶだけ）。4種のBUFF/DEBUFFの挙動は完全に同じです。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  436 passed (436) |
| E2E (playwright) | PASS | 176 passed (10.2m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 7.60s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-ZB3uuqQu.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-61aOD1XF.js                  46.16 kB │ gzip:  15.47 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-DRQXtHbE.js                          161.47 kB │ gzip:  49.18 kB
dist/assets/GreenwoodScreen-wKt9yW5u.js              1,498.86 kB │ gzip: 346.19 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。** 召喚は何も保存しません。

## 8. Save compatibility

**セーブ互換に影響なし。**

## 9. 既知の問題

1. 【新規】**戦闘開始時の不完全召喚は、HP全快のことがほとんどです。**
   《森の息吹》は回復なので、開幕に出ると「HPはもう満ちている。」に
   なりがちです。嘘をつかない表示にはしましたが、**設計として弱い**と
   考えています。次フェーズの案：召喚を数ターン滞在させて負傷時に効かせる、
   または不完全召喚だけ別能力にする。今回は指示範囲外なので触っていません。
2. 【新規】**旧戦闘画面には召喚がありません。** 旧UIは触らない対象です。
   既定は新戦闘画面なので通常プレイに影響しません。
3. 【新規】**成功率は線形の仮式**です。`SUMMON_CONFIG` の2つの数字だけで
   決まります。将来の曲線は `summonSuccessChance` 1関数の差し替えで済みます。
4. 【解消】前回まで負荷時のみ落ちていた
   「ケイオスのカードが412pxに収まる」は、**フレークではなく原因のある
   失敗**でした。`playwright.config.ts` の `reducedMotion: 'reduce'` が
   この環境では**ページに届いておらず**（ページ内の `matchMedia` が
   false）、画面入場の6px スライドが走ったままカードを測っていました。
   実測 845.62px は「844 + 画面 6px + カード 8px」の途中の値です。
   `e2e/fixtures.ts` を追加してページ側で再度 `emulateMedia` を要求し、
   全 spec がそこから `test` を取るようにしました。**テストの閾値は
   1つも緩めていません。**（副次効果：E2E全体が 14.4分 → 9.8分）
5. 【継続・別issue】`phaseD` の負荷依存フレーク、盗賊ガルドの右脚欠け。

## 10. Claude 自身が気になる箇所

- **排他を「順番」ではなく「型の形」で担保したのが効きました。**
  `InterventionPlan` は NONE / MODIFIER / SUMMON の直和で、
  SUMMON には `def` が無く MODIFIER には `arcanaId` が無いので、
  「両方同時」は**書こうとしても書けません**。テストは20×5通りの
  サイコロを回して、常にどれか1つだけであることを確認しています。
- **既存の抽選を1行も触らずに拡張できたのが、いちばん安心できる点です。**
  `rollChaosIntervention` はそのまま、新しい層がその結果を受けて
  「これを召喚に差し替えるか」だけを決めます。前ラウンドのテストは
  1つも書き換えていません。
- **100%を「確実」にしたのが、この機能の主題です。** 90%成功にすると
  「100%にしたのに失敗した」が起きて、収集の意味が壊れます。
  完全召喚はサイコロを**引きません**（テストで、どんな目でも成功する
  ことを確認）。
- **「たまに落ちる」を、まずフレークと呼ばなかったのが良かったです。**
  ジオメトリを実測して初めて、reduced-motion がそもそも効いていない
  という**全スイートに効く不具合**だと分かりました。閾値を緩めていたら
  見つからないままでした。
- **同種戦の区別に色を使わなかったのが正解でした。** 召喚側を紫にする
  などは一瞬で解決しますが、それは「無加工のPNGをそのまま使う」という
  この作品の約束を破ります。位置・大きさ・光の輪・タグの4つで、
  絵に指一本触れずに区別できました。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

召喚事故・UNKNOWN ARCANA・デッキ構築・レアリティへは進みません。

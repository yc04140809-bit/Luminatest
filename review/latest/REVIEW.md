# MUGEN REVIEW PACKAGE — CHAOS BATTLE INTERVENTION v0.1 — 戦闘開始時のケイオス介入（採用前）

- Generated: 2026-09-04T05:24:08.381Z
- Commit: c816c3f on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: c816c3f
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 戦闘 UI 試作の上に、**戦闘開始時に一度だけ**
ケイオスが介入する仕組みを載せました。

- **抽選は戦闘開始時の一度だけ。** 毎ターンではありません。リロードで
  引き直すこともできません（保存していないので、そもそも引き直す先がない）。
- **35% で発動、65% は何も起きない。** 「何も起こらない普通の戦闘」を
  必ず残すのが仕様です。発動しなかった戦闘は、これまでの戦闘と1ドットも
  違いません（カードも、印も、チップも出ません）。
- **効果は4種。** 加護（攻撃 ×1.25）／守護（被ダメ ×0.7）／
  弱体（敵攻撃 ×0.7）／崩し（敵被ダメ ×1.3）。
- **演出は1.8秒。** 巨大なモーダルにしていません。白フェードも、白背景も、
  ぼかしも使っていません。**森は1pxも隠れません** — カードはコマンドが
  あった場所に出ます。タップで即スキップできます。
- **その戦闘限り。** 次の戦闘にも MUGEN CHOICE の結果にも持ち越しません。
  介入は `BattleState` の中に住んでいるので、戦闘が終われば一緒に消えます。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-04T05:24:08.206Z / viewport 390x844

- `review/latest/01_battle_prototype.png` — BATTLE UI PROTOTYPE：世界が主役に見えるか。敵と味方の大きさ・接地・HP・メッセージ・攻撃/スキル
- `review/latest/02_battle_prototype_skill.png` — BATTLE UI PROTOTYPE：「スキル」を開いた状態。まだ何も無いことを隠していないか
- `review/latest/03_battle_prototype_mugen_choice.png` — BATTLE UI PROTOTYPE：戦うことと人生を決めることの分離。4ボタンが窮屈でないか

撮影していない画面（変更なし。テスト結果で報告）:
- GREENWOOD / BATTLE — 前ラウンドから無変更。試作は既存画面を置き換えていません
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

- 360 / 390 / 412px で、通常戦闘（NONE）・BUFF発動・DEBUFF発動・
  発動後のチップ表示を確認。縦横スクロールなし。カードは画面高さの
  25% 未満で、森の表示面積は 50% 以上を維持。
- **「身構える」と《ケイオスの守護》の重複を最重要項目として検証**しました。
  4ターン連続で重ねても、ダメージは必ず 1 以上・HP は必ず 1 以上・
  数値が NaN や負数になることはありません（E2E + 単体テスト両方）。
- DEV ADMIN に「CHAOS — 戦闘開始時の介入を固定」を追加。5種を強制指定
  できます。**公開ビルドの UI には出ません**（`DEV_ADMIN_ENABLED` が false）。
- 既存の戦闘試作 E2E は**すべて介入 NONE に固定**しました。あの画面の
  テストは「画面」を見るためのもので、そこに確率を混ぜると何を測ったのか
  分からなくなるからです。介入そのものは専用の describe で試験します。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-04T05:24:07.787Z
- Build: MUGEN ZERO v0.1 / c816c3f / 2026-09-04T05:23:28.080Z
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

新規：`src/core/chaos/chaosIntervention.ts`（抽選と設定）、
`src/content/chaos/chaosInterventions.ts`（4種の定義とセリフ）、
それぞれの単体テスト、E2E の `Kaos at the start of a fight`。
変更：`battleLogic.ts`（`BattleModifiers` を受け取る）、
`BattleUIPrototype.tsx`（抽選と演出）、`styles.css`（`.bp-chaos-*` を追記）、
`debugEncounter.ts` / `DevAdminScreen.tsx`（DEV 固定）、`App.tsx`（受け渡し）。

**ガルド・会話画面・イベントUI・探索画面・スプライト・WORLD MEMORY・
時間進行・既存戦闘画面は1文字も変えていません。** 既存戦闘ロジックは
引数を1つ増やしただけで、既定値が「何も起きない」なので旧画面の
呼び出しは以前と完全に同じ計算になります。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  355 passed (355) |
| E2E (playwright) | PASS | 142 passed (11.7m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.04s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-mCxJ_niM.js                    1.33 kB │ gzip:   0.77 kB
dist/assets/DevAdminScreen-Df0Tlb0Y.js                  43.67 kB │ gzip:  14.63 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-D-UzWRBp.js                          143.92 kB │ gzip:  43.79 kB
dist/assets/GreenwoodScreen-EhPnYwsN.js              1,498.86 kB │ gzip: 346.19 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。** 介入は一切保存しません。

## 8. Save compatibility

**セーブ互換に影響なし。**

## 9. 既知の問題

1. 【新規】**ARCANA は実装していません。** 指示どおりです。型の上に
   `interventionType: NONE / BUFF / DEBUFF / ARCANA` という枠だけ用意し、
   ARCANA を返すコードは1行も書いていません。
2. 【新規】**発動率 35% は仮の数字です。** プレイして決める値なので、
   `CHAOS_INTERVENTION_CONFIG.chance` の1箇所だけを触れば変わります。
3. 【新規】**旧戦闘画面には介入が出ません。** 旧UIは「触らない」対象なので、
   ガルド戦を含め従来どおりです。
4. 【新規】**介入の演出音・専用モーションはありません。** 光の輪と印だけです。
   新規アセットを作らない方針のためです。
5. 【継続・別issue】`phaseD` の負荷依存フレーク、盗賊ガルドの右脚欠け。
   指示どおり今回は手を付けていません。

## 10. Claude 自身が気になる箇所

- **`if (random) attack += x` で終わらせないために必要だったのは、
  フレームワークではなく「掛け算の順番を決めること」でした。**
  ダメージを「乱数 → 掛け算の列 → 切り上げ → 下限1」という一本の関数に
  したので、効果が2つ重なっても3つ重なっても、壊れ方が存在しません。
  新しい効果は掛け算の列に1項足すだけです。
- **重複仕様は「打ち消し合わない」ほうを選びました。** 《守護》と
  「身構える」は乗算で重なります（0.7 × 0.5 = 0.35）。片方を無効化すると
  「守ってあげる」と言われた直後に身構えると損をする、という嘘になります。
  代わりに**下限1**を置いて、どれだけ重ねても0にはならないようにしました。
- **演出をコマンド欄の位置に出したのが正解でした。** 最初は戦場の上に
  重ねていて、主人公の足元と HP プレートに被りました。森の外——
  1.8秒だけコマンドが留守にする場所——に置いた瞬間、**森が一切隠れず、
  上の何一つ動かない**演出になりました。隠さない演出は、隠れる場所を
  探すのではなく、空いている場所を使うものでした。
- **65% を「何も起きない」に使うのが、この機能の本体です。** 毎回出る
  救済は救済ではなく仕様になります。出ない戦闘があるから、出た戦闘に
  「今日は手伝ってくれた」が生まれます。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

正式採用・既存戦闘画面への適用・ARCANA の実装へは進みません。

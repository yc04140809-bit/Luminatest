# MUGEN REVIEW PACKAGE — ARCANA v0.3 — 召喚事故プール / 入手済み除外（採用前）

- Generated: 2026-09-05T04:21:11.067Z
- Commit: 9f08e5a on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 4e1ecf6
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**まだ採用していません。** 2つです。

**PHASE 1 — 事故候補プールの汎用化。** `SummonAccidentDef` に
`arcanaId` / `unknownLabel` / `previewId` を持たせ、UNKNOWN #002 の追加が
**content に1エントリ足すだけ**で済むようにしました。分岐も、特定の
生き物についての `if` も増えません。

**PHASE 2 — 正式入手済みの除外。** 候補から外れる理由は
**正式ARCANAを所有していること、ただ1つ**にしました。

### 前ラウンド（v0.3）からの仕様変更を明記します

前回わたしは `repeatPolicy: UNTIL_ACQUIRED` ＋ **30日クールダウン**を実装し、
「一度見たら当分出ない」挙動にしていました。**今回の指示はこれを覆します**
（「召喚事故を何度見ても、正式入手していない限り除外してはいけない」）。
したがって**クールダウン・repeatPolicy・weight・観測回数による抽選除外を
すべて撤去**しました。同じ人が同じ条件で連続して事故に遭えます。
意図した変更ですが、**前回の挙動とは違う**ので確認をお願いします。

同時に「所有状態の二重管理をしない」という指示に従い、
`AccidentRecord.state === 'ACQUIRED'` による除外も撤去しました。
所有の正本は**ARCANA図鑑（完成したページ）だけ**です。
DEV の「ACQUIRED/IDENTIFIEDにする」ボタンも、所有の第2の置き場に
なるため削除しました。

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-05T04:21:10.924Z / viewport 390x844

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

- **古代龍の演出は1ピクセルも触っていません。** 巨大表示・左向き・面積比・
  エンシェントブレス・カットイン・タイムライン・事故後会話・消滅すべて現状維持
  （召喚事故E2E 28本が無変更で通ります）。
- ADMIN 導線（HOME → DEV ADMIN → 0909 → 演出プレビュー → ARCANA → 召喚事故）
  も無変更。360 / 390 / 412px で横スクロールなし。
- DEV パネルの表示だけ、候補の状態を新しい規則で説明するよう書き換えました
  （「観測N回 ／ 正式ARCANA ancient_dragon は未入手 → 候補」）。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-05T04:21:10.841Z
- Build: MUGEN ZERO v0.1 / 9f08e5a / 2026-09-05T04:20:43.221Z
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

変更：`core/summon/summonAccident.ts`（プール・除外・プレビュー用リスト）、
`content/summon/accidents.ts`（UNKNOWN #001 の登録）、
`core/chaos/interventionPlan.ts`（受け渡し）、
`dev/CinematicPreviewScreen.tsx`（プレビュー用リストから引く）、
`dev/DevAdminScreen.tsx`（表示のみ）、各テスト。

**演出・画像・確率・戦闘・世界・セーブ内容は変更していません。**

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc -b --force) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  504 passed (504) |
| E2E (playwright) | PASS | 224 passed (12.4m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 6.39s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-Bsm_qDxu.js                    1.42 kB │ gzip:   0.78 kB
dist/assets/CinematicPreviewScreen-3RDddlEd.js           5.00 kB │ gzip:   1.83 kB
dist/assets/DevAdminScreen-BjkEsLB1.js                  47.78 kB │ gzip:  16.05 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/index-Bw225qIr.js                          171.59 kB │ gzip:  52.41 kB
dist/assets/GreenwoodScreen-BUawhw9X.js              1,498.86 kB │ gzip: 346.19 kB
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

1. 【仕様変更】上記のとおり**クールダウンを撤去**しました。事故が
   「たまにしか見られない稀なもの」である度合いは、確率6%だけが担います。
   同じプレイヤーが短時間に2回見る可能性があります。**意図どおりですが、
   前回と体験が変わります。**
2. 【設計】`arcanaId: 'ancient_dragon'` は**予約IDで、そのARCANAは存在しません**。
   だから誰も所有できず、候補は常に立ちます（正しい状態です）。
   TEST 3 は単体テストで所有リストを与えて検証しています。
   ゲーム内で古代龍を入手する手段は作っていません（指示どおり）。
3. 【継続・別issue】`explorationLoop` / `phaseD` の負荷依存フレーク、
   盗賊ガルドの右脚欠け。

## 10. Claude 自身が気になる箇所

- **「見た」と「持っている」を混ぜないことが今回の全部です。** 前回の実装は
  観測でプールから外していて、それは実質「見たら持っている扱い」でした。
  いまは所有の判定が**図鑑1か所**にあり、事故側は所有フラグを持ちません。
- **候補0件を例外にしなかったこと。** 抽選が成立しても候補が無ければ
  `pickAccident` は **サイコロを1つも引かずに** null を返し、通常召喚の
  抽選がそのまま走ります。「サイコロを引かない」ことまでテストしました
  （引いてしまうと、事故を検討しただけで下流の目が変わります）。
- **プレビュー用と抽選用でリストを分けたこと。** 同じ関数に
  「所有を無視するフラグ」を足すのではなく、`previewableAccidents()` を
  別に置きました。プレビューには**セーブを渡す口自体がない**ので、
  所有状態が何かを隠すことが構造的に起こりません。

## 11. 次フェーズへ進行可能か

**READY FOR HUMAN REVIEW（採用前）。**

古代龍の本遭遇・正式入手・正式名称・4ルート・新規敵・
新しい事故キャラ・デッキシステム・管理機能の大量追加へは進みません。

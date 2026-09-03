# MUGEN REVIEW PACKAGE — PHASE E + F — DEV REVIEW HUB / EXPERIENCE DIRECTOR v0.1

- Generated: 2026-09-03T07:46:55.856Z
- Commit: d56e817 on claude/mugen-zero-v01-implementation-qanh8u
- Compared against: 3a63f30
- Verdict: nothing failed

## 1. 実装前 → 実装後の変更点

**PHASE E — DEV REVIEW HUB / AUTOMATED QA REPORT**

- 実装前: 実装内容を確認するには、人間がゲームを歩いて画面を10枚以上撮影し、
  整理して別AIへ送る必要があった。ロジックの確認を写真に依存していた。
- 実装後: DEV ADMIN 内に読み取り専用の DEV REVIEW HUB を追加。
  build / WORLD MEMORY / 全イベントのメタデータ / NARRATIVE SEEDS /
  WORLD RUMORS / 体験サマリ / EXPERIENCE DIRECTOR の判断根拠 /
  自動チェック結果を1画面に集約。GENERATE + COPY で Markdown 全文を
  一度にコピーできる。

**PHASE F — EXPERIENCE DIRECTOR v0.1**

- 実装前: EVENT ENGINE が「発生可能なイベントの中で優先度最大」を選ぶだけ。
  同じ感情・同じ人物が連続しても止まらなかった。
- 実装後: eligibility（engine）と pacing（director）を分離。
  Director は加算スコアでのみ順序を変え、ルール名・数値・理由を必ず残す。
  WORLD MEMORY は一切書き換えない。空の部屋を作らない。

**この2フェーズで実際に見つかった不具合**:
`GREENWOOD_DEEPER_PATH_RUMOR` が蒔いていた seed `GREENWOOD_DEEP_PATH` が
seed レジストリに未登録だった。新チェック `SEED_PLANTERS_REGISTERED` が
FAIL を出して発覚し、登録して解消。以後は自動で防止される。

### commits

```
d56e817 Give the build a way to describe itself, and pacing a reason it can show
```

### changed files

```
mugen-zero/e2e/devReviewHub.spec.ts                | 161 ++++++++
 mugen-zero/src/App.tsx                             |   3 +-
 .../src/content/experience/aldenExperience.test.ts |   3 +-
 .../src/content/experience/aldenExperience.ts      |  12 +
 mugen-zero/src/content/narrative/aldenSeeds.ts     |  15 +-
 mugen-zero/src/content/qa/visualChanges.ts         |  26 ++
 mugen-zero/src/core/experience/director.test.ts    | 229 ++++++++++++
 mugen-zero/src/core/experience/director.ts         | 331 +++++++++++++++++
 .../src/core/experience/experienceEngine.test.ts   |  22 +-
 mugen-zero/src/core/experience/experienceEngine.ts |  80 +---
 mugen-zero/src/core/experience/types.ts            |  25 ++
 mugen-zero/src/core/qa/qaChecks.ts                 | 406 +++++++++++++++++++++
 mugen-zero/src/core/qa/qaReport.test.ts            | 316 ++++++++++++++++
 mugen-zero/src/core/qa/qaReport.ts                 | 184 ++++++++++
 mugen-zero/src/core/qa/types.ts                    | 105 ++++++
 mugen-zero/src/core/world/experienceState.test.ts  |  14 +-
 mugen-zero/src/core/world/world.ts                 |  21 ++
 mugen-zero/src/dev/DevAdminScreen.tsx              |  16 +
 mugen-zero/src/dev/DevReviewHub.tsx                | 395 ++++++++++++++++++++
 mugen-zero/src/dev/qaSnapshot.ts                   |  91 +++++
 mugen-zero/tsconfig.node.json                      |   2 +-
 mugen-zero/types/node-shims.d.ts                   |  11 +
 mugen-zero/vite.config.singlefile.ts               |  21 ++
 mugen-zero/vite.config.ts                          |  21 ++
 24 files changed, 2414 insertions(+), 96 deletions(-)
```

## 2. スクリーンショット（必要な分だけ）

撮影: 2026-09-03T07:46:55.647Z / viewport 390x844

- `review/latest/01_dev_review_hub.png` — DEV REVIEW HUB：新規画面。折りたたみと可読性を実機で確認してほしい
- `review/latest/02_dev_review_hub_qa_report.png` — DEV REVIEW HUB：GENERATE 後のレポート表示。長文が枠内で折り返されているか
- `review/latest/03_director_decision_log.png` — DEV REVIEW HUB：EXPERIENCE DIRECTOR の判断根拠が実際に読めるか

撮影していない画面（変更なし。テスト結果で報告）:
- TITLE — untouched since the key visual
- PROLOGUE / KAOS — untouched
- HOME — untouched
- EXPLORE — untouched
- TAVERN / TALK — untouched — event order changed, layout did not
- GREENWOOD / BATTLE — untouched
- LIFE CHOICE / ENDING / SURVEY — untouched

## 3. 新規機能の動作確認結果

- **DEV REVIEW HUB**: DEV ADMIN → 「DEV REVIEW HUB / QA REPORT」から到達。
  全セクション折りたたみ、Android縦で横スクロールなし。E2E で到達・表示・
  離脱まで検証済み。
- **QA REPORT**: 22項目を実データに対して実行。`PASS` は「今ここで実際に
  見て確認した」ものだけ。未検証は `NOT TESTED` とし、**誰が検証するかを
  名指し**する（例: ROUTE_PLAYTHROUGH_ALL → e2e/fourFutures.spec.ts）。
  「ビルド成功」と「ゲームが正しい」を混同しない。
- **COPY REPORT**: クリップボード内容を E2E で実読して検証。失敗時は
  成功を装わず、画面上のテキストを長押しで選ぶよう案内する。
- **EXPERIENCE DIRECTOR**: 8ルール。感情・人物の連続を下げ、LIFE を守り、
  未回収の問いが多いときは新しい問いを抑え、CORE には一切ペナルティを
  かけない。全ルールに unit テストあり。

同じビルドが出力した QA REPORT 全文: `review/latest/qa-report.md`

```
# MUGEN ZERO QA REPORT

- Generated: 2026-09-03T07:46:55.230Z
- Build: MUGEN ZERO v0.1 / d56e817 / 2026-09-03T07:46:38.844Z
- Environment: dev server
- Result: no failed checks — 21 pass, 0 warn, 2 not tested, 1 manual

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
- Events met in this world: 1

```

## 4. 既存機能への影響

既存機能への影響は**イベントの提示順のみ**。レイアウト・演出・セーブ・
4ルート・TIME SHIFT・LIFE ARCHIVE の挙動はいずれも変更なし。

順序が変わった箇所は1つだけ確認済み: 3年後の酒場で、グレイヴの話が2回
続いた直後に「地図にない道」（猟師の噂）が先に来るようになった。これは
CHARACTER_REPEAT が意図通り働いた結果で、同じ人物が3回続くのを避けている。
該当の unit テストの期待値をその理由とともに更新済み。

EVENT ENGINE は全面 rewrite していない。選択ロジック約30行を Director へ
移しただけで、`isAvailable` / `findAvailableEvents` /
`locationsWithSomethingNew` の挙動は同一。

## 5. Unit / E2E / Build 結果

| 項目 | 結果 | 内容 |
| --- | --- | --- |
| Typecheck (tsc --noEmit) | PASS | no type errors |
| Unit (vitest) | PASS | Tests  271 passed (271) |
| E2E (playwright) | PASS | 101 passed (7.7m) |
| Build (tsc -b && vite build) | PASS | ✓ built in 9.70s |
| Screenshot capture | PASS | captured |

```
dist/assets/DevLockScreen-Ck0TdsHa.js                    1.31 kB │ gzip:   0.76 kB
dist/assets/DevAdminScreen-D9rw5zF0.js                  35.30 kB │ gzip:  11.83 kB
dist/assets/index-wKPMOYP_.js                          105.98 kB │ gzip:  32.03 kB
dist/assets/react-C8w-UNLI.js                          141.74 kB │ gzip:  45.48 kB
dist/assets/GreenwoodScreen-DJSDvLKK.js              1,485.94 kB │ gzip: 341.76 kB
```

## 6. Android / mobile 確認結果

- 実測（QA REPORT より）: **PASS** `NO_HORIZONTAL_SCROLL` — 390x844: nothing spills sideways
- 撮影 viewport: 390x844（Android縦相当）
- 360 / 390 / 412px の横スクロール検査は E2E スイートに含まれます。

## 7. DB 変更有無

**DB 変更なし。** store / index / DB version いずれも無変更。
今回の追加で新しい保存キーも増えていない（Director は履歴を保存せず、
既存の `experience_log` から毎回導出する）。migration 不要。

## 8. Save compatibility

**既存セーブは壊れない。** Director が読む `recentEventIds` は既存の
`experience_log` から、`lifeEventAvailable` は既存の future site 状態から
導出される。どちらも無い古いセーブは「履歴なし」として読まれ、その時点から
判断が始まるだけ。`SAVE_RESTORED` チェックが実際に読み戻せたことを
毎回報告する。

## 9. 既知の問題

1. LIFE layer の experience イベントは現在 0 件。LIFE_PROTECTION ルールは
   unit テストでのみ検証されている（実コンテンツ未適用）。実際の「また会えた」
   は future site 経由なので、抽選に負けようがない構造ではある。
2. seed を**回収する**イベントがまだ無いため、`unresolvedSeeds` は上限に
   張り付いたままになる。意図通りだが、回収イベントを作ると自然に解ける。
3. `GreenwoodScreen` チャンク 1.49 MB（Phaser 同梱）。動作影響なし。
4. QA REPORT の VISUAL CHANGES 宣言（`src/content/qa/visualChanges.ts`）は
   手動。ここだけは人間の正直さに依存する。迷ったら「変更あり」にすること。

## 10. Claude 自身が気になる箇所

- **Director の重みは根拠のない数字である。** −3 / +4 / −25 / +100 は
  現在のコンテンツ（priority 1〜90）に対して「効くが壊さない」値を選んだだけで、
  実プレイのデータで裏を取っていない。ZERO-WASTE の観点では、この値こそが
  次にプレイテストで検証すべき対象。
- **CHARACTER_REPEAT は酒場では全員グレイヴなので、ほぼ常に一律に効く。**
  結果として「グレイヴ以外の声」を相対的に押し上げるルールとして働いている。
  意図した効果ではあるが、副作用として作者が付けた priority 差（75 対 70）を
  越えてしまう場面がある。人物が増えるまでは観察が必要。
- **VISUAL CHANGES が手動宣言であること。** 自動化の輪の中で、ここだけ
  人間が嘘をつける。将来はスクリーンショット差分で機械化したい。
- **QA REPORT はまだ「今この世界」しか見ない。** 4ルートを同時に検査したい
  場合はプリセットを切り替えて4回生成する必要がある。

## 11. 次フェーズへ進行可能か

**YES。**

WORLD MEMORY 無変更 / migration 不要 / セーブ互換 / 依存追加なし /
Unit・E2E・Build すべて green。
ただし指示書 §35 に従い、レビューを待って停止する。

<!-- title: PHASE E + F — DEV REVIEW HUB / EXPERIENCE DIRECTOR v0.1 -->
<!-- base: 3a63f30 -->

# レビューノート

`npm run review` が読み込む、機械には書けない部分だけを書くファイル。
測定結果（テスト・ビルド・スクリーンショット・QA REPORT）はスクリプトが
自分で集めるので、ここには**判断**だけを書く。

フェーズが終わるたびに `base:` を前フェーズ最後のコミットへ更新すること。

## NOTES:1

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

## NOTES:3

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

## NOTES:4

既存機能への影響は**イベントの提示順のみ**。レイアウト・演出・セーブ・
4ルート・TIME SHIFT・LIFE ARCHIVE の挙動はいずれも変更なし。

順序が変わった箇所は1つだけ確認済み: 3年後の酒場で、グレイヴの話が2回
続いた直後に「地図にない道」（猟師の噂）が先に来るようになった。これは
CHARACTER_REPEAT が意図通り働いた結果で、同じ人物が3回続くのを避けている。
該当の unit テストの期待値をその理由とともに更新済み。

EVENT ENGINE は全面 rewrite していない。選択ロジック約30行を Director へ
移しただけで、`isAvailable` / `findAvailableEvents` /
`locationsWithSomethingNew` の挙動は同一。

## NOTES:7

**DB 変更なし。** store / index / DB version いずれも無変更。
今回の追加で新しい保存キーも増えていない（Director は履歴を保存せず、
既存の `experience_log` から毎回導出する）。migration 不要。

## NOTES:8

**既存セーブは壊れない。** Director が読む `recentEventIds` は既存の
`experience_log` から、`lifeEventAvailable` は既存の future site 状態から
導出される。どちらも無い古いセーブは「履歴なし」として読まれ、その時点から
判断が始まるだけ。`SAVE_RESTORED` チェックが実際に読み戻せたことを
毎回報告する。

## NOTES:9

1. LIFE layer の experience イベントは現在 0 件。LIFE_PROTECTION ルールは
   unit テストでのみ検証されている（実コンテンツ未適用）。実際の「また会えた」
   は future site 経由なので、抽選に負けようがない構造ではある。
2. seed を**回収する**イベントがまだ無いため、`unresolvedSeeds` は上限に
   張り付いたままになる。意図通りだが、回収イベントを作ると自然に解ける。
3. `GreenwoodScreen` チャンク 1.49 MB（Phaser 同梱）。動作影響なし。
4. QA REPORT の VISUAL CHANGES 宣言（`src/content/qa/visualChanges.ts`）は
   手動。ここだけは人間の正直さに依存する。迷ったら「変更あり」にすること。

## NOTES:10

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

## NOTES:11

**YES。**

WORLD MEMORY 無変更 / migration 不要 / セーブ互換 / 依存追加なし /
Unit・E2E・Build すべて green。
ただし指示書 §35 に従い、レビューを待って停止する。

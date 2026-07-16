# 02 命名規則

- **最終更新**: 2026-07-16

## ID体系(発番したら永久不変)

| 種類 | 形式 | 例 | 発番台帳 |
|---|---|---|---|
| カード(メジャー) | `LA-M-{01-22}` | `LA-M-01` | [master-library/06](../master-library/06_card-master.md) |
| カード(マイナー) | `LA-S{1-4}-{01-14}` | `LA-S1-01` | 同上 |
| カード(予約ID) | `LA-M-00` | `LA-M-00` | テンプレート専用(記入見本)。正式カード番号には使用しない |
| キャラクター | `CHR-{001〜}` | `CHR-001` | [master-library/04](../master-library/04_characters.md) |
| 建物・場所 | `LOC-{001〜}` | `LOC-001` | world-bible/locations/ |
| 精霊 | `SPR-{001〜}` | `SPR-001` | world-bible/spirits/ |
| 神獣 | `SBT-{001〜}` | `SBT-001` | world-bible/sacred-beasts/ |
| 用語(詳細ファイルを持つもの) | `TRM-{001〜}` | `TRM-001` | world-bible/terms/ |
| SNS投稿の型 | `SNS-F{01〜}` | `SNS-F01` | [master-library/09](../master-library/09_sns-operations.md) |

- 番号は欠番を再利用しない(廃止したIDは永久欠番)

## ファイル・フォルダ名

- **英小文字+ハイフン**(kebab-case): `chaos-chan.md` `world-map.md`
- 日本語ファイル名は使わない(環境間の互換性のため)
- カードファイル: `{card-id}_{slug}.md` → `LA-M-00_hajimari-no-hikari.md`(テンプレート使用例。LA-M-00 は予約ID)
  - slug はタイトルのローマ字またはシンプルな英訳。ID部分が正なので slug は変更可
- 番号付きドキュメントは2桁ゼロ埋め: `00_brand-philosophy.md` 〜 `14_changelog.md`
- テンプレートフォルダは `_templates/`(先頭アンダースコアで一般データと区別)

## バージョン表記

| 対象 | 形式 | 例 |
|---|---|---|
| プロンプト | `v{3桁}` | `v001` `v002` |
| 画像ファイル | `{card-id}_v{3桁}.png` | `LA-M-00_v001.png` |
| ドキュメントの版 | `v{major}.{minor}` | `v1.0` `v0.1`(0.x = ドラフト) |

## 日付

- すべて `YYYY-MM-DD` 形式(例: `2026-07-16`)

## 用語・固有名詞

- 世界観の固有名詞は [用語集](../master-library/03_glossary.md) の「正式表記」を常に使用
- 新しい固有名詞を作ったら、使用する前に用語集へ登録する

## 更新履歴

| 日付 | 内容 |
|---|---|
| 2026-07-16 | ユーザー決定により LA-M-00 をテンプレート専用予約IDとして追記。メジャーの正式範囲を LA-M-01〜LA-M-22 に改訂 |
| 2026-07-16 | 初版作成 |

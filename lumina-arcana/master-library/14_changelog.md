# 14 更新履歴

- **ステータス**: 運用中
- **最終更新**: 2026-07-16

Master Library 全体および設定上の重要な決定・変更をここに記録します。
**設定を変更したら、変更したファイル自身の更新履歴と、この章の両方に書く**のがルールです。

## 記載ルール

- 新しいものを上に書く
- 「何を・なぜ」変えたかを1行で書く(未来の自分とAIが理由を辿れるように)
- 破壊的変更(Card ID 変更・用語廃止・キャラ設定の大変更)は `⚠️` を付ける

## 履歴

| 日付 | 対象 | 内容 | 理由 |
|---|---|---|---|
| 2026-07-16 | development-rules / CLAUDE.md | ユーザー制定の「Claude Code 共通ルール(Project Rules v1.0)」を最上位ルールとして登録(00_project-rules.md・リポジトリ直下 CLAUDE.md)。影響範囲: development-rules 全体・各README | AIセッションが常に同じルールで動作するようにするため |
| 2026-07-16 | 全ドキュメント | 未確定表記を【未設定】【要確認】【仮設定】【提案】タグに統一(旧: (未設定)(仮) 等)。影響範囲: Master Library・Card DB・Character Bible・World Bible・Prompt Library | Project Rules v1.0 の管理タグ表記に準拠するため |
| 2026-07-16 | 全体 | プロジェクト基盤(Master Library 15章・Card Database・Prompt Library・Character Bible・World Bible・Development Rules)を新規作成 | Lumina Arcana ブランドの開発基盤構築(Phase 1 開始) |
| 2026-07-16 | 06章 / Card DB | サンプルカード LA-M-00「はじまりの光【仮設定】」を発番 | テンプレートの使用例を示すため |

## 重要な意思決定の記録(Decision Log)

設定変更より大きな「方針の決定」はこちらに記録する。

| 日付 | 決定 | 背景 |
|---|---|---|
| 2026-07-16 | カードデータの正は Markdown(YAMLフロントマター)とし、アプリ用 JSON は変換で生成する | スマホでも編集でき、将来のアプリ化にも耐えるため |
| 2026-07-16 | Card ID は `LA-M-00` / `LA-S1-01` 形式で永久不変とする | 画像・プロンプト・アプリの共通キーにするため |

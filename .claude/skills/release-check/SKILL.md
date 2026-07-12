---
name: release-check
description: My Chaos AI Suiteを公開・デプロイする前の最終確認手順。Renderへのデプロイ前やまとまった変更をコミット・プッシュする前に使う。
---

# release-check — 公開前の最終確認

`chaos-ai-suite/`直下で実行する。

## 1. 自動チェック

- `npm run typecheck` — 型エラーがないか（全ワークスペース）
- `npm run build` — shared→backend→frontendの順でビルドが通るか
- `npm run test --workspace packages/backend` — バックエンドのテストが通るか
- フロントエンドには自動テストがないため、`npm run dev:frontend`で実際にブラウザから主要機能を操作して確認する（ビルド成功だけでは機能の正しさは保証されない）

## 2. 手動確認（`.claude/rules/testing.md`のチェックリストに準拠）

- 変更した機能・関連する既存機能が壊れていないか
- スマホ表示（横スクロールなし・文字/ボタン見切れなし・タップ領域確保・縦1列基本）
- 読み込み中・エラー時の表示が日本語で分かりやすいか
- データ保存（localStorage/IndexedDB）がリロード後も復元されるか
- API失敗時にクラッシュせず日本語でエラー表示されるか
- 秘密情報（APIキー等）がコード・ログ・コミット差分に混入していないか
- ブラウザのコンソールエラーが出ていないか

## 3. Gitの確認

- `git status` / `git diff --stat`で意図しないファイルが含まれていないか確認する
- `.env`等の秘密情報ファイルがステージされていないか確認する
- コミットメッセージが変更内容を正しく表しているか

## 4. サブエージェントによるレビュー（推奨）

可能であれば、コミット前に`code-reviewer`・`security-reviewer`・`mobile-ui-reviewer`サブエージェントでレビューし、指摘があれば対応してから公開する。

## 5. 報告

`.claude/rules/testing.md`の完了報告形式で、確認済み項目と未確認項目（実機確認が必要な項目等）を分けて初心者向けの日本語で報告する。

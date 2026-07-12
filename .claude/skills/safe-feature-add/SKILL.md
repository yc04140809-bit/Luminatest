---
name: safe-feature-add
description: My Chaos AI Suiteに新機能を安全に追加するときの手順。ケイオス師匠から新機能の実装指示が来たときに使う。
---

# safe-feature-add — 安全な機能追加

My Chaos AI Suiteは「既存機能を絶対に壊さない」「1回の依頼につき原則1機能」が最重要ルール。新機能を追加するときは次の順で進める。

## 1. 着手前の調査

- `chaos-ai-suite/README.md`と`.claude/rules/project-context.md`で、似た機能が既にないか・関連する既存コンポーネントがないか確認する
- 触る予定のファイル・型定義（`packages/shared`）・API（`packages/backend`）・保存先（localStorage/IndexedDBのキー）を洗い出す
- `.claude/rules/decisions.md`を確認し、過去の設計判断（データ保存方針・AI呼び出しパターン等）と矛盾しないか確認する
- 有料API・新規npmパッケージが必要なら、目的・無料代替の有無・料金発生の可能性・既存環境への影響を先にケイオス師匠へ説明し、実装前に確認を取る

## 2. 実装方針

- 新しいAI呼び出しは`llmClient.ts`の`callTool`（ツール強制呼び出し）パターンに合わせる
- データ保存はサーバーではなく、localStorage（小さいデータ）またはIndexedDB（画像・音声・動画等のBlob）
- 画面は既存パターン（サイドバーのカード → フルスクリーンモーダル`fixed inset-0 z-[70]`、縦1列、`office-*`トークン、共通クラス定数）を踏襲する（詳細: `.claude/rules/mobile-first.md`）
- 既存コード・既存デザイン・設定ファイル・環境変数を、明確な理由なく削除・全面置換しない

## 3. 実装中

- 1回の依頼につき原則1機能。関係のない大規模リファクタや別機能の変更を混ぜない
- 保存データ構造を変える場合は、既存データとの互換性・移行方法を先に確認する

## 4. 実装後の確認

- `npm run typecheck` / `npm run build`（`chaos-ai-suite/`直下）でエラーがないか確認する（編集のたびにPostToolUseフックが自動で型チェックする設定が入っているが、まとまった変更の後は手動でも実行して確認する）
- バックエンドに変更があれば`npm run test --workspace packages/backend`
- 可能であれば`code-reviewer`・`security-reviewer`・`mobile-ui-reviewer`サブエージェントでレビューする
- `.claude/rules/testing.md`の完了報告形式に沿って、初心者向けの日本語でケイオス師匠に報告する

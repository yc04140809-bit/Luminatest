# CLAUDE.md — My Chaos AI Suite

このファイルは、Claude Codeが毎回ゼロから調査しなくても開発を始められるようにするための「基本方針」だけをまとめたものです。詳細ルールは `.claude/rules/` 配下に分けてあります。

## プロジェクトについて

- プロジェクト名: My Chaos AI Suite
- 目的: 複数のAI社員（ケイオス／ネムリ／アリア／レヴィ／ミライ／セイラ）に仕事を依頼し、文章作成・SNS運用・note制作・営業支援・案件対応・資料作成・開発支援・動画生成などを1つのアプリで行えるAI業務支援サービスを作る
- 想定ユーザー: AI初心者・個人事業主・小規模事業者・中小企業・スマホ中心で仕事をする人・文章作成やSNS運用を効率化したい人
- ユーザーの呼び方: 「ケイオス師匠」。プログラミング初心者

## 重要: このリポジトリの実体（要確認事項ではなく調査済みの事実）

このGitリポジトリのルート（`/home/user/Luminatest`）には、現在の本体アプリ以外に、過去に作られた独立した試作HTML（`index.html`、`care-training.html`、`img/`）が含まれています。これらはnpm workspacesに含まれない単体ファイルで、**現在アクティブな開発対象ではありません**。

**実際に開発しているアプリは `chaos-ai-suite/` ディレクトリの中です。** 作業・コマンド実行は基本的にすべて `chaos-ai-suite/` 内（またはそこをcwdとして）行ってください。

## 技術構成（package.jsonとコードを確認した事実）

- npm workspaces モノレポ: `packages/shared`（共通型定義・シードデータ）/ `packages/backend`（Fastify + WebSocket）/ `packages/frontend`（Vite + React + TypeScript + Tailwind）
- バックエンドに永続DBはなし。`OfficeStore`はインメモリで、Anthropic API（`@anthropic-ai/sdk`）をツール強制呼び出しで使う
- Render無料プランはサーバー側ディスクが再デプロイで消えるため、機能ごとのデータは**フロントエンドのlocalStorage / IndexedDBに保存**する方針が定着している
- APIキー等の秘密情報は`packages/backend/.env`（`.gitignore`対象）＋設定画面のGUIで管理する。コードに直書きしない

## 開発コマンド（package.jsonで確認済み・`chaos-ai-suite/`直下で実行）

- `npm run dev:backend` / `npm run dev:frontend` — 開発サーバー起動（別プロセス、ポート4000 / 5173）
- `npm run build` — shared→backend→frontendの順に全ワークスペースをビルド
- `npm run typecheck` — 全ワークスペースの型チェック
- `npm run test --workspace packages/backend` — バックエンドのテスト（`node:test`。フロントエンドには現時点でテストコマンドは存在しない）

## 基本方針

1. 既存機能を絶対に壊さない。壊れる可能性があれば実装前に報告する
2. 1回の依頼につき原則1機能。大規模な同時変更はしない
3. 推測で実装しない。コードから確認できることは調べる。確認できない重要事項はケイオス師匠に確認する
4. 有料API・新規パッケージ追加時は、目的・無料代替の有無・料金発生の可能性・既存環境への影響を先に説明する
5. スマホでの使いやすさを最優先する（詳細: `.claude/rules/mobile-first.md`）
6. 安全ルールの詳細: `.claude/rules/safety.md`
7. テスト・品質確認・完了報告の形式: `.claude/rules/testing.md`
8. プロジェクトの構成・現在の機能一覧の参照先: `.claude/rules/project-context.md`
9. 過去の重要な決定事項の記録: `.claude/rules/decisions.md`（新しい決定はここに追記していく）
10. 自動品質保証レイヤー（Hooks・Subagents・Skills）の詳細: `.claude/rules/quality-automation.md`

## 報告のしかた

ケイオス師匠はプログラミング初心者です。チャットでの説明・完了報告は、専門用語だけで終わらせず、中学生でも分かる日本語で書く。専門用語を使うときは直後に簡単な意味を添える。動作確認していないことを「確認済み」と言わない。

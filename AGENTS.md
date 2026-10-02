# AGENTS.md — AIエージェント共通ルール

このファイルは **Codex(OpenAI)** が自動で読み込むプロジェクト説明書です。
Claude Code も `CLAUDE.md` 経由で同じ内容を読み込みます。
**ルールを変えるときは、このファイルだけを編集してください**(二重管理を防ぐため)。

## プロジェクト概要

Lumina事業部の各種AIサービス(静的HTML + Vercel Serverless Functions)。

| ファイル | 内容 | 公開先 |
|---|---|---|
| `koufuku-ai.html` + `img/koufuku/` | 幸せ設計AI(MVP) | GitHub Pages(`claude/koufuku-ai-phase18` ブランチから自動デプロイ) |
| `index.html` + `img/kaosu/` | ケイオスちゃん チャット | — |
| `care-training.html` + `img/care/` | 研修資料作成AI ケアちゃん | — |
| `api/kaosu-chat.js` | ケイオスちゃん実AI接続用 BFF(Anthropic API 中継) | Vercel |
| `api/admin-github.js` | CMS管理画面用 BFF(GitHub Contents API 中継) | Vercel |

- ビルド工程・パッケージマネージャーは無し(素のHTML/JS)。
- `.github/workflows/deploy-mvp-pages.yml` は幸せ設計AIだけを公開する。他のHTMLを公開対象に加えないこと。

## 絶対に守るルール

1. **秘密情報をコードに書かない。** APIキー・トークン・パスワードは Vercel の環境変数のみ
   (`ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`, `GITHUB_ADMIN_TOKEN` など)。`.env*` はコミットしない。
2. **フロントとBFFの入出力形式を壊さない。**
   - `api/kaosu-chat.js` の入力は `{ system, userContext, recentConversation, currentMessage, intent }`、
     出力は `{ reply }`。失敗時は必ず non-2xx を返す(フロントがルールベース応答へフォールバックするため)。
3. **既存ファイルの無関係な箇所を整形・改変しない。** 差分は依頼内容に必要な範囲だけにする。
4. コメントは日本語で、「なぜそうしたか」を書く(既存コードのスタイルに合わせる)。
5. エラー処理を省略しない(タイムアウト・non-2xx・JSONパース失敗を考慮)。

## 動作確認

- HTML: ブラウザで直接開いて確認(`python3 -m http.server` などで配信)。
- API: `node --check api/*.js` で最低限の構文チェック。本番確認は Vercel のプレビューデプロイで行う。

## Claude Code と Codex の分担・引き継ぎ

同じリポジトリを2つのAIで扱うため、以下で衝突を防ぐ。

- **ブランチを分ける。** Claude Code は `claude/*` または `ccr-*`、Codex は `codex/*` を使う。
  同じブランチを同時に編集しない。統合は Pull Request で行う。
- **レビューを相互に行う。** 片方が作ったPRを、もう片方にレビューさせる
  (例: Claude Code が作ったPRに `@codex review` とコメント)。
- **引き継ぎメモ。** 作業を途中で渡すときは PR 本文に
  「やったこと / 残タスク / 注意点」を3行以上で書く。
- `main` へ直接 push しない。

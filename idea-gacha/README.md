# 🧪 IDEA GACHA v0.1

「まだ誰も作ってないもの、回してみる？」

異分野のアイデア（技術・人間の欲求・市場・仕組み・ワイルドカード）を4つ衝突させ、AIが「その組み合わせだからこそ成立する新しい価値」を発明するガチャアプリです。

## 起動方法

```bash
npm install
npm run dev
```

`http://localhost:5173/` を開いてください（スマートフォン幅で確認する場合はブラウザの端末エミュレーションを使用）。

## DEMO MODE

`.env` を作らず、または `VITE_ANTHROPIC_API_KEY` を空のままにすると **DEMO MODE** で起動します。
API未接続でもガチャ演出・結果表示・スコア・保存・削除まで全機能を確認できます（画面上部に DEMO MODE バッジが表示されます）。

## AI APIを接続する場所

1. `.env.example` を `.env` にコピー
2. `VITE_ANTHROPIC_API_KEY` に Anthropic の API キーを設定
3. 開発サーバーを再起動

サービス層は `src/services/ideaGenerator.ts`（オーケストレーション）と `src/services/providers/claudeProvider.ts`（Claude実装）に分離されています。OpenAI や Gemini に切り替える場合は `src/services/providers/types.ts` の `AIProvider` インターフェースを実装したファイルを追加し、`ideaGenerator.ts` の `provider` を差し替えるだけで対応できます。

> 注意: MVPではブラウザから直接Anthropic APIを呼び出しています。本番運用ではAPIキーがクライアントに露出しないよう、バックエンド経由のプロキシに置き換えてください。

## ビルド

```bash
npm run build
```

## 技術構成

React + TypeScript + Vite + Tailwind CSS v4

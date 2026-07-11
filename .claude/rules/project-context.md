# プロジェクト構成・現状（事実ベース）

このファイルは「構成」を記録する。現在の機能一覧の詳細や実装の経緯は `chaos-ai-suite/README.md` に随時まとまっているので、機能追加のたびにここへ複製しない（情報が二重管理で古くなるのを防ぐため）。

## リポジトリの構造

```
/home/user/Luminatest/                          ← Gitリポジトリのルート（Claude Codeの作業ディレクトリ）
├── index.html, care-training.html, img/        ← 過去の独立した試作HTML（アクティブ開発対象外）
└── chaos-ai-suite/                              ← 本体アプリ（実際の開発対象はここ）
    ├── packages/shared/                          ← 共通型定義・シードデータ
    ├── packages/backend/                         ← Fastify + WebSocket（AIオーケストレーションAPI）
    ├── packages/frontend/                        ← React + TypeScript + Tailwind（スマホ最優先UI）
    └── README.md                                 ← 実装済み機能の詳細な一覧・設計メモ
```

## バックエンドの前提

- 永続DBなし。`OfficeStore`はインメモリで、サーバー再起動・再デプロイで消える
- AI呼び出しは`llmClient.ts`が`@anthropic-ai/sdk`をラップし、`tool_choice`でツール強制呼び出しをして構造化データを得る方式に統一されている
- 新しい非同期AI機能を追加する場合も、この`callTool`パターンを踏襲する（Web検索が必要な場合は`callToolWithWebSearch`のような拡張例もある）

## フロントエンドの前提

- Render無料プランはサーバー側ディスクが再デプロイで消えるため、**機能ごとのデータはブラウザのlocalStorage / IndexedDBに保存**する方針が定着している（`localStorage`は小さいデータ、`IndexedDB`は画像・音声・動画等の大きいBlob向け）
- 各機能は独立したReactコンポーネント1つとして追加し、サイドバーのカードから開く設計（詳細: `mobile-first.md`）
- バックアップセンター（`utils/backup.ts`）が各機能のlocalStorage/IndexedDBキーをカテゴリ別にまとめてJSON書き出し・復元できる。新しい保存キーを追加したら、このカテゴリ一覧への追加を検討する

## デプロイ

- Render（無料プラン想定）を主な想定デプロイ先として設計されている（詳細な手順はREADME.mdの「本番デプロイ」章）
- ユーザーはPCを持たず、デプロイ後のURLをスマホのブラウザで開いて操作する運用

## 現在の機能について

このプロジェクトは頻繁に機能追加されている。**現在実装済みの機能一覧・各機能の詳細設計は `chaos-ai-suite/README.md` を参照すること**（このファイルには複製しない）。

## 今後の予定

特定の期限つきロードマップは今のところ存在しない。ケイオス師匠から都度、新機能の実装指示書が渡される運用。

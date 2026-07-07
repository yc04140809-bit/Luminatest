# My Chaos AI Suite

自律型AI社員管理・実務自動化アプリケーション。代表取締役が6人のAI社員（ケイオスちゃん／ネムリちゃん／アリアちゃん／レヴィちゃん／ミライちゃん／セイラちゃん）を従え、実際のビジネス自動化とゲームライクなオフィス管理を両立する。

## アーキテクチャ

npm workspaces によるモノレポ構成。

```
chaos-ai-suite/
├── packages/
│   ├── shared/     # 共通型定義・シードデータ（Agent / Task / Message / OfficeState）
│   ├── backend/     # Fastify製オーケストレーションAPI + WebSocket配信
│   └── frontend/    # React + TypeScript + Tailwind製ゲームライクUI
├── package.json      # ワークスペースルート
└── tsconfig.base.json
```

### packages/shared

`Agent` `Task` `Message` `OfficeState` の型定義と、6名のAI社員の初期プロファイル（役割・性格・口調・システムプロンプト・トリガー条件）をシードデータとして持つ。backend / frontend はどちらもこのパッケージをビルド成果物（`dist/`）経由で参照する。

- `src/types/agent.ts` — AI社員のプロファイル型。GUIからの追加・編集・削除・役割変更を前提に、`systemPrompt` `responsibilities` `triggers` `model` などすべて編集可能なフィールドとして設計。
- `src/types/task.ts` — 代表の指示から分解されるタスク型。`parentTaskId` / `subtaskIds` でパイプライン（分解→配分→実行）を表現し、`approval` フィールドでHuman-in-the-loopの承認ゲートを表現する。
- `src/types/message.ts` — 社内チャット（Slack/Discord風ログ）のメッセージ型。エージェント間の自律的なタスクパスを可視化する元データ。
- `src/types/officeState.ts` — フロントエンドがオフィスビュー／タイムラインビュー双方を描画するためのスナップショット型、およびWebSocketで流すイベント型 `OfficeEvent`。
- `src/data/seedAgents.ts` — 6名の初期プロファイル本体。

### packages/backend

Fastify製API。Step1では永続化層を持たず、`OfficeStore`（インメモリ）がシード状態から起動する。

- `REST`: `/api/agents` `/api/tasks` `/api/messages`（CRUD + 承認/差し戻しエンドポイント `/api/tasks/:id/approve` `/api/tasks/:id/reject`）
- `WS`: `/ws/office` — 接続時にOfficeStateのスナップショットを送信し、以後は状態変化を `OfficeEvent` としてプッシュ配信
- `src/orchestration/agentRuntime.ts` — LLM呼び出し・エージェント間ハンドオフ・タスク分解会議シミュレーションを行うオーケストレーション層のインターフェースのみ定義（実装はStep2）

### packages/frontend

Vite + React + TypeScript + Tailwind。Step1時点では `/api/agents` を取得してカード表示するだけの疎通確認用シェル。ゲームライクな2Dオフィスビュー・社内チャットログ・代表コマンドセンターはStep3で実装する。

## セットアップ

```bash
cd chaos-ai-suite
npm install
npm run build:shared   # backend/frontend は shared のビルド成果物(dist)を参照するため先にビルドが必要
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173 (Viteが /api, /ws を backend にプロキシ)
```

## 今後のステップ

- **Step2**: `agentRuntime.ts` を実装し、LLM API（Anthropic）と連携したイベント駆動の自律実行ループ（タスク実行→次担当の指名→状態更新）を構築。
- **Step3**: ゲームライクな2Dオフィスビュー（デスク配置・ステータスアイコン・吹き出し）、社内チャット風タイムライン、代表コマンドセンター（全体指示／個別メンション）をWebSocket購読で実装。
- **Step4**: AI社員のプロンプト・役割をGUIから追加・編集・削除できる設定画面を実装。

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
- `src/types/theme.ts` — 管理画面の配色設定型（`ThemeTokens` `ThemePreset` `ThemeSettings`）。
- `src/data/seedAgents.ts` — 6名の初期プロファイル本体。
- `src/data/themePresets.ts` — プリセットテーマ4種（サイバーネオン／ロイヤルパープル／デイライト／モノクローム）と、プリセット＋個別上書きを合成する`resolveThemeTokens`。

### packages/backend

Fastify製API。永続化層は持たず、`OfficeStore`（インメモリ）がシード状態から起動する。

- `REST`: `/api/agents` `/api/tasks` `/api/messages`（CRUD + 承認/差し戻しエンドポイント `/api/tasks/:id/approve` `/api/tasks/:id/reject`）、`/api/directives`（全体指示／`targetAgentId`指定で個別メンション指示）、`/api/theme`（GET/PATCH、プリセット切り替え・カラー上書き・リセット）
- `WS`: `/ws/office` — 接続時にOfficeStateのスナップショットを送信し、以後は状態変化を `OfficeEvent` としてプッシュ配信
- `src/orchestration/` — エージェント・オーケストレーション層
  - `llmClient.ts` — Anthropic APIをツール強制呼び出し（`tool_choice`）でラップし、構造化レスポンスを得るクライアント。APIキー未設定でもサーバー起動は失敗させず、実際の呼び出し時にのみエラーを返す遅延初期化。
  - `agentExecutor.ts` — 1タスクを担当エージェントに実行させ、成果物本文と次アクション（`complete` / `handoff` / `request_approval`）を得る。
  - `taskDecomposer.ts` — セイラちゃん×レヴィちゃんの作戦会議として、代表の指示を実行可能なタスク群に分解する。
  - `agentRuntime.ts` — `dispatchDirective`（全体指示: 作戦会議→タスク生成→担当AIへ自動配分→実行→ハンドオフ連鎖 or 承認ゲート）と `dispatchMention`（個別メンション: 会議を挟まず直接1エージェントへタスク化）の2系統のイベント駆動ループ。無限ハンドオフを防ぐ上限（`MAX_HANDOFFS`）を持ち、重要な成果物は必ず`awaiting_approval`で停止させる。
  - `agentRuntime.test.ts` — 決定論的なスタブLLMクライアントで分解→実行→ハンドオフ→承認ゲート→無限ループ防止→個別メンションを検証する`node:test`ベースのテスト（`npm run test --workspace packages/backend`で実行、実APIキー不要）。
- `src/store/officeStore.ts` の `updateTheme` — プリセット切り替え時は個別上書きをリセット、`overrides`の部分マージ、`resetOverrides`での一括リセットに対応（`officeStore.test.ts`でカバー）。

### packages/frontend

Vite + React + TypeScript + Tailwind製のゲームライクなダーク/ネオンUI。`/ws/office` をリアルタイム購読し、ポーリングなしで全画面が更新される。

- `hooks/useOfficeSocket.ts` — WebSocketを購読し、`OfficeEvent`を適用してOfficeStateをローカルにミラーリングするreducer。切断時は自動再接続する。
- `api/officeApi.ts` — 指示投入・承認/差し戻しのPOSTのみを担うAPIクライアント（状態反映はWS経由）。
- `components/OfficeBoard.tsx` + `AgentDesk.tsx` — `deskPosition`に基づく2Dオフィスビュー。ステータスアイコン（💤🤔📝💬👀）・進行中タスクの吹き出し・作戦会議中バナーを表示し、デスクをクリックするとコマンドセンターの宛先が自動で切り替わる。
- `components/ChatTimeline.tsx` + `MessageBubble.tsx` — Slack/Discord風の社内チャットログ。メッセージ種別（指示・ハンドオフ・承認依頼・システムログ等）ごとに色分け。
- `components/CommandCenter.tsx` — 全体指示／個別メンション指示のフォーム（`POST /api/directives`）。
- `components/ApprovalQueue.tsx` — `awaiting_approval`のタスクを一覧表示し、承認/差し戻しボタンから`/api/tasks/:id/approve|reject`を呼ぶHuman-in-the-loopゲート。
- `components/SettingsPanel.tsx` — 管理画面（ヘッダーの⚙️から開くドロワー）。プリセットテーマの切り替え、7トークンのカスタムカラーピッカー、AI社員ごとのアクセントカラー編集を提供。`hooks/useApplyTheme.ts`が`OfficeState.theme`を`:root`のCSSカスタムプロパティ（`--office-*`）へ反映し、Tailwindの`office.*`カラーがすべてこれを参照するため、ビルド不要で全画面に即時反映される。
- `components/ChibiAvatar.tsx` — コードだけで描画する（画像アセット不要の）ちびキャラクター。髪・襟元の色はAI社員の`accentColor`に追従し、呼吸・まばたきを常時、作業中（thinking/writing等）はタイピングの手の動き、作戦会議中は金色のパルスリングをCSSアニメーションで表現。`AgentDesk.tsx`側でタスク完了（active→standby遷移）を検知し、✨のスパークル演出を一時表示する。

## セットアップ

```bash
cd chaos-ai-suite
npm install
npm run build:shared   # backend/frontend は shared のビルド成果物(dist)を参照するため先にビルドが必要
ANTHROPIC_API_KEY=sk-ant-xxxx npm run dev:backend   # http://localhost:4000（未設定でも起動はする。指示投入時にエラーになるだけ）
npm run dev:frontend    # http://localhost:5173 (Viteが /api, /ws を backend にプロキシ)
```

代表からの指示を投げるには:

```bash
curl -X POST http://localhost:4000/api/directives \
  -H "Content-Type: application/json" \
  -d '{"directive":"新サービスを立ち上げたい"}'
```

`202 Accepted` が即座に返り、以後は `/ws/office` のイベント（`message_created` / `task_updated` / `agent_updated`）でオーケストレーションの進捗が流れる。

個別メンション指示は、コマンドセンターの宛先セレクトでAI社員を選ぶか、オフィスビューでそのデスクをクリックすると宛先が自動で入る。

配色は、ヘッダー右上の⚙️アイコンから開く設定パネルでいつでも変更できる（プリセット4種＋カスタムカラー＋AI社員ごとのアクセントカラー）。

## 今後のステップ

- **Step4**: AI社員のプロンプト・役割・トリガー・LLMモデル設定をGUIから追加・編集・削除できる設定画面を実装（現状はAPI経由でのみ可能）。

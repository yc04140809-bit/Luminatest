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
- `src/types/tool.ts` — 外部ツール実行の型（`ToolDefinition` `PendingToolCall`）。`Task.pendingToolCall`は、AI社員が外部ツールの実行を申請した内容を保持し、既存の`Task.approval`承認ゲートをそのまま再利用してHuman-in-the-Loopを実現する。

### packages/backend

Fastify製API。永続化層は持たず、`OfficeStore`（インメモリ）がシード状態から起動する。

- `REST`: `/api/agents`（フルCRUD: GET一覧/単体、POST新規、PATCH更新、DELETE削除）、`/api/tasks`（CRUD + 承認/差し戻しエンドポイント `/api/tasks/:id/approve` `/api/tasks/:id/reject`）、`/api/messages`、`/api/directives`（全体指示／`targetAgentId`指定で個別メンション指示）、`/api/theme`（GET/PATCH、プリセット切り替え・カラー上書き・リセット）、`/api/secrets`（GET一覧・PUT保存・DELETE削除、外部連携APIキー。値そのものは絶対にレスポンスへ含めない）
- `WS`: `/ws/office` — 接続時にOfficeStateのスナップショットを送信し、以後は状態変化を `OfficeEvent` としてプッシュ配信
- `src/orchestration/` — エージェント・オーケストレーション層
  - `llmClient.ts` — Anthropic APIをツール強制呼び出し（`tool_choice`）でラップし、構造化レスポンスを得るクライアント。APIキー未設定でもサーバー起動は失敗させず、実際の呼び出し時にのみエラーを返す遅延初期化。
  - `agentExecutor.ts` — 1タスクを担当エージェントに実行させ、成果物本文と次アクション（`complete` / `handoff` / `request_approval`）を得る。
  - `taskDecomposer.ts` — セイラちゃん×レヴィちゃんの作戦会議として、代表の指示を実行可能なタスク群に分解する。
  - `agentRuntime.ts` — `dispatchDirective`（全体指示: 作戦会議→タスク生成→担当AIへ自動配分→実行→ハンドオフ連鎖 or 承認ゲート）と `dispatchMention`（個別メンション: 会議を挟まず直接1エージェントへタスク化）の2系統のイベント駆動ループ。無限ハンドオフを防ぐ上限（`MAX_HANDOFFS`）を持ち、重要な成果物は必ず`awaiting_approval`で停止させる。
  - `agentRuntime.test.ts` — 決定論的なスタブLLMクライアントで分解→実行→ハンドオフ→承認ゲート→無限ループ防止→個別メンション→外部ツール実行申請を検証する`node:test`ベースのテスト（`npm run test --workspace packages/backend`で実行、実APIキー不要）。
  - `toolApproval.ts` — `Task.pendingToolCall`を持つタスクが承認された時に実際にツールを実行する処理。ルート層から切り離してあり、単体テスト可能。
- `src/store/officeStore.ts` の `updateTheme` — プリセット切り替え時は個別上書きをリセット、`overrides`の部分マージ、`resetOverrides`での一括リセットに対応（`officeStore.test.ts`でカバー）。
- `src/config/secretsStore.ts` — 外部連携APIキーの管理。GUIからの更新は即座にメモリと`packages/backend/.env`（`.gitignore`対象）の両方へ反映され、再起動しても失われない。改行を含む値（Google秘密鍵のPEM等）は`\n`エスケープで1行に保持。値はHTTPレスポンスに一切含まれない（`configured`真偽値のみ）。テストでは実ファイルを汚さないよう一時パスを注入する（`secretsStore.test.ts`）。
- `src/tools/` — 外部ツール実行（Tool Calling）の基盤。
  - `types.ts` — `ToolExecutor`共通インターフェース（`definition` + `execute()`）。設定未了時は実行時にエラーを投げる遅延失敗方針（`llmClient.ts`と同じ）。
  - `toolRegistry.ts` — `ToolRegistry`。どのAI社員がどのツールを使えるかを管理し（`listForAgent` `canUse`）、`agentExecutor`がLLMへの提示に、`agentRuntime`/`toolApproval`が実行時の権限チェックに使う。
  - `googleAuth.ts` — Googleサービスアカウントの秘密鍵でJWTを自己署名しアクセストークンに交換する（対話的な同意画面なしで完結するservice-account認可）。Calendar / Driveツールが共通利用。
  - `twitterAuth.ts` — X API v2投稿用のOAuth 1.0a署名付きAuthorizationヘッダーを生成する（HMAC-SHA1、`node:crypto`のみで実装、追加npm依存なし）。
  - `notionExportTool.ts`（ネムリちゃん） — 簡易Markdown→Notionブロック変換のうえ、指定データベースへ新規ページを作成。
  - `googleDriveExportTool.ts`（ネムリちゃん） — テキストをGoogleドキュメント形式に変換しつつDriveへアップロード（multipart upload）。
  - `slackNotifyTool.ts`（セイラちゃん） — Incoming Webhookへの通知。
  - `googleCalendarTool.ts`（セイラちゃん） — 指定カレンダーへ予定を登録。
  - `snsPostTool.ts`（ミライちゃん） — `platform`に応じてX（OAuth 1.0a、テキストのみ）またはInstagram（Graph API、メディアコンテナ作成→公開の2段階）へ投稿。
  - `index.ts` の `buildToolRegistry()` — 上記5ツールを担当AI社員に紐づけて登録する。
  - `toolRegistry.test.ts` — 権限チェック・一覧取得のテスト。

#### 外部ツール実行（Tool Calling）とHuman-in-the-Loop

`agentExecutor.ts`は各AI社員に対し、`toolRegistry.listForAgent(agent.id)`で「使える外部ツール一覧」をプロンプトに提示する。LLMの意思決定には`complete` / `handoff` / `request_approval`に加えて`tool_call`（`toolId` + `toolInput`）を追加してあり、エージェントが「実際にNotionへ保存したい」「SNSに投稿したい」と判断すると、`agentRuntime.ts`がそのタスクを`awaiting_approval`にし、`Task.pendingToolCall`へ申請内容を記録して**そこで停止する**（＝まだ何も実行されない）。

代表が`POST /api/tasks/:id/approve`を叩いて初めて`toolApproval.ts`の`executeApprovedToolCall`が呼ばれ、`ToolRegistry`から実際のExecutorを引いて実行する。差し戻し（`reject`）の場合は`pendingToolCall`を破棄するだけで何も実行しない。フロントエンドでは新しい申請が現れた瞬間に`ToolApprovalModal`が自動でポップアップし、「[エージェント名]が外部連携の実行を申請しています。承認しますか？」と表示する。

### packages/frontend

Vite + React + TypeScript + Tailwind製のゲームライクなダーク/ネオンUI。`/ws/office` をリアルタイム購読し、ポーリングなしで全画面が更新される。

- `hooks/useOfficeSocket.ts` — WebSocketを購読し、`OfficeEvent`を適用してOfficeStateをローカルにミラーリングするreducer。切断時は自動再接続する。
- `api/officeApi.ts` — 指示投入・承認/差し戻しのPOSTのみを担うAPIクライアント（状態反映はWS経由）。
- `components/OfficeBoard.tsx` + `AgentDesk.tsx` — オフィス写真（`public/office/office-{day,night}.png`）を背景に、`utils/deskAnchors.ts`で定義した実際のデスク位置へAI社員を重ねるビュー。`hooks/useTimeOfDay.ts`が現在時刻（6-18時=昼、それ以外=夜）に応じて背景を自動切り替え。各社員は`avatarUrl`があれば実イラスト（顔を中心にクロップ）、なければ`ChibiAvatar`を表示。ステータスアイコン（💤🤔📝💬👀）・進行中タスクの吹き出し・作戦会議中バナーを表示し、デスクをクリックするとコマンドセンターの宛先が自動で切り替わる。
- `components/ChatTimeline.tsx` + `MessageBubble.tsx` — Slack/Discord風の社内チャットログ。メッセージ種別（指示・ハンドオフ・承認依頼・システムログ等）ごとに色分け。
- `components/CommandCenter.tsx` — 全体指示／個別メンション指示のフォーム（`POST /api/directives`）。
- `components/ApprovalQueue.tsx` — `awaiting_approval`のタスクを一覧表示し、承認/差し戻しボタンから`/api/tasks/:id/approve|reject`を呼ぶHuman-in-the-loopゲート。
- `components/SettingsPanel.tsx` — 管理画面（ヘッダーの⚙️から開くドロワー、「配色」「AI社員管理」「外部連携」の3タブ）。
  - 配色タブ: プリセットテーマの切り替え、7トークンのカスタムカラーピッカー、AI社員ごとのアクセントカラークイック編集。`hooks/useApplyTheme.ts`が`OfficeState.theme`を`:root`のCSSカスタムプロパティ（`--office-*`）へ反映し、Tailwindの`office.*`カラーがすべてこれを参照するため、ビルド不要で全画面に即時反映される。
  - AI社員管理タブ: `components/AgentManagerPanel.tsx`が全AI社員を一覧表示し、有効/無効の切り替え・編集・削除（確認ダイアログあり）・新規追加を行う。編集/追加は`components/AgentEditorModal.tsx`が担当し、名前・役職・役割キー・自己紹介・担当業務・トリガー・システムプロンプト・アバターURL・LLMモデル設定（provider/model/temperature/maxOutputTokens）まで、Agent型の全フィールドをGUIから変更できる。
  - 外部連携タブ: `components/IntegrationsPanel.tsx`がNotion / Google / Slack / X (Twitter) / Instagram / Anthropicの各APIキーをマスク入力で保存・クリアできる（`/api/secrets`）。保存済みの値は読み返さず「設定済み」バッジのみ表示する。
- `components/ToolApprovalModal.tsx` — 新しい`Task.pendingToolCall`（外部ツール実行申請）が現れた瞬間に自動表示されるポップアップ。`App.tsx`が既読の申請IDを`useRef`で追跡し、未読の申請のみをポップアップする。`components/ApprovalQueue.tsx`も、通常タスクとは別にツール名・入力内容をハイライト表示し、承認ボタンのラベルが「承認して実行」に変わる。
- `components/ChibiAvatar.tsx` — コードだけで描画する（画像アセット不要の）ちびキャラクター。`avatarUrl`未設定のAI社員のフォールバック表示。髪・襟元の色はAI社員の`accentColor`に追従し、呼吸・まばたきを常時、作業中（thinking/writing等）はタイピングの手の動き、作戦会議中は金色のパルスリングをCSSアニメーションで表現。`AgentDesk.tsx`側でタスク完了（active→standby遷移）を検知し、✨のスパークル演出を一時表示する。

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

### 外部連携のAPIキー設定

`ANTHROPIC_API_KEY`を含む全てのAPIキーは、起動後に設定パネルの「外部連携」タブから登録できる（`packages/backend/.env`に保存され、`.gitignore`対象。再起動不要で次回呼び出しから反映される）。各ツールに必要な値:

| ツール | 必要な値 | 備考 |
| --- | --- | --- |
| Notion保存（ネムリ） | `NOTION_API_KEY` `NOTION_DATABASE_ID` | Integrationを対象データベースに共有しておく |
| Google Drive保存（ネムリ） | `GOOGLE_SERVICE_ACCOUNT_EMAIL` `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` `GOOGLE_DRIVE_FOLDER_ID` | 保存先フォルダをサービスアカウントのメールアドレスと共有しておく |
| Googleカレンダー登録（セイラ） | 上記Google2点 + `GOOGLE_CALENDAR_ID` | 対象カレンダーもサービスアカウントと共有しておく |
| Slack通知（セイラ） | `SLACK_WEBHOOK_URL` | Incoming Webhookを作成して発行されるURL |
| X (Twitter) 投稿（ミライ） | `TWITTER_API_KEY` `TWITTER_API_SECRET` `TWITTER_ACCESS_TOKEN` `TWITTER_ACCESS_TOKEN_SECRET` | **単体のBearer Token（App-onlyトークン）では投稿できない**。ユーザーコンテキストのOAuth 1.0aクレデンシャル4点が必要（X Developer Portalでアプリに投稿権限を与えたうえでAccess Token/Secretを発行する） |
| Instagram投稿（ミライ） | `INSTAGRAM_ACCESS_TOKEN` `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Facebook Businessと連携したInstagramビジネスアカウントが前提。Feed投稿は画像URL必須（テキストのみの投稿は不可） |

Google系はサービスアカウント認可（JWT自己署名）を採用しているため、ブラウザでの対話的な同意画面は発生しない。対象のカレンダー/フォルダをサービスアカウントのメールアドレスと事前に共有しておくことだけが必要。

配色・AI社員の管理は、ヘッダー右上の⚙️アイコンから開く設定パネルでいつでも変更できる（配色: プリセット4種＋カスタムカラー、AI社員管理: 追加・編集・削除・有効/無効切り替え）。

## 今後のアイデア

- 新規追加したAI社員のオフィス上の立ち位置を、GUIから写真上のドラッグ＆ドロップで指定できるようにする（現状は`deskAnchors.ts`未登録なら中央にフォールバック）。
- OpenAI等、Anthropic以外のプロバイダにも`llmClient.ts`を対応させる。
- タスク履歴・チャットログの永続化（現状はプロセス再起動でシード状態にリセット）。
- X投稿での画像添付（現状はv1.1 media/upload連携が未実装でテキストのみ）。
- 外部連携の実行結果（Notionページ・Driveドキュメント・カレンダー予定等へのリンク）を、承認済みタスクの成果物としてUI上でもう少し見やすく提示する。

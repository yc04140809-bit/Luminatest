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
- `src/types/meeting.ts` — 自律型・戦略経営会議の型。`StrategyMeeting`は進行フェーズ（`opening→discussion→documentation→proposal→concluded`）・発言ログ（`MeetingStatement[]`）・議事録・タスク案・最終提案を保持する。既存の`ActiveMeeting`（「会議中で手が離せない」という軽量な社内ステータス）とは別物で、両者は併用される。

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

#### 自律型・戦略経営会議モード

代表が経営課題やアイデアのお題を投げると、6人のAI社員が自律的に発言し合い、結論まで進行する会議シミュレーション。

- `src/orchestration/meetingRuntime.ts` — 会議オーケストレーター。発言順制御・コンテキスト引き継ぎを担う。
  1. **開会**: セイラちゃん（`agent-sayla`）がお題から会議の目的を定義し、各メンバーへ意見を求める。
  2. **ディスカッション**: レヴィちゃん（開発視点）・ミライちゃん（拡散・トレンド視点）・ケイオスちゃん（リスク・顧客対応視点）が固定2ラウンド×3名＝計6発言のターン制ループで議論する。2ラウンド目は「他のメンバーの発言に反応・言及しながら」という指示を追加し、議論が積み上がる形にする。コスト・時間を有限に保つため、ラウンド数はLLM判断ではなく固定値（`DISCUSSION_ROUNDS = 2`）。
  3. **ドキュメント化**: ネムリちゃんが全発言を議事録に要約し、アリアちゃんがそれを実行可能なタスク箇条書きに変換する。
  4. **最終提案**: セイラちゃんが議事録・タスク案を踏まえ「代表、会議の結果、以下のプランを提案します」で締めくくる。
  - コンテキストの引き継ぎは、各発言生成時に`transcriptText()`でそれまでの全発言（発言者名付き）をプロンプトに含めることで実現している（各エージェントは常に会議の全文脈を見ながら発言する）。
  - 発言は`StrategyMeeting.statements`（会議室UI用の構造化ログ）と、通常の社内チャット（`type: "chat"`, `channel: "general"`）の両方へ同時に書き込まれる（dual-write）。これにより`ChatTimeline`にも各AI社員の口調のまま自然に発言が流れる。
  - 進行中は既存の`ActiveMeeting`（`store.startMeeting`/`endMeeting`）も併用し、参加AI社員のステータスを`meeting`にする。
  - 会議中にLLM呼び出しが失敗した場合は`StrategyMeeting.status`を`failed`にし、発言中フラグ（`currentSpeakerId`）と全参加者のステータスを確実にリセットしてから終了する。
  - 同時に進行できる会議は1つのみ（内部ガード＋ルート層のHTTP 409で二重に保証）。
  - `meetingRuntime.test.ts` — 決定論的なスタブLLMで、フェーズ進行・発言順・議事録/タスク化・最終提案・異常系（発言中の失敗で状態がきちんとリセットされるか）を検証する。
- `src/routes/meetings.ts` — `GET /api/meetings`（一覧）、`GET /api/meetings/:id`（単体）、`POST /api/meetings`（開始、`{ topic }`）。開始は時間のかかる非同期処理のため`202 Accepted`を即返し、進捗は`/ws/office`の`strategy_meeting_updated`イベントで配信する。

#### 便利・楽しい・驚きの3機能

既存の仕組み（社内チャット・AI社員の個性・承認フロー）だけで作った、業務効率化とゲーム性の3機能。

- **朝会ブリーフィング（便利）** — `src/orchestration/morningBriefing.ts`。前回の朝会以降のチャットログと承認待ち案件を、セイラちゃんが1通のメッセージ（`Message.type: "briefing"`）に要約する。1日1回だけ実行可能（`OfficeState.lastBriefingDate`、日本時間の日付で判定）。フロントエンドは`App.tsx`で、接続時に本日分が未実施なら自動で`POST /api/briefing`を叩く（`GET /api/briefing/status`で状態確認も可能）。二重実行は`lastBriefingDate`一致チェックで`409`になる。
- **オフィス雑談タイム（楽しい）** — `src/orchestration/officeBanter.ts`。有効なAI社員からランダムに2名を選び、業務と関係ない雑談を3ターン（`type: "banter"`）交わさせる。各AI社員の口調・キャラクターがそのまま出るのが狙い。`components/BanterLauncher.tsx`の「雑談を覗く」ボタンから`POST /api/banter`で起動。多重起動は内部の`running`フラグ＋ルート層`409`で防止。
- **忖度なしの物申し（驚き）** — `src/orchestration/riskReview.ts`。`agentRuntime.dispatchDirective`の中で、タスク分解の直後にケイオスちゃん（`agent-chaos`）へ「代表の指示・実行計画・直近のチャット履歴」を渡し、看過できない具体的な懸念があるときだけ`hasConcern: true`で理由付きの物申し（`type: "pushback"`）を投稿させる。懸念がなければ何も投稿しない（LLMの判断に任せることで「たまに」の頻度が自然に生まれる）。あくまで助言でありタスクの実行自体は止めない。レビュー自体が失敗してもディスパッチ全体には影響させない（try/catchで隔離）。
- いずれも`morningBriefing.test.ts` / `officeBanter.test.ts` / `agentRuntime.test.ts`（物申し用の2ケース）でカバーし、実際のAnthropic APIでも一連の動作を確認済み。

#### SNS分析AI（MVP）と将来のAI社員チーム拡張

「My Chaos AI SITE 全体イメージ」のうち、中核の**SNS分析AI**だけを先行実装したMVP。分析役はミライ（AIマーケティング責任者）のsystemPromptをそのまま使うため、GUIでミライの人格・方針を編集すると分析の観点も追従する。

- `src/orchestration/snsAnalyst.ts` — 投稿本文＋実績データ（閲覧数・いいね数・返信数・保存数・クリック数。閲覧数があればいいね率などの参考レートも自動計算してプロンプトに添付）を受け取り、10項目採点（各0〜10点、合計100点）・強み・改善点・コピペ可能なリライト案・総評を構造化して返す。採点キーとラベルは`shared/src/types/snsAnalysis.ts`で一元定義。範囲外・欠損スコアは0〜10にクランプ（`snsAnalyst.test.ts`でカバー）。
- `src/routes/sns.ts` — `POST /api/sns/analyze`。分析中はミライのステータスを「thinking」にし、完了時に社内チャットへ総合スコアを一言投稿する。
- フロントエンドは`components/SnsAnalysisLab.tsx`（サイドバーの「SNS分析ラボ」）。「新規分析」タブで投稿・実績を入力して分析、結果は端末のlocalStorage（`utils/snsPosts.ts`）に自動保存され、「過去の投稿」タブで一覧・展開・削除・**2件選択での項目別比較**ができる。Render無料プランはサーバー側ディスクが再デプロイで消えるため、書類保管庫と同じくlocalStorage保存を採用。
- **拡張設計**: 全体イメージの残りのAI社員（トレンド分析AI・投稿生成AI・A/BテストAI・note導線AI・データ分析AI）は、①`orchestration/`に「入力→ツール強制呼び出し→構造化結果」の分析モジュールを1ファイル追加、②`routes/sns.ts`に`/api/sns/*`エンドポイントを追加、③`SnsAnalysisLab`にタブを追加、の3ステップで同じパターンのまま増やせる。

#### AI Note Editor（売れるnote編集AI・MVP）

AIで書いた記事の下書きを貼るだけで、noteにそのまま投稿できる品質へ自動編集するスタジオ。編集役はネムリ（書類作成AI）のsystemPromptを使う。

- `src/orchestration/noteEditor.ts` — 「編集」と「診断」を別々のLLM呼び出しに分離（長文記事で出力上限に達するのを防ぎ、編集結果を先に表示できる）。編集は構成整理・見出し生成・スマホ向け改行・太字/引用の強調・箇条書き変換を行い、著者の口調と事実は変えないルール。診断は7項目採点（読みやすさ・冒頭の引き込み・完読可能性・共感性・保存されやすさ・分かりやすさ・CTAの強さ、各0〜100点）＋改善案＋離脱ポイント＋タイトル10案＋CTA提案を返す。9種類の編集モード（AI副業/初心者/ビジネス/ストーリー/体験談/教育/販売/SEO/ファン化）は`shared/src/types/noteEditor.ts`で方針テキストとして定義し、プロンプトに注入する。
- `src/routes/note.ts` — `POST /api/note/edit` / `POST /api/note/analyze`。入力は2万字上限（コスト暴走防止）。
- フロントエンドは`components/NoteEditorStudio.tsx`（サイドバーの「note編集スタジオ」）。①記事貼り付け＋モード選択→②AI編集→③noteプレビュー（`utils/markdownPreview.ts`の依存ゼロ・XSS対策済みレンダラー＋白背景の`note-preview` CSS）/Markdown切り替え→④診断→⑤エクスポート（コピー/.md保存）の縦1画面フロー。作業状態は`utils/noteDraft.ts`でlocalStorageに自動保存され、リロードしても復元される。
- 将来機能（サムネ案・Threads/X/Instagram導線・WordPress/PDF等の出力）は`/api/note/*`にエンドポイントを足し、スタジオにセクションを追加する同パターンで拡張する。テストは`noteEditor.test.ts`（モード注入・スコアのクランプ・平均点計算）。

**追加開発（第2弾）で入った機能:**

- **編集レベル5種**（`NOTE_EDIT_LEVELS`）: レイアウトのみ（＝改行・見出し調整専用モード。本文の意味・表現を一切変えない）／軽く整える／読みやすくする（標準）／売れる構成へ改善／プロ編集者モード。レベルごとの「やること・やらないこと」は`backend/noteEditor.ts`の`LEVEL_RULES`でプロンプト分岐し、UIには変更量の説明を常時表示して誤選択を防ぐ。
- **編集前/編集後/変更点の比較タブ**: 変更点は`utils/textDiff.ts`の文単位LCS差分（クライアント処理・AI不使用）。Markdown記号と空白を無視して比較するため、レイアウトだけの変更は差分に出ず、本文の追加（緑）・削除（赤取り消し線）だけが見える。AIのchangeSummaryも併記。
- **note用ワンタップコピー**（`utils/noteCopy.ts`・AI不使用）: 「note用」は見出し→■/▼、箇条書き→・、引用→｜、太字→【】に変換し連続空行を整理（noteのエディタはMarkdown貼り付けを書式化しないため）。ほかにMarkdownコピー／プレーンテキストコピー。
- **部分やり直し編集**: 段落をタップ→指示プリセット（もっと短く/分かりやすく/感情を込める等9種）→`POST /api/note/edit-section`。選択ブロックだけを送る小さな呼び出し（コスト対策）で、結果は新しい版として履歴に積まれる（全体は上書きしない）。
- **編集履歴と復元**（`utils/noteDraft.ts`の`versions[]`・AI不使用）: AI編集・部分編集・手動修正（Markdownビューで直接編集→保存）のたびに版を積み、元に戻す/やり直す/任意の版へ復元/複製が可能。localStorage保存で、将来クラウド保存へ移行しやすいよう1オブジェクトに閉じた構造。旧形式の下書きは読み込み時に自動移行。
- **UI整理**: 通常画面は「入力→レベル→AI編集→比較→診断→コピー/エクスポート」のみ。編集モード9種は「詳細編集」、部分編集・履歴は折りたたみに収納（スマホファースト）。
- AI呼び出し回数: 通常フローは従来どおり2回（編集+診断）のまま。比較・コピー・履歴は全てクライアント処理で0回。部分編集のみ使用時に小さい呼び出しが+1回。

**追加開発（第3弾）で入った機能:**

- **投稿前チェックリスト**（`NOTE_CHECKLIST_ITEMS`固定10項目）: タイトル整合・冒頭の引き・見出し数・段落の長さ・重複・CTA・誇大表現・根拠のない断定・有料導線・スマホ可読性を「問題なし/注意/改善推奨」の3段階で評価。**既存の診断呼び出しに相乗り**させたため追加のAI呼び出しは0回。AIの出力数やstatusの揺れはサーバー側で固定10項目に正規化する。エクスポートの直前に表示。
- **宣伝パック生成**（`POST /api/note/promo`・担当はミライ）: Threads10本（共感型/気づき型/体験談型/ノウハウ型/実は型/失敗談型/続きはnote型の切り口を分散）・X5本（140字以内）・Instagramキャプション3本・短い告知文3本・記事紹介文・プロフィール誘導文・販売note用CTA・無料note用CTAを一括生成。本文の繰り返し禁止・誇大表現禁止をプロンプトで強制。各投稿に個別コピーボタン。結果は下書きに保存されリロード後も残る。使用時のみ+1回のAI呼び出し。
- **参考構成モード**（`NOTE_STRUCTURE_TEMPLATES`10種・クライアント処理でコスト0）: 体験談/AI副業/ノウハウ/ツールレビュー/失敗談/比較記事/初心者向け解説/有料note販売/無料→有料導線/ストーリー型の一般的な構成パターン。選ぶとAI編集時に構成の指針としてプロンプトへ渡され、「骨組みを本文欄に挿入」でゼロからの下書きにも使える。他人の記事本文のコピーではなく一般的な型のみを定義。

### packages/frontend

Vite + React + TypeScript + Tailwind製のゲームライクなダーク/ネオンUI。`/ws/office` をリアルタイム購読し、ポーリングなしで全画面が更新される。

- `hooks/useOfficeSocket.ts` — WebSocketを購読し、`OfficeEvent`を適用してOfficeStateをローカルにミラーリングするreducer。切断時は自動再接続する。
- `api/officeApi.ts` — 指示投入・承認/差し戻しのPOSTのみを担うAPIクライアント（状態反映はWS経由）。
- `components/OfficeBoard.tsx` + `AgentDesk.tsx` — オフィス写真（`public/office/office-{day,night}.png`）を背景に、`utils/deskAnchors.ts`で定義した実際のデスク位置へAI社員を重ねるビュー。`hooks/useTimeOfDay.ts`が現在時刻（6-18時=昼、それ以外=夜）に応じて背景を自動切り替え。各社員は`avatarUrl`があれば実イラスト（顔を中心にクロップ）、なければ`ChibiAvatar`を表示。ステータスアイコン（💤🤔📝💬👀）・進行中タスクの吹き出し・作戦会議中バナーを表示し、デスクをクリックするとコマンドセンターの宛先が自動で切り替わる。
- `components/ChatTimeline.tsx` + `MessageBubble.tsx` — Slack/Discord風の社内チャットログ。メッセージ種別（指示・ハンドオフ・承認依頼・システムログ・朝会ブリーフィング・雑談・物申し等）ごとに色分け（雑談は斜体で表示し口調のカジュアルさを演出）。
- `components/CommandCenter.tsx` — 全体指示／個別メンション指示のフォーム（`POST /api/directives`）。
- `components/BanterLauncher.tsx` — 「雑談を覗く」ボタン（`POST /api/banter`）。朝会ブリーフィングはボタン操作不要で`App.tsx`が1日1回自動実行する（`utils/dateUtil.ts`の`todayInTokyo()`で判定）。
- `components/ApprovalQueue.tsx` — `awaiting_approval`のタスクを一覧表示し、承認/差し戻しボタンから`/api/tasks/:id/approve|reject`を呼ぶHuman-in-the-loopゲート。
- `components/SettingsPanel.tsx` — 管理画面（ヘッダーの⚙️から開くドロワー、「配色」「AI社員管理」「外部連携」の3タブ）。
  - 配色タブ: プリセットテーマの切り替え、7トークンのカスタムカラーピッカー、AI社員ごとのアクセントカラークイック編集。`hooks/useApplyTheme.ts`が`OfficeState.theme`を`:root`のCSSカスタムプロパティ（`--office-*`）へ反映し、Tailwindの`office.*`カラーがすべてこれを参照するため、ビルド不要で全画面に即時反映される。
  - AI社員管理タブ: `components/AgentManagerPanel.tsx`が全AI社員を一覧表示し、有効/無効の切り替え・編集・削除（確認ダイアログあり）・新規追加を行う。編集/追加は`components/AgentEditorModal.tsx`が担当し、名前・役職・役割キー・自己紹介・担当業務・トリガー・システムプロンプト・アバターURL・LLMモデル設定（provider/model/temperature/maxOutputTokens）まで、Agent型の全フィールドをGUIから変更できる。
  - 外部連携タブ: `components/IntegrationsPanel.tsx`がNotion / Google / Slack / X (Twitter) / Instagram / Anthropicの各APIキーをマスク入力で保存・クリアできる（`/api/secrets`）。保存済みの値は読み返さず「設定済み」バッジのみ表示する。
- `components/ToolApprovalModal.tsx` — 新しい`Task.pendingToolCall`（外部ツール実行申請）が現れた瞬間に自動表示されるポップアップ。`App.tsx`が既読の申請IDを`useRef`で追跡し、未読の申請のみをポップアップする。`components/ApprovalQueue.tsx`も、通常タスクとは別にツール名・入力内容をハイライト表示し、承認ボタンのラベルが「承認して実行」に変わる。
- `components/ChibiAvatar.tsx` — コードだけで描画する（画像アセット不要の）ちびキャラクター。`avatarUrl`未設定のAI社員のフォールバック表示。髪・襟元の色はAI社員の`accentColor`に追従し、呼吸・まばたきを常時、作業中（thinking/writing等）はタイピングの手の動き、作戦会議中は金色のパルスリングをCSSアニメーションで表現。`AgentDesk.tsx`側でタスク完了（active→standby遷移）を検知し、✨のスパークル演出を一時表示する。
- `components/MeetingLauncher.tsx` — お題を入力して「会議を開始」を押すと`POST /api/meetings`を叩くフォーム。既に会議進行中は入力・ボタンを無効化する。
- `components/MeetingRoom.tsx` — 戦略経営会議の「会議室」フルスクリーンモーダル。フェーズ進行バー（開会→ディスカッション→議事録・タスク化→最終提案）、劇本風の発言トランスクリプト（発言者名をAI社員のアクセントカラーで表示）を上から流し込み、会議完了後は議事録・タスク案・最終提案をまとめて表示する。`App.tsx`が`strategy_meeting_updated`イベントで新しい進行中の会議を検知すると（既読IDを`useRef`で追跡する、`ToolApprovalModal`と同じパターン）自動で開く。
- `hooks/useTypewriter.ts` + `components/SpeechBubble.tsx` — 1文字ずつ表示するタイプライター演出フック、およびそれを使った吹き出しコンポーネント。`OfficeBoard.tsx`が進行中の`StrategyMeeting.currentSpeakerId`と一致するAI社員の`AgentDesk`にだけ、その社員の直近の発言内容を`speechText`として渡し、頭上にタイピング風の吹き出しがリアルタイムで表示される。

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

### 本番デプロイ（Render / Railway等のPaaS向け）

開発時はフロントエンド（Vite, 5173番）とバックエンド（Fastify, 4000番）が別プロセスだが、本番用に`server.ts`がフロントエンドのビルド成果物（`packages/frontend/dist`）を同一originから静的配信できるようになっている（`packages/frontend/dist`が存在しない場合は静的配信を自動でスキップし、通常のAPIサーバーとして動く＝開発時は影響なし）。1つのWebサービスとしてデプロイ可能。

- ビルドコマンド: `npm install && npm run build`（shared→backend→frontendの順にビルドされる）
- 起動コマンド: `npm start`（内部で`packages/backend/dist/server.js`を起動）
- 必須環境変数: `PORT`（PaaS側が自動設定することが多い）、`ANTHROPIC_API_KEY`
- 任意環境変数: 他の外部連携キー（`NOTION_API_KEY`等、詳細は次項の表）も同様にプラットフォームの環境変数として設定可能。`secretsStore`は起動時に「`.env`ファイル → 未設定なら`process.env`」の順で読み込むため、プラットフォームの環境変数ダッシュボードから設定しておけば、`.env`ファイルが再デプロイで失われても最低限のキーは復元される。GUIの「外部連携」タブから更新した値は稼働中のインスタンスには即反映されるが、永続ディスクを持たないPaaSでは次回の**再デプロイ**時に消える可能性があるため、恒久的に使うキーはプラットフォームの環境変数ダッシュボード側に設定するのが安全。
- デプロイ後は、発行されたURLをスマートフォンのブラウザで開くだけで、PCなしでも代表として指示投入・承認・戦略会議の起動・雑談タイムの実行まですべて操作できる。

### 外部連携のAPIキー設定

`ANTHROPIC_API_KEY`を含む全てのAPIキーは、起動後に設定パネルの「外部連携」タブから登録できる（`packages/backend/.env`に保存され、`.gitignore`対象。再起動不要で次回呼び出しから反映される）。各ツールに必要な値:

| ツール | 必要な値 | 備考 |
| --- | --- | --- |
| Notion保存（ネムリ） | `NOTION_API_KEY` `NOTION_DATABASE_ID` | Integrationを対象データベースに共有しておく |
| Google Drive保存（ネムリ） | `GOOGLE_SERVICE_ACCOUNT_EMAIL` `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` `GOOGLE_DRIVE_FOLDER_ID` | 保存先フォルダをサービスアカウントのメールアドレスと共有しておく。**個人のGmailアカウントの通常フォルダでは`storageQuotaExceeded`エラーになり保存できない**（サービスアカウント自体のDrive容量は0GBのため）。共有ドライブ（Google Workspaceの機能）の`driveId`を使う実装への変更が必要 |
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
- 戦略経営会議の議事録・タスク案・最終提案を、外部ツール実行（Notion保存・Slack通知等）と連携させ、会議終了と同時にHuman-in-the-Loop申請を自動生成できるようにする。
- 会議室ビューでオフィス背景を「会議室モード」の専用背景に切り替える演出（現状は吹き出し演出のみ）。

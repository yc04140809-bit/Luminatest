/** 代表からの指示投入・承認操作・設定変更用のAPIクライアント。状態そのものは /ws/office 経由で反映される。 */
import type {
  AgentDraft,
  NoteAnalysisResult,
  NoteEditLevelId,
  NoteEditModeId,
  NoteEditResult,
  SnsAnalysisResult,
  SnsMetrics,
  ThemeUpdateInput,
} from "@chaos-ai-suite/shared";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function sendJson(method: "POST" | "PATCH" | "PUT", path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
}

async function sendDelete(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** 全体指示。targetAgentIdを指定すると、その社員への個別メンション指示になる。 */
export function postDirective(directive: string, targetAgentId?: string): Promise<void> {
  return sendJson("POST", "/api/directives", targetAgentId ? { directive, targetAgentId } : { directive });
}

export function approveTask(taskId: string, comment?: string): Promise<void> {
  return sendJson("POST", `/api/tasks/${taskId}/approve`, { comment });
}

export function rejectTask(taskId: string, comment?: string): Promise<void> {
  return sendJson("POST", `/api/tasks/${taskId}/reject`, { comment });
}

/** 管理画面からのプリセット切り替え・カラー上書き。 */
export function updateTheme(patch: ThemeUpdateInput): Promise<void> {
  return sendJson("PATCH", "/api/theme", patch);
}

export function updateAgent(agentId: string, patch: Partial<AgentDraft>): Promise<void> {
  return sendJson("PATCH", `/api/agents/${agentId}`, patch);
}

export function createAgent(draft: AgentDraft): Promise<void> {
  return sendJson("POST", "/api/agents", draft);
}

export function deleteAgent(agentId: string): Promise<void> {
  return sendDelete(`/api/agents/${agentId}`);
}

/** 外部連携用APIキーの設定状態（値そのものは含まれない）。 */
export interface SecretStatus {
  key: string;
  label: string;
  group: string;
  configured: boolean;
  /** キーを設定しても既知の理由で機能が使えない場合の注記。 */
  knownLimitation?: string;
}

export function getSecretsStatus(): Promise<SecretStatus[]> {
  return getJson<SecretStatus[]>("/api/secrets");
}

export function setSecret(key: string, value: string): Promise<void> {
  return sendJson("PUT", `/api/secrets/${key}`, { value });
}

export function clearSecret(key: string): Promise<void> {
  return sendDelete(`/api/secrets/${key}`);
}

/** 戦略経営会議を開始する。既に会議が進行中の場合はエラーになる。 */
export function startMeeting(topic: string): Promise<void> {
  return sendJson("POST", "/api/meetings", { topic });
}

/** 朝会ブリーフィングを実行する。本日実施済みの場合はエラーになる。 */
export function postBriefing(): Promise<void> {
  return sendJson("POST", "/api/briefing", {});
}

/** オフィス雑談タイムを開始する。既に進行中の場合はエラーになる。 */
export function postBanter(): Promise<void> {
  return sendJson("POST", "/api/banter", {});
}

/** SNS投稿をミライ（SNS分析AI）に分析させる。LLM呼び出しのため完了まで10〜30秒程度かかる。 */
export function analyzeSnsPost(input: {
  content: string;
  platform: string;
  metrics: SnsMetrics;
}): Promise<SnsAnalysisResult> {
  return postJson<SnsAnalysisResult>("/api/sns/analyze", input);
}

/** 記事をネムリ（note編集AI）に編集させる。長文記事では30〜60秒程度かかる。 */
export function editNoteArticle(input: {
  content: string;
  mode: NoteEditModeId;
  level: NoteEditLevelId;
}): Promise<NoteEditResult> {
  return postJson<NoteEditResult>("/api/note/edit", input);
}

/** 選択した部分だけを指示に従って書き直す（選択範囲のみ送信・小さい呼び出し）。 */
export function editNoteSection(input: { section: string; instruction: string }): Promise<{ revisedText: string }> {
  return postJson<{ revisedText: string }>("/api/note/edit-section", input);
}

/** 編集済み記事の読みやすさ診断・離脱ポイント・タイトル案・CTA案を取得する。 */
export function analyzeNoteArticle(input: { content: string }): Promise<NoteAnalysisResult> {
  return postJson<NoteAnalysisResult>("/api/note/analyze", input);
}
